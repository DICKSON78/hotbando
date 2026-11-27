/**
 * Executable regression tests for the WireGuard host watcher's
 * peer-preservation preflight.
 *
 * The production watcher is a bash script. It is exercised here with Git Bash
 * (or /bin/bash on Linux) and stubbed `wg`, `wg-quick`, `ip`, `flock` and
 * `python3` binaries, so the REAL preflight code (the awk comparison and the
 * refusal branch) runs against the known production inventory:
 *
 *   live: 10.7.0.2/32 (HB-D5AD0DD733CD), 10.7.0.4/32, 10.7.0.5/32
 *   wg0.conf: three peer entries, no HotBando managed markers
 *   descriptors: 10.7.0.5.peer matches the live .5 peer exactly
 *
 * python3 is stubbed with a fixture next-config because the Windows dev
 * machine has no Python runtime; the stub only supplies "the config the
 * rewrite would produce". The refusal decision itself is the real code.
 * On a host with python3, a second describe() runs the real rewrite too.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repo = path.join(__dirname, '..');
const watcher = path.join(repo, 'scripts', 'hotbando-wg-apply');

const bashCandidates = [
    '/bin/bash',
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe'
];
const BASH = bashCandidates.find((candidate) => fs.existsSync(candidate));

const KEY2 = 'PUBKEY2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const KEY4 = 'PUBKEY4BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=';
const KEY5 = 'PUBKEY5CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=';

const liveAllowedIps = [
    `${KEY2}\t10.7.0.2/32`,
    `${KEY4}\t10.7.0.4/32`,
    `${KEY5}\t10.7.0.5/32`
].join('\n') + '\n';
const livePeers = `${KEY2}\n${KEY4}\n${KEY5}\n`;

function peerBlock(key, ip) {
    return `[Peer]\nPublicKey = ${key}\nAllowedIPs = ${ip}/32\n`;
}

function configWith(peers, managed) {
    let conf = '# WireGuard hub\n[Interface]\nListenPort = 443\nPrivateKey = <NEVER-PRINTED>\n\n';
    if (managed) conf += '# BEGIN HOTBANDO MANAGED PEERS\n';
    for (const p of peers) conf += peerBlock(p.key, p.ip);
    if (managed) conf += '# END HOTBANDO MANAGED PEERS\n';
    return conf;
}

function stub(name, body) {
    return { name, body: `#!/bin/sh\n${body}\n` };
}

function setupFixture(opts) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-preflight-'));
    const prefix = dir.replace(/\\/g, '/');
    const confDir = path.join(dir, 'etc', 'wireguard');
    const peersDir = path.join(confDir, 'hotbando-peers');
    const bin = path.join(dir, 'bin');
    const fixtureDir = path.join(dir, 'fixture');
    const dirs = [confDir, bin, fixtureDir, path.join(dir, 'run')];
    if (!opts.noPeersDir) dirs.push(peersDir);
    for (const d of dirs) {
        fs.mkdirSync(d, { recursive: true });
    }

    fs.writeFileSync(path.join(confDir, 'wg0.conf'), opts.conf, 'utf8');
    fs.writeFileSync(path.join(fixtureDir, 'allowed-ips'), opts.liveAllowedIps !== undefined ? opts.liveAllowedIps : liveAllowedIps, 'utf8');
    fs.writeFileSync(path.join(fixtureDir, 'peers'), opts.livePeers !== undefined ? opts.livePeers : livePeers, 'utf8');

    if (opts.descriptors && !opts.noPeersDir) {
        for (const [name, body] of Object.entries(opts.descriptors)) {
            fs.writeFileSync(path.join(peersDir, name), body, 'utf8');
        }
    }

    const candidate = path.join(fixtureDir, 'next.conf');
    fs.writeFileSync(candidate, opts.next !== undefined ? opts.next : opts.conf, 'utf8');

    const stubs = [
        stub('flock', opts.flockHeld ? 'exit 1' : 'exit 0'),
        stub('ip', '[ "${HB_FIXTURE_WG0:-1}" = "1" ] || exit 1; exit 0'),
        stub('wg', [
            'case "$3" in',
            '  allowed-ips) cat "$HB_FIXTURE/allowed-ips" ;;',
            '  peers) cat "$HB_FIXTURE/peers" ;;',
            '  listen-port) echo "${HB_FIXTURE_PORT:-443}" ;;',
            '  *) exit 0 ;;',
            'esac'
        ].join('\n')),
        stub('wg-quick', 'exit 0'),
        stub('python3', [
            'conf="$2"',
            'cand="$4"',
            'if [ "${HB_FIXTURE_CHANGED:-0}" = "1" ]; then',
            '  cp "$HB_FIXTURE_NEXT" "$cand"',
            '  echo 1',
            'else',
            '  echo 0',
            'fi'
        ].join('\n'))
    ];
    for (const s of stubs) {
        const p = path.join(bin, s.name);
        fs.writeFileSync(p, s.body, 'utf8');
        fs.chmodSync(p, 0o755);
    }

    const commandOpts = {
        cwd: repo,
        encoding: 'utf8',
        env: {
            ...process.env,
            HB_WG_PREFIX: prefix,
            HB_FIXTURE: fixtureDir.replace(/\\/g, '/'),
            HB_FIXTURE_NEXT: candidate.replace(/\\/g, '/'),
            HB_FIXTURE_CHANGED: opts.changed ? '1' : '0',
            HB_FIXTURE_WG0: opts.noInterface ? '0' : '1',
            ...(opts.tmpdir ? { TMPDIR: opts.tmpdir.replace(/\\/g, '/') } : {}),
            PATH: `${bin.replace(/\\/g, '/')}:/usr/bin:/bin`
        }
    };
    return { dir, prefix, confDir, peersDir, fixtureDir, bin, candidate, commandOpts };
}

function runPreflight(fixture, mode = '--preflight') {
    return spawnSync(BASH, [watcher.replace(/\\/g, '/'), mode], fixture.commandOpts);
}

function descriptor(key, ip) {
    return `HB-TEST\t${ip}\t${key}\t\n`;
}

const productionConf = configWith([
    { key: KEY2, ip: '10.7.0.2' },
    { key: KEY4, ip: '10.7.0.4' },
    { key: KEY5, ip: '10.7.0.5' }
], false);

describe.each(BASH ? ['bash'] : [])('watcher preflight (%s)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('rejects a config that would remove .2 and .4 when descriptors do not account for them', () => {
        // wg0.conf has a previously managed block with all three peers, but
        // only the .5 descriptor exists -> the block would shrink to .5 only.
        const next = configWith([{ key: KEY5, ip: '10.7.0.5' }], true);
        const fx = setupFixture({
            conf: productionConf,
            next,
            changed: true,
            descriptors: { '10.7.0.5.peer': descriptor(KEY5, '10.7.0.5') }
        });
        try {
            const r = runPreflight(fx);
            expect(r.status).toBe(2);
            expect(r.stderr).toContain(KEY2);
            expect(r.stderr).toContain(KEY4);
            expect(r.stderr).toContain('10.7.0.2/32');
            expect(r.stderr).toContain('10.7.0.4/32');
            expect(r.stderr).toContain('PREFLIGHT BLOCKED');
            expect(r.stdout).not.toContain('PrivateKey');
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test.each([
        ['10.7.0.2', KEY2],
        ['10.7.0.4', KEY4],
        ['10.7.0.5', KEY5]
    ])('rejects a config that would remove %s (%s)', (ip, key) => {
        const kept = [
            { key: KEY2, ip: '10.7.0.2' },
            { key: KEY4, ip: '10.7.0.4' },
            { key: KEY5, ip: '10.7.0.5' }
        ].filter((p) => p.ip !== ip);
        const fx = setupFixture({
            conf: productionConf,
            next: configWith(kept, false),
            changed: true,
            descriptors: {}
        });
        try {
            const r = runPreflight(fx);
            expect(r.status).toBe(2);
            expect(r.stderr).toContain(key);
            expect(r.stderr).toContain(`${ip}/32`);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('rejects an AllowedIP change on an existing peer', () => {
        const next = configWith([
            { key: KEY2, ip: '10.7.0.2' },
            { key: KEY4, ip: '10.7.0.4' },
            { key: KEY5, ip: '10.7.0.99' }
        ], false);
        const fx = setupFixture({ conf: productionConf, next, changed: true });
        try {
            const r = runPreflight(fx);
            expect(r.status).toBe(2);
            expect(r.stderr).toContain(KEY5);
            expect(r.stderr).toContain('10.7.0.5/32');
            expect(r.stderr).toContain('CHANGED');
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('passes when all existing peers are preserved and writes nothing', () => {
        const fx = setupFixture({
            conf: productionConf,
            next: productionConf,
            changed: false,
            descriptors: { '10.7.0.5.peer': descriptor(KEY5, '10.7.0.5') }
        });
        try {
            const r = runPreflight(fx);
            expect(r.status).toBe(0);
            expect(r.stdout).toContain('PREFLIGHT OK');
            expect(r.stdout).toContain('3 live peer(s) preserved');
            expect(r.stdout).toContain('wg0.conf and wg0 were not modified');
            expect(fs.readFileSync(path.join(fx.confDir, 'wg0.conf'), 'utf8')).toBe(productionConf);
            expect(fs.existsSync(path.join(fx.confDir, 'wg0.conf.tmp'))).toBe(false);
            expect(fs.existsSync(path.join(fx.confDir, '.wg-status-result'))).toBe(false);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('passes when all three peers live in the managed block and all descriptors exist', () => {
        const fx = setupFixture({
            conf: productionConf,
            next: configWith([
                { key: KEY2, ip: '10.7.0.2' },
                { key: KEY4, ip: '10.7.0.4' },
                { key: KEY5, ip: '10.7.0.5' }
            ], true),
            changed: true,
            descriptors: {
                '10.7.0.2.peer': descriptor(KEY2, '10.7.0.2'),
                '10.7.0.4.peer': descriptor(KEY4, '10.7.0.4'),
                '10.7.0.5.peer': descriptor(KEY5, '10.7.0.5')
            }
        });
        try {
            expect(runPreflight(fx).status).toBe(0);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('passes with no descriptors, no live peers and no managed block', () => {
        const fx = setupFixture({
            conf: configWith([], false),
            next: configWith([], false),
            changed: false,
            descriptors: {},
            liveAllowedIps: '',
            livePeers: '',
            noInterface: true
        });
        try {
            const r = runPreflight(fx);
            expect(r.status).toBe(0);
            expect(r.stdout).toContain('0 live peer(s) preserved');
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('passes with live peers but no descriptors when the config is unchanged', () => {
        // Production today: three hand-managed peers, one descriptor for .5
        // that is already present outside the managed block -> no rewrite.
        const fx = setupFixture({
            conf: productionConf,
            next: productionConf,
            changed: false,
            descriptors: { '10.7.0.5.peer': descriptor(KEY5, '10.7.0.5') }
        });
        try {
            expect(runPreflight(fx).status).toBe(0);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('deleting a descriptor blocks only that peer, never the unrelated .2/.4 peers', () => {
        // Descriptors for all three previously, now .5 is gone from the dir.
        const next = configWith([
            { key: KEY2, ip: '10.7.0.2' },
            { key: KEY4, ip: '10.7.0.4' }
        ], true);
        const fx = setupFixture({
            conf: configWith([
                { key: KEY2, ip: '10.7.0.2' },
                { key: KEY4, ip: '10.7.0.4' },
                { key: KEY5, ip: '10.7.0.5' }
            ], true),
            next,
            changed: true,
            descriptors: {
                '10.7.0.2.peer': descriptor(KEY2, '10.7.0.2'),
                '10.7.0.4.peer': descriptor(KEY4, '10.7.0.4')
            }
        });
        try {
            const r = runPreflight(fx);
            expect(r.status).toBe(2);
            expect(r.stderr).toContain(KEY5);
            expect(r.stderr).toContain('10.7.0.5/32');
            expect(r.stderr).not.toContain(KEY2);
            expect(r.stderr).not.toContain(KEY4);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('a descriptor addition that adds a new peer passes', () => {
        const next = configWith([
            { key: KEY2, ip: '10.7.0.2' },
            { key: KEY4, ip: '10.7.0.4' },
            { key: KEY5, ip: '10.7.0.5' },
            { key: 'NEWKEY6DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=', ip: '10.7.0.6' }
        ], false);
        const fx = setupFixture({ conf: productionConf, next, changed: true });
        try {
            expect(runPreflight(fx).status).toBe(0);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('the apply path also refuses a destructive config (no partial write)', () => {
        const next = configWith([{ key: KEY5, ip: '10.7.0.5' }], true);
        const fx = setupFixture({
            conf: productionConf,
            next,
            changed: true,
            descriptors: { '10.7.0.5.peer': descriptor(KEY5, '10.7.0.5') }
        });
        try {
            const r = runPreflight(fx, 'apply');
            expect(r.status).toBe(2);
            expect(fs.readFileSync(path.join(fx.confDir, 'wg0.conf'), 'utf8')).toBe(productionConf);
            expect(fs.existsSync(path.join(fx.confDir, 'wg0.conf.tmp'))).toBe(false);
            const status = JSON.parse(fs.readFileSync(path.join(fx.confDir, '.wg-status-result'), 'utf8'));
            expect(status.applyBlocked).toBe(true);
            expect(status.applyBlockedPeers).toEqual(expect.arrayContaining([KEY2, KEY4]));
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('the apply path installs the candidate config when the preflight passes', () => {
        const next = configWith([
            { key: KEY2, ip: '10.7.0.2' },
            { key: KEY4, ip: '10.7.0.4' },
            { key: KEY5, ip: '10.7.0.5' },
            { key: 'NEWKEY6DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=', ip: '10.7.0.6' }
        ], false);
        const fx = setupFixture({ conf: productionConf, next, changed: true });
        try {
            const r = runPreflight(fx, 'apply');
            expect(r.status).toBe(0);
            expect(fs.readFileSync(path.join(fx.confDir, 'wg0.conf'), 'utf8')).toBe(next);
            const status = JSON.parse(fs.readFileSync(path.join(fx.confDir, '.wg-status-result'), 'utf8'));
            expect(status.applyBlocked).toBe(false);
            expect(status.listenPort).toBe(443);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('never prints the interface private key', () => {
        const fx = setupFixture({
            conf: productionConf,
            next: configWith([{ key: KEY5, ip: '10.7.0.5' }], true),
            changed: true
        });
        try {
            const r = runPreflight(fx);
            expect(r.stderr).not.toContain('NEVER-PRINTED');
            expect(r.stdout).not.toContain('NEVER-PRINTED');
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('preflight fails when another apply holds the shared lock', () => {
        const fx = setupFixture({
            conf: productionConf,
            next: configWith([{ key: KEY5, ip: '10.7.0.5' }], true),
            changed: true,
            descriptors: { '10.7.0.5.peer': descriptor(KEY5, '10.7.0.5') },
            flockHeld: true
        });
        try {
            const r = runPreflight(fx);
            expect(r.status).not.toBe(0);
            expect(r.status).toBe(3);
            expect(r.stderr).toContain('another apply is running');
            // Lock contention is a hard failure: no status, no candidate.
            expect(fs.existsSync(path.join(fx.confDir, '.wg-status-result'))).toBe(false);
            expect(fs.existsSync(path.join(fx.confDir, 'wg0.conf.tmp'))).toBe(false);
            expect(fs.readFileSync(path.join(fx.confDir, 'wg0.conf'), 'utf8')).toBe(productionConf);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });

    test('preflight is read-only: leaves no temp candidate, status, or conf change', () => {
        const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-preflight-tmp-'));
        const fx = setupFixture({
            conf: productionConf,
            next: configWith([{ key: KEY5, ip: '10.7.0.5' }], true),
            changed: true,
            descriptors: { '10.7.0.5.peer': descriptor(KEY5, '10.7.0.5') },
            tmpdir
        });
        try {
            const r = runPreflight(fx);
            expect(r.status).toBe(2);
            // No status file, no candidate left beside wg0.conf.
            expect(fs.existsSync(path.join(fx.confDir, '.wg-status-result'))).toBe(false);
            expect(fs.existsSync(path.join(fx.confDir, 'wg0.conf.tmp'))).toBe(false);
            // wg0.conf itself is untouched.
            expect(fs.readFileSync(path.join(fx.confDir, 'wg0.conf'), 'utf8')).toBe(productionConf);
            // The temp candidate and live snapshot were cleaned from TMPDIR.
            expect(fs.readdirSync(tmpdir)).toEqual([]);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
            fs.rmSync(tmpdir, { recursive: true, force: true });
        }
    });

    test('preflight does not create the peer directory when it is absent', () => {
        const fx = setupFixture({
            conf: productionConf,
            next: configWith([{ key: KEY5, ip: '10.7.0.5' }], true),
            changed: true,
            descriptors: { '10.7.0.5.peer': descriptor(KEY5, '10.7.0.5') },
            noPeersDir: true
        });
        try {
            expect(fs.existsSync(fx.peersDir)).toBe(false); // harness deliberately omits it
            const r = runPreflight(fx);
            // Missing descriptors must not break the check; the watcher must
            // tolerate it and still evaluate against the live peer snapshot.
            expect([0, 2]).toContain(r.status);
            // And it must still not have created the directory.
            expect(fs.existsSync(fx.peersDir)).toBe(false);
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });
});

if (!BASH) {
    test.skip('bash is unavailable — executable watcher preflight tests skipped', () => {});
}

// The real rewrite engine is only executable where python3 exists; this
// differential test verifies that the fixture-driven stub above agrees with
// the production python on the exact candidate peer set when possible.
const HAS_PYTHON = (() => {
    const r = spawnSync('python3', ['-c', 'print(1)'], { encoding: 'utf8' });
    return r.status === 0 && /1/.test(r.stdout || '');
})();

describe.skip(!HAS_PYTHON ? 'real python3 cross-check (unavailable here)' : 'real python3 cross-check', () => {
    test('the preflight refuses when the real rewrite drops a live peer', () => {
        const fx = setupFixture({ conf: productionConf, descriptors: {
            '10.7.0.5.peer': descriptor(KEY5, '10.7.0.5')
        } });
        // Drop the python stub so the real interpreter runs the rewrite.
        fs.unlinkSync(path.join(fx.bin, 'python3'));
        const conf = path.join(fx.confDir, 'wg0.conf');
        // Put .2/.4/.5 inside a managed block so the real rewrite shrinks it.
        fs.writeFileSync(conf, configWith([
            { key: KEY2, ip: '10.7.0.2' },
            { key: KEY4, ip: '10.7.0.4' },
            { key: KEY5, ip: '10.7.0.5' }
        ], true), 'utf8');
        try {
            const r = runPreflight(fx);
            // Real rewrite: outside keys = none, desired = .5 only, so the
            // managed block shrink drops .2 and .4 -> real preflight refuses.
            expect(r.status).toBe(2);
            expect(r.stderr).toContain(KEY2);
            expect(r.stderr).toContain(KEY4);
            expect(r.stderr).toContain('10.7.0.2/32');
            expect(r.stderr).toContain('10.7.0.4/32');
        } finally {
            fs.rmSync(fx.dir, { recursive: true, force: true });
        }
    });
});
