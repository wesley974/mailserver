#!/bin/sh

function test_pkg {
if [ "$?" == 1 ]; then
    echo "Error"
    exit 1
fi
}

if [ $(uname -r) != "5.9" ]; then
        echo "This only works on OpenBSD 5.9"
        exit 1
fi

DEFAULT=/var/mailserver

mkdir -p /var/db/spamassassin

pkg_add roundcubemail clamav postfix-3.0.3p0-mysql p5-Mail-SpamAssassin \
    dovecot-mysql dovecot-pigeonhole
test_pkg

echo " -- Stop and disable unwanted services"
/usr/sbin/rcctl stop smtpd
/usr/sbin/rcctl disable smtpd
/usr/sbin/rcctl stop sndiod
/usr/sbin/rcctl disable sndiod

echo " -- Set Ntpd"
/usr/sbin/rcctl set ntpd flags -s
/usr/sbin/rcctl restart ntpd
