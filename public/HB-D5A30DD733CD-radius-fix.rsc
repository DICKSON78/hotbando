# ============================================================================
# HotBando — RADIUS / MAC-login fix for router HB-D5A30DD733CD
# ============================================================================
# WHY: The router sends RADIUS accounting packets with a stale shared secret.
# FreeRADIUS drops every packet ("Shared secret is incorrect"), so customers
# who paid still cannot get internet. This script re-applies the secret the
# server uses and enables MAC login so a paid device is authorised without
# needing the (currently unreachable) router API.
#
# HOW: Open WinBox -> Terminal on the router, paste this whole file, Enter.
# It is idempotent and safe to run more than once.
# ============================================================================

# Use :global for all variables to avoid scoping issues in loops
:global hbServer "67.205.179.122"
:global hbSecret "d75158fa554f26306ea6b4c5b732e0a4743f2cda96d56d7782d1352e95c76cd6"
:global hbUpdated 0

# 1. Re-apply the shared secret on every RADIUS entry used by the hotspot.
#    If no hotspot entry exists at all, create one.
:put "Step 1: Updating RADIUS entries..."

# First, try to update existing hotspot RADIUS entries
:global radiusList [/radius find]
:foreach r in=$radiusList do={
    :global rService ""
    :do {
        :set rService [/radius get $r service]
    } on-error={
        :put "  WARN: could not read service for entry, skipping"
        :set rService ""
    }
    # Check if this entry serves hotspot
    :global isHotspot false
    :if ([:typeof $rService] = "str") do={
        :if ([:find $rService "hotspot"] >= 0) do={
            :set isHotspot true
        }
    }
    :if ($isHotspot) do={
        :do {
            /radius set $r address=$hbServer secret=$hbSecret authentication-port=1812 accounting-port=1813 timeout=3000ms
            :set hbUpdated ($hbUpdated + 1)
            :put "  Updated RADIUS entry (service: hotspot)"
        } on-error={
            :put "  ERROR: failed to update RADIUS entry"
        }
    }
}

# If no hotspot RADIUS entry was found, create one
:if ($hbUpdated = 0) do={
    :put "  No hotspot RADIUS entry found, creating new one..."
    :do {
        /radius add service=hotspot address=$hbServer secret=$hbSecret authentication-port=1812 accounting-port=1813 timeout=3000ms comment="HotBando FreeRADIUS"
        :set hbUpdated 1
        :put "  Created new HotBando RADIUS entry"
    } on-error={
        :put "  ERROR: failed to create RADIUS entry"
        :put "  Check if RADIUS package is installed: /system package print"
    }
}

# 2. Make every hotspot profile use RADIUS and accept MAC login.
#    MAC login is what lets a paid phone reconnect by itself, even when the
#    HotBando server cannot reach the router API.
:put "Step 2: Configuring hotspot profiles..."

# Enable RADIUS on all profiles
:global profileCount 0
:foreach p in=[/ip hotspot profile find] do={
    :do {
        /ip hotspot profile set $p use-radius=yes
        /ip hotspot profile set $p radius-accounting=yes
        /ip hotspot profile set $p radius-interim-update=30s
        :set profileCount ($profileCount + 1)
    } on-error={
        :put "  WARN: failed to enable RADIUS on a profile"
    }
}
:put ("  Configured " . $profileCount . " hotspot profile(s) for RADIUS")

# Enable MAC login on all profiles
:foreach p in=[/ip hotspot profile find] do={
    :do {
        /ip hotspot profile set $p login-by=http-pap,http-chap,mac
    } on-error={
        :put "  WARN: failed to set login-by on a profile"
    }
}

# Set MAC auth mode
:foreach p in=[/ip hotspot profile find] do={
    :do {
        /ip hotspot profile set $p mac-auth-mode=mac-as-username-and-password
    } on-error={
        :put "  WARN: failed to set mac-auth-mode on a profile"
    }
}

# 3. Optional but recommended: let the HotBando server manage this router over
#    WireGuard (the router's public management ports are closed, which is why
#    the app cannot provision users right now).
:put "Step 3: Configuring API access..."

# Enable API service
:do {
    /ip service set api disabled=no
    :put "  API service enabled"
} on-error={
    :put "  WARN: could not enable API service"
}

# Set API port
:do {
    /ip service set api port=8728
    :put "  API port set to 8728"
} on-error={
    :put "  WARN: could not set API port"
}

# Restrict API to WireGuard subnet (security)
:do {
    /ip service set api address=10.7.0.0/24
    :put "  API restricted to 10.7.0.0/24 (WireGuard subnet)"
} on-error={
    :put "  WARN: could not restrict API address"
}

# Add firewall rule for WG management (if WireGuard exists)
:global wgCount 0
:do {
    :set wgCount [:len [/interface wireguard find]]
} on-error={
    :set wgCount 0
}

:if ($wgCount > 0) do={
    :global wgName ""
    :do {
        :set wgName [/interface wireguard get [:pick [/interface wireguard find] 0] name]
    } on-error={
        :set wgName ""
    }
    :if ([:len $wgName] > 0) do={
        :global fwCount 0
        :do {
            :set fwCount [:len [/ip firewall filter find comment="HotBando WG management"]]
        } on-error={
            :set fwCount 0
        }
        :if ($fwCount = 0) do={
            :do {
                /ip firewall filter add chain=input in-interface=$wgName protocol=tcp dst-port=8728 action=accept place-before=0 comment="HotBando WG management"
                :put "  Added firewall rule for WG management on " . $wgName
            } on-error={
                :put "  WARN: could not add firewall rule"
            }
        } else={
            :put "  Firewall rule already exists"
        }
    }
} else={
    :put "  No WireGuard interface found (skipping WG firewall rule)"
}

# 4. Verification output
:put "============================================="
:put "HotBando RADIUS fix applied."
:put "============================================="
:put "--- RADIUS entries ---"
/radius print
:put "============================================="
:put "--- Hotspot profiles ---"
/ip hotspot profile print
:put "============================================="
:put "--- API service ---"
/ip service print where name=api
:put "============================================="
:put "--- WireGuard interfaces ---"
/interface wireguard print
:put "============================================="
:put "Next: on a phone, forget/rejoin the WiFi and open https://hotbandowifi.online"
:put "============================================="