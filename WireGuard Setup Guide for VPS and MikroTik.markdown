# WireGuard VPN Setup Guide: VPS (Server) and MikroTik (Client)

This document provides a step-by-step guide to set up a WireGuard VPN between a VPS (server) and a MikroTik router (client). The process involves generating the client configuration on the server, configuring the MikroTik, setting up routing, and allowing traffic through the firewall.

---

## Prerequisites

- A VPS running a Linux distribution (e.g., Ubuntu or Debian) with root access.
- A MikroTik router running RouterOS 7.0 or higher (WireGuard support was introduced in RouterOS 7).
- Basic knowledge of Linux and MikroTik command-line interfaces.

---

## Step 1: Generate Client Configuration on the VPS (Server)

Use the `Nyr/wireguard-install` script to set up WireGuard on the VPS and generate the client configuration.

### 1.1 Download and Run the WireGuard Installation Script
Download the script from GitHub and make it executable:

```bash
wget https://raw.githubusercontent.com/Nyr/wireguard-install/master/wireguard-install.sh
chmod +x wireguard-install.sh
```

### 1.2 Install WireGuard and Generate Client Configuration
Run the script to install WireGuard and set up the server. Follow the prompts to configure the server and add a client.

```bash
./wireguard-install.sh
```

- **Prompts**:
  - **Server public IP**: Enter the VPS’s public IP (e.g., `143.110.228.48`).
  - **Port**: Use the default port `51820` (or change if needed).
  - **Client name**: Enter a name for the MikroTik client (e.g., `mikrotik`).
  - **IP**: The script will assign an IP (e.g., `10.7.0.2/32`) to the client.

### 1.3 Retrieve the Client Configuration
The script generates a client configuration file (e.g., `/root/mikrotik.conf`). View the file to get the client’s private key, public key, and preshared key:

```bash
cat /root/mikrotik.conf
```

**Example Output**:
```
[Interface]
PrivateKey = <CLIENT_PRIVATE_KEY>
Address = 10.7.0.2/32

[Peer]
PublicKey = NqrsGmtjT+rtuC+4slaN94gPrTBIrfx3zzIApoXeCz4=
PresharedKey = DEIa0+549E/drQpythRW/gUnUkDsC0pDRESOqJvxW/g=
Endpoint = 143.110.228.48:51820
AllowedIPs = 0.0.0.0/0, ::/0
```

- **PrivateKey**: The client’s private key (e.g., `<CLIENT_PRIVATE_KEY>`).
- **PublicKey**: The server’s public key (e.g., `NqrsGmtjT+rtuC+4slaN94gPrTBIrfx3zzIApoXeCz4=`).
- **PresharedKey**: The preshared key for the client-server pair (e.g., `DEIa0+549E/drQpythRW/gUnUkDsC0pDRESOqJvxW/g=`).

### 1.4 Verify the Server Configuration
Check the server’s WireGuard configuration to confirm the client’s details:

```bash
cat /etc/wireguard/wg0.conf
```

**Example Output**:
```
[Interface]
Address = 10.7.0.1/24
PrivateKey = 6ISMpRIe6omFfeAtYDwbYkKoa0w4okJ8RLGkUB5E2m8=
ListenPort = 51820

[Peer]
PublicKey = 7d4W7TC3WpZ3LcdrI/YlyHnh9QJ8lzG4tML8E2IYShI=
PresharedKey = DEIa0+549E/drQpythRW/gUnUkDsC0pDRESOqJvxW/g=
AllowedIPs = 10.7.0.2/32
```

- **Address**: The server’s WireGuard IP (e.g., `10.7.0.1/24`).
- **PublicKey**: The client’s public key (e.g., `7d4W7TC3WpZ3LcdrI/YlyHnh9QJ8lzG4tML8E2IYShI=`).
- **AllowedIPs**: The client’s assigned IP (e.g., `10.7.0.2/32`).

### 1.5 Allow WireGuard Traffic on the VPS Firewall
Ensure the VPS firewall allows UDP traffic on port `51820`:

```bash
ufw allow 51820/udp
```

Allow ICMP for ping testing:

```bash
ufw allow proto icmp
```

---

## Step 2: Configure WireGuard on the MikroTik (Client)

Set up the WireGuard interface on the MikroTik, assign the IP, and configure the peer using the keys from the client configuration.

### 2.1 Create a WireGuard Interface
Add a WireGuard interface named `wg-client`:

```mikrotik
/interface wireguard
add name=wg-client
```

### 2.2 Set the Private Key and IP Address
Set the private key (from `/root/mikrotik.conf`) and assign the IP address (`10.7.0.2/32`):

```mikrotik
/interface wireguard
set wg-client private-key="<CLIENT_PRIVATE_KEY>"

/ip address
add address=10.7.0.2/32 interface=wg-client
```

Replace `<CLIENT_PRIVATE_KEY>` with the private key from `mikrotik.conf`.

### 2.3 Add the WireGuard Peer
Configure the peer with the server’s public key, preshared key, endpoint, and allowed IPs:

