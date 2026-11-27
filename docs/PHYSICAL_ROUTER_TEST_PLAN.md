# HotBando — Physical MikroTik Router Test Plan (READ-ONLY PHASE)

**Scope.** This document is for the owner's *physical* router session. It contains
read-only inventory commands first, then a separately gated repair section.
No command in this document should be executed remotely by an automated agent.

**Golden rule:** nothing that changes configuration may be run until **after**
the backup has been captured and visually verified by the owner, and the
inventory output has been reviewed against the Expected Configuration section.

**Secret handling:** this document never contains real passwords, WireGuard
private keys or preshared keys. Router exports can contain secrets — store them
locally, never paste them into chat, tickets, or logs.

---

## 0. Symbols

- `[READ]` — read-only, safe to run at any time.
- `[WRITE]` — changes router configuration. ONLY after backup verification and
  explicit owner approval.
- `[SAVE]` — creates a backup/export file on the router. Non-destructive.

---

## 1. Preconditions

1. Physical or console access to the router (WinBox / SSH / serial console).
2. The owner has confirmed which router is being tested (site name + Router ID
   as shown in the admin portal).
3. A local folder on the technician's computer for the export files.
4. The admin portal's **Routers** page is open for cross-checking status.

---

## 2. `[SAVE]` Capture a full backup FIRST

Run in the RouterOS terminal, replacing the date placeholder:

```
/system backup save name=hotbando-pre-test-YYYYMMDD
/export file=hotbando-pre-test-YYYYMMDD.rsc
```

Verify the files exist before going further:

```
[READ] /file print where name~"hotbando-pre-test"
```

Expected: a `.backup` file and an `.rsc` export file, both non-zero size.
**The owner must confirm this output before any repair step.**

