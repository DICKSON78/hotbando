# HotBando FreeRADIUS Perl Authentication Module
# Supports two auth methods used by the MikroTik hotspot:
#
#   1. MAC auth (mac-auth-mode=mac-as-username-and-password):
#      User-Name / User-Password = client MAC address.
#      The MAC is matched against users.mac_address. If the user is
#      entitled while paid time/data remains OR free_bytes remain,
#      the request is accepted and the client gets internet.
#
#   2. Phone auth (login-by=http-pap,http-chap):
#      User-Name = phone_number, User-Password = plaintext password.
#      The bcrypt hash is verified via Perl's crypt() function
#      (supports $2a$/$2b$ on Ubuntu 22.04+).

use DBI;
use strict;
use vars qw(%RAD_REQUEST %RAD_CHECK %RAD_REPLY);

my $db_host = $ENV{DB_HOST} || 'db';
my $db_port = $ENV{DB_PORT} || '3306';
my $db_name = $ENV{DB_NAME} || 'hotbando';
my $db_user = $ENV{DB_USER} || 'hotbando';
my $db_pass = $ENV{DB_PASSWORD} || 'hotbando_pass';

use constant {
    RLM_MODULE_REJECT  => 0,
    RLM_MODULE_OK      => 2,
    RLM_MODULE_HANDLED => 3,
    RLM_MODULE_INVALID => 4,
    RLM_MODULE_NOTFOUND => 6,
};

sub _db_connect {
    return DBI->connect(
        "DBI:mysql:database=$db_name;host=$db_host;port=$db_port",
        $db_user, $db_pass,
        { RaiseError => 0, PrintError => 0, mysql_connect_timeout => 3 }
    );
}

# Normalize a MAC to 12 lowercase hex chars (handles AA:BB:.., aa-bb-.., MikroTik aa.bb.cc format)
sub _normalize_mac {
    my ($raw) = @_;
    my $mac = lc($raw || '');
    $mac =~ s/[^0-9a-f]//g;
    return $mac;
}

sub _is_mac {
    my ($username) = @_;
    return (_normalize_mac($username) =~ /^[0-9a-f]{12}$/) ? 1 : 0;
}

# Return the stored hash (for phone auth) or 1 (for MAC auth) if the user is entitled
sub _find_entitled_user {
    my ($username) = @_;

    my $dbh = _db_connect();
    return undef unless $dbh;

    my ($sql, @args);
    if (_is_mac($username)) {
        my $mac = _normalize_mac($username);
        $sql = "SELECT 1
                FROM users u
                WHERE REPLACE(REPLACE(LOWER(u.mac_address), ':', ''), '-', '') = ?
                  AND u.role = 'customer'
                  AND u.is_active = 1
                  AND ((u.usage_until > NOW() AND (u.paid_data_limit_bytes = 0 OR u.paid_bytes_remaining > 0)) OR u.free_bytes > 0)
                LIMIT 1";
        @args = ($mac);
    } else {
        $sql = "SELECT u.password
                FROM users u
                WHERE u.phone_number = ?
                  AND u.role = 'customer'
                  AND u.is_active = 1
                  AND ((u.usage_until > NOW() AND (u.paid_data_limit_bytes = 0 OR u.paid_bytes_remaining > 0)) OR u.free_bytes > 0)
                LIMIT 1";
        @args = ($username);
    }

    my $sth = $dbh->prepare($sql);
    $sth->execute(@args);
    my ($result) = $sth->fetchrow_array();
    $sth->finish();
    $dbh->disconnect();

    return $result;
}

# Load the remaining allowance for reply attributes. Without this the local
# RouterOS user limits are ignored once RADIUS authenticates the session.
sub _load_allowance {
    my ($username) = @_;

    my $dbh = _db_connect();
    return undef unless $dbh;

    my ($where, @args);
    if (_is_mac($username)) {
        $where = "REPLACE(REPLACE(LOWER(u.mac_address), ':', ''), '-', '') = ?";
        @args = (_normalize_mac($username));
    } else {
        $where = "u.phone_number = ?";
        @args = ($username);
    }

    my $sql = "SELECT u.free_bytes, u.paid_bytes_remaining, u.paid_data_limit_bytes,
                      GREATEST(TIMESTAMPDIFF(SECOND, NOW(), u.usage_until), 0) AS seconds_left,
                      (u.usage_until > NOW() AND (u.paid_data_limit_bytes = 0 OR u.paid_bytes_remaining > 0)) AS paid
               FROM users u
               WHERE $where
                 AND u.role = 'customer'
                 AND u.is_active = 1
                 AND ((u.usage_until > NOW() AND (u.paid_data_limit_bytes = 0 OR u.paid_bytes_remaining > 0)) OR u.free_bytes > 0)
               LIMIT 1";

    my $sth = $dbh->prepare($sql);
    $sth->execute(@args);
    my @row = $sth->fetchrow_array();
    $sth->finish();
    $dbh->disconnect();

    return @row ? \@row : undef;
}

sub authorize {
    my $username = $RAD_REQUEST{'User-Name'} || '';
    return RLM_MODULE_NOTFOUND unless $username;

    my $result = _find_entitled_user($username);
    return RLM_MODULE_NOTFOUND unless $result;

    if (_is_mac($username)) {
        # MAC auth: the router only needs to know the MAC is entitled.
        # No password verification required (password == MAC anyway).
        $RAD_CHECK{'Auth-Type'} = 'Accept';
    } else {
        $RAD_CHECK{'Auth-Type'} = 'PAP';
        $RAD_CHECK{'Crypt-Password'} = $result;
    }

    return RLM_MODULE_OK;
}

