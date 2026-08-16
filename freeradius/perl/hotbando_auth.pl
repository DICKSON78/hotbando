# HotBando FreeRADIUS Perl Authentication Module
# Supports two auth methods used by the MikroTik hotspot:
#
#   1. MAC auth (mac-auth-mode=as-username-and-password):
#      User-Name / User-Password = client MAC address.
#      The MAC is matched against users.mac_address. If the user is
#      entitled (active + usage_until in future OR free_bytes left),
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
                  AND (u.usage_until > NOW() OR u.free_bytes > 0)
                LIMIT 1";
        @args = ($mac);
    } else {
        $sql = "SELECT u.password
                FROM users u
                WHERE u.phone_number = ?
                  AND u.role = 'customer'
                  AND u.is_active = 1
                  AND (u.usage_until > NOW() OR u.free_bytes > 0)
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
    return RLM_MODULE_OK;
}

sub accounting {
    return RLM_MODULE_OK;
}

1;