```mikrotik
/interface wireguard peers
add allowed-address=10.7.0.0/24 endpoint-address=143.110.228.48 endpoint-port=51820 interface=wg-client public-key="NqrsGmtjT+rtuC+4slaN94gPrTBIrfx3zzIApoXeCz4=" preshared-key="DEIa0+549E/drQpythRW/gUnUkDsC0pDRESOqJvxW/g=" persistent-keepalive=25
```

- `allowed-address=10.7.0.0/24`: Allows traffic to the WireGuard subnet (includes `10.7.0.1`).
- `endpoint-address=143.110.228.48`: The VPS’s public IP.
- `persistent-keepalive=25`: Ensures NAT traversal (since the MikroTik is behind NAT).

### 2.4 Verify the Configuration
Check the WireGuard interface and peer:

```mikrotik
/interface wireguard print detail
/interface wireguard peers print detail
```

---

## Step 3: Set Up Routing on the MikroTik

Add a route to direct traffic to the VPS’s WireGuard IP (`10.7.0.1`) through the `wg-client` interface. If routing all traffic through the VPN, add a default route.

### 3.1 Add a Route for the WireGuard Subnet
Ensure traffic to `10.7.0.1` goes through the `wg-client` interface:

```mikrotik
/ip route
add dst-address=10.7.0.1/32 gateway=wg-client
```

### 3.2 (Optional) Route All Traffic Through the VPN
If you want to route all traffic through the VPN, update the `allowed-address` and add a default route:

```mikrotik
/interface wireguard peers
set [find interface=wg-client] allowed-address=0.0.0.0/0

/ip route
add dst-address=0.0.0.0/0 gateway=wg-client
```

On the VPS, update the `AllowedIPs` in `/etc/wireguard/wg0.conf`:

```bash
nano /etc/wireguard/wg0.conf
```

Change:
```
AllowedIPs = 10.7.0.2/32
```
to:
```
AllowedIPs = 10.7.0.2/32, 0.0.0.0/0
```

Restart WireGuard on the VPS:

```bash
systemctl restart wg-quick@wg0
```

### 3.3 Verify Routing
Check the routing table:

```mikrotik
/ip route print
```

---

## Step 4: Allow Traffic in the MikroTik Firewall

Configure the MikroTik firewall to allow WireGuard and ICMP traffic.

### 4.1 Allow Outbound WireGuard Traffic
Allow UDP traffic to the VPS’s WireGuard port (`51820`):

```mikrotik
/ip firewall filter
add chain=output action=accept protocol=udp dst-port=51820 comment="Allow WireGuard Outbound"
```

Move it to the top of the `output` chain:

```mikrotik
/ip firewall filter move [find comment="Allow WireGuard Outbound"] 0
```

### 4.2 Allow Inbound WireGuard Responses
Allow UDP responses from the VPS:

```mikrotik
/ip firewall filter
add chain=input action=accept protocol=udp src-address=143.110.228.48 src-port=51820 comment="Allow WireGuard Inbound Responses"
```

Move it to an appropriate position (e.g., after ICMP rules):

```mikrotik
/ip firewall filter move [find comment="Allow WireGuard Inbound Responses"] 8
```

### 4.3 Allow ICMP Traffic
Allow ICMP for ping testing:

```mikrotik
/ip firewall filter
add chain=input action=accept protocol=icmp comment="Allow ICMP Input"
add chain=output action=accept protocol=icmp comment="Allow ICMP Output"
```

Move them to appropriate positions:

```mikrotik
/ip firewall filter move [find comment="Allow ICMP Input"] 7
/ip firewall filter move [find comment="Allow ICMP Output"] 1
```

### 4.4 Verify Firewall Rules
Check the firewall rules:

```mikrotik
/ip firewall filter print
```

---

## Step 5: Test the Connection

### 5.1 Check the WireGuard Tunnel
On the VPS:

```bash
wg show
```

Look for a recent `latest handshake` and data transfer.

On the MikroTik:

```mikrotik
/interface wireguard peers print
```

Look for a recent `last-handshake`.

### 5.2 Test Ping
Ping from the VPS to the MikroTik:

```bash
ping 10.7.0.2
```

Ping from the MikroTik to the VPS:

```mikrotik
/ping 10.7.0.1
```

If routing all traffic, test an external IP:

```mikrotik
/ping 8.8.8.8
```

---

## Troubleshooting Tips

- **Handshake Fails**:
  - Double-check the public, private, and preshared keys.
  - Ensure UDP port `51820` is open on both the VPS and MikroTik firewalls.
  - Verify the MikroTik’s endpoint (`143.110.228.48:51820`).

- **Ping Fails**:
  - Check routing: `/ip route print`.
  - Check firewall logs: `/log print`.
  - Lower the MTU if needed:
    ```mikrotik
    /interface wireguard
    set wg-client mtu=1280
    ```
    ```bash
    ip link set wg0 mtu 1280
    systemctl restart wg-quick@wg0
    ```

- **NAT Issues**:
  - Ensure `persistent-keepalive=25` is set on the MikroTik if behind NAT.

---

## Conclusion

Following these steps sets up a secure WireGuard VPN between a VPS and a MikroTik router. The tunnel allows secure communication, and with proper routing, all traffic can be routed through the VPN. Test the connection thoroughly and adjust firewall or routing as needed for your specific use case.
