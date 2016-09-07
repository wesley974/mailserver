#!/bin/sh
_DEFAULT=/var/mailserver
install -m 644 -o root -g wheel $_DEFAULT/upgrade/etc/login.conf /etc
install -m 644 -o root -g wheel $_DEFAULT/upgrade/etc/newsyslog.conf /etc
install -m 644 -o root -g wheel $_DEFAULT/upgrade/etc/mail/aliases /etc/mail
/usr/bin/newaliases
/usr/bin/cap_mkdb /etc/login.conf

/usr/bin/openssl genrsa -out /etc/ssl/private/mailserver.key 2048 2>/dev/null
/usr/bin/openssl req -new -key /etc/ssl/private/mailserver.key \
    -out $_TMPDIR/mailserver.csr -subj "/CN=`hostname`" 2>/dev/null
/usr/bin/openssl x509 -req -days 1095 -in $_TMPDIR/mailserver.csr \
    -signkey /etc/ssl/private/mailserver.key -out /etc/ssl/mailserver.crt \
	2>/dev/null

install -m 644 $_DEFAULT/install/system/dovecot/*.conf /etc/dovecot
chgrp _dovecot /usr/local/libexec/dovecot/dovecot-lda
chmod 4750 /usr/local/libexec/dovecot/dovecot-lda
/usr/sbin/rcctl restart dovecot
