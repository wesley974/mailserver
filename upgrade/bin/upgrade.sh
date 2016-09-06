#!/bin/sh
_DEFAULT=/var/mailserver
install -m 644 -o root -g wheel $_DEFAULT/upgrade/etc/login.conf /etc
install -m 644 -o root -g wheel $_DEFAULT/upgrade/etc/newsyslog.conf /etc
install -m 644 -o root -g wheel $_DEFAULT/upgrade/etc/mail/aliases /etc/mail
/usr/bin/newaliases
/usr/bin/cap_mkdb /etc/login.conf