sub authenticate {
    my $password = $RAD_REQUEST{'User-Password'} || '';
    return RLM_MODULE_REJECT unless $password;

    my $username = $RAD_REQUEST{'User-Name'} || '';
    return RLM_MODULE_REJECT unless $username;

    # MAC auth requests are entitlement-only (Auth-Type Accept short-circuits,
    # but keep this as a safety net for Auth-Type PAP flows).
    return RLM_MODULE_OK if _is_mac($username);

    my $stored_hash = _find_entitled_user($username);
    return RLM_MODULE_REJECT unless $stored_hash;

    my $result = crypt($password, $stored_hash);
    return ($result eq $stored_hash) ? RLM_MODULE_OK : RLM_MODULE_REJECT;
}

sub post_auth {
    my $username = $RAD_REQUEST{'User-Name'} || '';
    return RLM_MODULE_OK unless $username;

    my $allowance = _load_allowance($username);
    return RLM_MODULE_OK unless $allowance;

    my ($free_bytes, $paid_bytes, $paid_limit, $seconds_left, $paid) = @$allowance;

    if ($paid && $seconds_left > 0) {
        # Paid package: let the session live for the remaining package time.
        $RAD_REPLY{'Session-Timeout'} = int($seconds_left);
    }

    # A capped paid package gets a RouterOS byte limit. When paid entitlement
    # is not active, ad-earned data remains independently usable.
    my $bytes = ($paid && $paid_limit > 0) ? $paid_bytes : ((!$paid && $free_bytes > 0) ? $free_bytes : 0);
    if ($bytes > 0) {
        $bytes = int($bytes);
        $RAD_REPLY{'Mikrotik-Total-Limit'} = $bytes % 4294967296;
        if ($bytes >= 4294967296) {
            $RAD_REPLY{'Mikrotik-Total-Limit-Gigawords'} = int($bytes / 4294967296);
        }
    }

    return RLM_MODULE_OK;
}

sub accounting {
    my $status = lc($RAD_REQUEST{'Acct-Status-Type'} || '');
    return RLM_MODULE_OK unless $status eq 'interim-update' || $status eq 'stop';

    my $session_id = $RAD_REQUEST{'Acct-Session-Id'} || '';
    my $username = $RAD_REQUEST{'User-Name'} || '';
    return RLM_MODULE_OK unless $session_id && $username;

    my $nas = $RAD_REQUEST{'NAS-Identifier'} || $RAD_REQUEST{'NAS-IP-Address'} || 'unknown-nas';
    my $mac = $RAD_REQUEST{'Calling-Station-Id'} || '';
    my $input = ($RAD_REQUEST{'Acct-Input-Gigawords'} || 0) * 4294967296 + ($RAD_REQUEST{'Acct-Input-Octets'} || 0);
    my $output = ($RAD_REQUEST{'Acct-Output-Gigawords'} || 0) * 4294967296 + ($RAD_REQUEST{'Acct-Output-Octets'} || 0);
    my $dbh = _db_connect();
    return RLM_MODULE_OK unless $dbh;

    eval {
        $dbh->begin_work();
        $dbh->do(
            'INSERT IGNORE INTO radius_usage_sessions (nas_identity, acct_session_id, username, mac_address) VALUES (?, ?, ?, ?)',
            undef, $nas, $session_id, $username, $mac
        );
        my $session = $dbh->selectrow_hashref(
            'SELECT input_octets, output_octets FROM radius_usage_sessions WHERE nas_identity = ? AND acct_session_id = ? FOR UPDATE',
            undef, $nas, $session_id
        );
        my $delta = ($input > ($session->{input_octets} || 0) ? $input - ($session->{input_octets} || 0) : 0)
                  + ($output > ($session->{output_octets} || 0) ? $output - ($session->{output_octets} || 0) : 0);
        $dbh->do(
            'UPDATE radius_usage_sessions SET username = ?, mac_address = ?, input_octets = GREATEST(input_octets, ?), output_octets = GREATEST(output_octets, ?), last_accounting_at = NOW() WHERE nas_identity = ? AND acct_session_id = ?',
            undef, $username, $mac, $input, $output, $nas, $session_id
        );

        if ($delta > 0) {
            my ($where, @args);
            if (_is_mac($username)) {
                $where = "REPLACE(REPLACE(LOWER(mac_address), ':', ''), '-', '') = ?";
                @args = (_normalize_mac($username));
            } else {
                $where = 'phone_number = ?';
                @args = ($username);
            }
            my $user = $dbh->selectrow_hashref(
                "SELECT id, paid_bytes_remaining, paid_data_limit_bytes, free_bytes,
                        (usage_until > NOW()) AS paid_active
                 FROM users WHERE $where AND role = 'customer' LIMIT 1 FOR UPDATE",
                undef, @args
            );
            if ($user && !($user->{paid_active} && int($user->{paid_data_limit_bytes} || 0) == 0)) {
                my $paid_left = int($user->{paid_bytes_remaining} || 0);
                my $free_left = int($user->{free_bytes} || 0);
                my $from_paid = $delta < $paid_left ? $delta : $paid_left;
                $paid_left -= $from_paid;
                my $from_free = $delta - $from_paid;
                $free_left = $from_free >= $free_left ? 0 : $free_left - $from_free;
                $dbh->do('UPDATE users SET paid_bytes_remaining = ?, free_bytes = ? WHERE id = ?', undef, $paid_left, $free_left, $user->{id});
            }
        }
        $dbh->commit();
        1;
    } or do {
        my $error = $@ || 'RADIUS accounting failed';
        eval { $dbh->rollback(); };
        warn "HotBando RADIUS usage accounting failed: $error";
    };
    $dbh->disconnect();
    return RLM_MODULE_OK;
}

1;
