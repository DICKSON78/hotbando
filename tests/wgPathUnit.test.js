/**
 * Regression tests for the systemd watcher activation fix.
 *
 * The old path unit used DirectoryNotEmpty= + MakeDirectory= on the
 * descriptor directory. systemd.path(5) documents that DirectoryNotEmpty=
 * activates the service immediately at activation time if the directory is
 * already non-empty, and that monitored paths are checked again as soon as a
 * triggered service terminates. With a non-empty descriptor directory this
 * chained into an activate -> run -> activate loop until TriggerLimitBurst
 * tripped and the path unit stopped watching entirely.
 *
 * These tests pin the unit to event-based triggers only, and verify the
 * installer gates ALL activation on the peer-preservation preflight.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const unit = read(path.join('scripts', 'systemd', 'hotbando-wg-apply.path'));
const activeUnit = unit.split(/\r?\n/).filter((line) => !line.trim().startsWith('#')).join('\n');
const service = read(path.join('scripts', 'systemd', 'hotbando-wg-apply.service'));
const timer = read(path.join('scripts', 'systemd', 'hotbando-wg-apply.timer'));
const watcher = read(path.join('scripts', 'hotbando-wg-apply'));
const installer = read(path.join('scripts', 'install-wg-watcher.sh'));

const ACTIVATION_ON_START = [
    'DirectoryNotEmpty=',
    'PathExists=',
    'PathExistsGlob='
];

describe('hotbando-wg-apply.path — event-based activation only', () => {
    test.each(ACTIVATION_ON_START)('never uses %s (state condition that re-activates on service exit)', (directive) => {
        expect(activeUnit).not.toContain(directive);
    });

    test('watches the descriptor directory for additions and removals', () => {
        expect(unit).toContain('PathChanged=/etc/wireguard/hotbando-peers');
    });

    test('watches the .apply marker for descriptor-change signals', () => {
        expect(unit).toContain('PathChanged=/etc/wireguard/hotbando-peers/.apply');
        expect(unit).toContain('PathModified=/etc/wireguard/hotbando-peers/.apply');
    });

    test('MakeDirectory may create the watched dir but does not activate on state', () => {
        expect(unit).toContain('MakeDirectory=yes');
        expect(unit).toContain('DirectoryMode=0700');
    });

    test('still targets the same oneshot service and is installable', () => {
        expect(unit).toContain('Before=hotbando-wg-apply.service');
        expect(unit).toContain('[Install]');
        expect(unit).toContain('WantedBy=multi-user.target');
    });
});

describe('service and timer behaviour preserved', () => {
    test('service remains a oneshot with the same ExecStart and no restart loop', () => {
        expect(service).toContain('Type=oneshot');
        expect(service).toContain('ExecStart=/usr/local/bin/hotbando-wg-apply');
        expect(service).not.toMatch(/^Restart=/m);
    });

    test('60s timer fallback is unchanged', () => {
        expect(timer).toContain('OnBootSec=30s');
        expect(timer).toContain('OnUnitActiveSec=60s');
        expect(timer).toContain('WantedBy=timers.target');
    });

    test('watcher does not emit IN_ATTRIB on the watched directory every run', () => {
        // chmod(2) on the directory generates an inotify IN_ATTRIB event.
        // It must only run when the mode is actually wrong, otherwise the
        // directory watch would re-trigger the service forever.
        expect(watcher).toMatch(/if \[ "\$\(stat -c '%a' "\$PEERS_DIR" 2>\/dev\/null\)" != '700' \]; then/);
        expect(watcher).not.toMatch(/^chmod 700 "\$PEERS_DIR"/m);
    });
});

describe('installer gates activation on the preflight', () => {
    test('calls --preflight before enabling the path and timer units', () => {
        const preflightAt = installer.indexOf('"$WATCHER_DST" --preflight');
        const enableAt = installer.indexOf('systemctl enable --now hotbando-wg-apply.path hotbando-wg-apply.timer');
        expect(preflightAt).toBeGreaterThan(-1);
        expect(enableAt).toBeGreaterThan(-1);
        expect(preflightAt).toBeLessThan(enableAt);
    });

    test('aborts the installer on a blocked preflight without enabling units', () => {
        const blocked = installer.indexOf('if ! "$WATCHER_DST" --preflight; then');
        const exitAt = installer.indexOf('exit 1', blocked);
        const enableAt = installer.indexOf('systemctl enable --now hotbando-wg-apply.path hotbando-wg-apply.timer');
        expect(blocked).toBeGreaterThan(-1);
        expect(exitAt).toBeGreaterThan(blocked);
        expect(exitAt).toBeLessThan(enableAt);
    });

    test('keeps the status-bind safety guard', () => {
        expect(installer).toContain('if [ -d "$STATUS_FILE" ]');
    });
});