To copy them off the router (from a computer on the router's LAN):

```
scp admin@<router-lan-ip>:/hotbando-pre-test-YYYYMMDD.backup .
scp admin@<router-lan-ip>:/hotbando-pre-test-YYYYMMDD.rsc .
```

Or with WinBox: Files → drag both files to the computer.

If anything goes wrong later, restore with the pre-test backup (see §12).

---

## 3. `[READ]` Identity & health inventory

```
/system identity print
/system resource print
/system clock print
/system package print
/system reboot-history print
```

Record: identity, RouterOS version, model, uptime, CPU, memory, serial number.
Cross-check the identity/serial against the Router ID shown in the admin portal.

## 4. `[READ]` Interface inventory

```
/interface print
/interface ethernet print
/interface wireless print
/interface bridge print
/interface wireguard print
/interface wireguard peers print
/interface list print
/interface list member print
```

Record every interface name and type. **Do not remove or rename anything.**
The bootstrap/repair must preserve unrelated interfaces (LAN, WAN, WiFi,
bridges not owned by HotBando).

## 5. `[READ]` IP address, route & DHCP inventory

```
/ip address print
/ip route print
/ip dns print
/ip dhcp-server print
/ip dhcp-server network print
/ip dhcp-client print
/ip pool print
```

Record: WAN address method (DHCP or static), LAN/hotspot gateway, DNS servers,
existing pools. This determines which interface is WAN and which is client-facing.

## 6. `[READ]` WireGuard inventory

```
/interface wireguard print detail
/interface wireguard peers print detail
```

Record: existing WireGuard interface name(s), its listening port, its
**public** key (safe to record), and the peer list with allowed addresses and
endpoint. **Never record or paste private keys or preshared keys.**
Compare allowed addresses with the address allocated to this router in the
admin portal. Do not remove existing peers during a repair.

## 7. `[READ]` Firewall & NAT inventory

```
/ip firewall filter print
/ip firewall nat print
/ip firewall address-list print
/ip firewall service-port print
```

Record rules related to: WireGuard UDP port, hotspot redirect (dst-nat to the
portal), established/related accept rules, and any custom owner rules. Custom
rules must be preserved.

## 8. `[READ]` RADIUS inventory

```
/radius print detail
/radius incoming print
/user aaa print
/ip hotspot profile print detail
```

Record: configured RADIUS server address, service, auth/acct ports, and whether
the hotspot profile uses RADIUS. Confirm the secret matches the server config
**without printing it** — compare by testing authentication, not by display.

## 9. `[READ]` Hotspot inventory

```
/ip hotspot print detail
/ip hotspot profile print detail
/ip hotspot user print
/ip hotspot active print
/ip hotspot ip-binding print
/ip hotspot walled-garden print
```

Record: hotspot interface, profile, address pool, login.html behavior, and
active sessions. Cross-check active users against the admin portal's
"Watumiaji wa Sasa" list.

## 10. `[READ]` Schedulers / scripts / phone-home inventory

```
/system scheduler print detail
/system script print detail
/system script environment print
```

Record every scheduler and script. Identify which ones are HotBando-owned
(heartbeat, provisioning poll, repair/reboot watchdog) and which belong to the
owner. HotBando repair must not delete unrelated schedulers or scripts.

---

## 11. Expected repaired configuration

Source of truth: `generateProvisionScript()` in `utils/routerProvision.js:560-804`,
which is the script the server serves at `GET /api/zero-touch/provision/<routerID>`.
Values in `<...>` come from the admin portal / `.env`; **never paste private or
preshared keys into a report or terminal capture.**

| Area | Expected end state |
|---|---|
| Identity | `/system identity` name = router name shown in the portal |
| Bridge | `bridge-hotbando` exists, every wireless radio is a bridge port |
| WireGuard | `wg-hotbando` exists; one peer with `endpoint-address=<public host>`, `endpoint-port=<WG_PORT>`, `allowed-address=<server WG IP>/32`, `persistent-keepalive=25s` |
| Tunnel address | `<assigned WG IP>/32` on `wg-hotbando`; route to `<server WG IP>/32` via `wg-hotbando` |
| Hotspot IP | `<HOTSPOT_IP>/24` on `bridge-hotbando` (default `10.5.50.1/24`) |
| DHCP | pool `hotbando-pool` (`.100-.200`), server `hotbando-dhcp`, network gateway/DNS = router |
| DNS | `allow-remote-requests=yes`; captive-portal probe hosts statically mapped to the hotspot IP |
| NAT | srcnat masquerade for hotspot subnet; dstnat DNS redirect on hotspot interface; **no** old `HotBando http`/`HotBando https` redirects |
| Profile | `hotbando-profile` with `use-radius=yes`, `radius-accounting=yes`, MAC auth enabled |
| Hotspot server | `hotbando-server` on `bridge-hotbando`, profile `hotbando-profile`, enabled |
| RADIUS | one entry with comment containing `HotBando`, `service=hotspot`, address = server WG IP, ports 1812/1813, `src-address=<assigned WG IP>` |
| Schedulers | `hotbando-watchdog`, `hotbando-heartbeat` present; `hotbando-poll` absent after full provisioning |
| Portal page | `hotspot/login.html` redirects to `<PUBLIC_BASE_URL>/hotspot?router_id=<id>&mac=…&ip=…` |

**Important:** the generated script is idempotent for HotBando-owned objects,
but it DOES remove global objects (`/ip hotspot remove [find]` removes *all*
hotspot servers, `/radius remove [find service=hotspot]` removes *all* hotspot
RADIUS clients, and it removes DHCP/addresses on the hotspot interface).
The owner must confirm in §7–§9 that no unrelated configuration depends on
those objects before allowing the repair.

## 12. Exact proposed commands + expected output

### Preferred repair path (owner-controlled)

1. In the admin portal, confirm the router is **CONFIGURING** (owner clicked Connect).
2. On the router, fetch and import the server-generated script **without
   printing its contents** (it contains the router's WireGuard private key):

```
[WRITE — do not pipe to terminal output]
/tool fetch url="https://<SERVER>/api/zero-touch/provision/<ROUTER_ID>?secret=<REGISTRATION_SECRET>" dst-path="hotbando-provision.rsc" mode=https check-certificate=no
[READ] /file print where name="hotbando-provision.rsc"
[WRITE] /import file-name="hotbando-provision.rsc"
```

Expected after `/tool fetch`: a file with non-zero size. Expected after import:
no `failure` lines; some `:do {}` blocks may silently skip unsupported commands
(e.g. `mac-auth-mode` on old RouterOS) — that is acceptable.

### Verification after each step (all `[READ]`)

```
/interface wireguard print detail
    → wg-hotbando with one peer, endpoint and allowed-address as in §11
/ip address print where interface="wg-hotbando"
    → <assigned WG IP>/32
/ip route print where gateway="wg-hotbando"
    → route to <server WG IP>/32
/radius print detail
    → one HotBando hotspot entry, ports 1812/1813
/ip hotspot print detail
    → hotbando-server enabled on bridge-hotbando
/ip firewall nat print
    → masquerade + DNS redirect present; no old HTTP/HTTPS dst-nat
/system scheduler print
    → watchdog + heartbeat; no poll after full provisioning
/ping address=<server WG IP> count=3
    → 3/3 packets received (proves the tunnel)
```

Then check the portal: the router card should become **ONLINE** after the next
heartbeat (≤2 min). If it stays OFFLINE, capture

```
[READ] /log print follow-only where topics~"hotbando|wireguard|radius|hotspot"
[READ] /tool ping
```

…and report the output to the developer. Do **not** re-import repeatedly.

### Manual fallback commands (only if the generated script cannot be used)

These are the equivalent `[WRITE]` commands; each one must be approved and
verified individually. Never delete peers or interfaces that are not named
`wg-hotbando` / not commented `HotBando`.

```
[WRITE] /interface wireguard add name=wg-hotbando listen-port=13231 private-key=<ROUTER_PRIVATE_KEY>
[WRITE] /interface wireguard peers add interface=wg-hotbando public-key=<SERVER_PUBLIC_KEY> endpoint-address=<SERVER> endpoint-port=<WG_PORT> allowed-address=<SERVER_WG_IP>/32 persistent-keepalive=25s
[WRITE] /ip address add address=<ASSIGNED_WG_IP>/32 interface=wg-hotbando
[WRITE] /ip route add dst-address=<SERVER_WG_IP>/32 gateway=wg-hotbando
[WRITE] /radius add address=<SERVER_WG_IP> secret=<RADIUS_SECRET> service=hotspot authentication-port=1812 accounting-port=1813 src-address=<ASSIGNED_WG_IP> comment="HotBando FreeRADIUS"
```

Expected output of each `[WRITE]`: RouterOS returns no output on success; a
`failure:` line means the object already exists — stop and inspect with the
matching `[READ]` command instead of forcing it.

## 13. Rollback instructions

Generic rollback (only after a failed repair):

```
[WRITE — use the saved backup, this RESTORES the pre-test state]
/system backup load name=hotbando-pre-test-YYYYMMDD
```

The router will reboot. After reboot:

```
[READ] /system identity print
[READ] /interface wireguard peers print detail
[READ] /ip hotspot active print
```

If the `.backup` restore is unavailable, re-import the saved text export
(partial restore — some settings may not be included):

```
[WRITE] /import file-name=hotbando-pre-test-YYYYMMDD.rsc
```

---

## 14. Sign-off checklist (owner fills in)

- [ ] Backup saved and file verified (§2)
- [ ] Inventory captured (§3–§10)
- [ ] Router ID / serial in portal matches router identity
- [ ] WireGuard peer allowed-address matches portal allocation
- [ ] Expected configuration section reviewed (§11)
- [ ] Repair commands approved one-by-one (§12)
- [ ] Verification commands run after each change (§12)
- [ ] Rollback path understood (§13)
- [ ] Portal status checked after test (online / offline as expected)
