/**
 * Compose <-> application contract for the shared WireGuard directories.
 *
 * Root cause of the 2026-11 outage: production ran with the BASE compose file
 * (mounts = uploads, logs, host-arp only), so /host-wireguard-peers never
 * existed in the container, utils/wireguard.js fell back to a container-private
 * directory, and the host watcher (scripts/hotbando-wg-apply) never saw a peer
 * descriptor or the .apply trigger.
 *
 * These tests pin the mount paths on BOTH compose files to the paths the code
 * and the host watcher actually use, so the two sides cannot drift again.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const baseCompose = read('docker-compose.yml');
const prodCompose = read('docker-compose.prod.yml');
const wireguardSource = read(path.join('utils', 'wireguard.js'));
const watcher = read(path.join('scripts', 'hotbando-wg-apply'));

const PEER_MOUNT = '/etc/wireguard/hotbando-peers:/host-wireguard-peers';
const STATUS_MOUNT = '/etc/wireguard/.wg-status-result:/var/run/hotbando/wg-status-result';

describe.each([
    ['docker-compose.yml', () => baseCompose],
    ['docker-compose.prod.yml', () => prodCompose]
])('%s WireGuard mounts', (file, load) => {
    const text = load();

    test('binds the host peer-descriptor directory at /host-wireguard-peers (rw)', () => {
        expect(text).toContain(`${PEER_MOUNT}:rw`);
    });

    test('binds the host status file at /var/run/hotbando/wg-status-result (ro)', () => {
        expect(text).toContain(`${STATUS_MOUNT}:ro`);
    });

    test('never mounts host WireGuard keys or wg0.conf into the container', () => {
        expect(text).not.toMatch(/\/etc\/wireguard:\/host-wireguard(?![\w-])/);
        expect(text).not.toMatch(/wg0\.conf/);
        expect(text).not.toMatch(/hotbando-keys/);
    });
});

describe('app/host path contract', () => {
    test('utils/wireguard.js resolves the peers dir from /host-wireguard-peers', () => {
        expect(wireguardSource).toContain("'/host-wireguard-peers'");
        expect(wireguardSource).toContain("'/var/run/hotbando/wg-status-result'");
    });

    test('host watcher reads the same directory the compose file binds', () => {
        expect(watcher).toContain('PEERS_DIR="${PREFIX}/etc/wireguard/hotbando-peers"');
        expect(watcher).toContain('PREFIX="${HB_WG_PREFIX:-}"');
        expect(PEER_MOUNT.startsWith('/etc/wireguard/hotbando-peers')).toBe(true);
    });

    test('watcher writes the status file the app binds', () => {
        expect(watcher).toContain('STATUS="${PREFIX}/etc/wireguard/.wg-status-result"');
    });

    test('watcher installs as a systemd service, a path trigger and a timer fallback', () => {
        for (const unit of [
            'scripts/systemd/hotbando-wg-apply.service',
            'scripts/systemd/hotbando-wg-apply.path',
            'scripts/systemd/hotbando-wg-apply.timer'
        ]) {
            expect(fs.existsSync(path.join(root, unit))).toBe(true);
        }
        const service = read(path.join('scripts', 'systemd', 'hotbando-wg-apply.service'));
        const pathUnit = read(path.join('scripts', 'systemd', 'hotbando-wg-apply.path'));
        expect(service).toContain('ExecStart=/usr/local/bin/hotbando-wg-apply');
        expect(pathUnit).toContain('PathChanged=/etc/wireguard/hotbando-peers');
        const active = pathUnit.split(/\r?\n/).filter((line) => !line.trim().startsWith('#')).join('\n');
        expect(active).not.toContain('DirectoryNotEmpty=');
        expect(active).not.toContain('PathExists=');
    });

    test('installer refuses to run when the status bind source became a directory', () => {
        const installer = read(path.join('scripts', 'install-wg-watcher.sh'));
        expect(installer).toContain('if [ -d "$STATUS_FILE" ]');
        expect(installer).toContain('systemctl enable --now hotbando-wg-apply.path hotbando-wg-apply.timer');
    });
});
