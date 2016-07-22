#!/bin/sh
_DEFAULT=/var/mailserver
_BACKUP=$_DEFAULT/install/backup
mkdir -p $_BACKUP
cp /etc/hostname.* $_BACKUP
cp /etc/hosts $_BACKUP
cp /etc/myname $_BACKUP
cp /etc/mygate $_BACKUP 2> /dev/null
cp /etc/resolv.conf $_BACKUP
cp /etc/group $_BACKUP
cp /etc/passwd $_BACKUP
cp /etc/master.passwd $_BACKUP
cp /etc/pwd.db $_BACKUP
cp /etc/spwd.db $_BACKUP
cp /etc/login.conf $_BACKUP
cp /etc/sysctl.conf $_BACKUP
cp /etc/mailer.conf $_BACKUP
cp /etc/newsyslog.conf $_BACKUP
cp /etc/my.cnf $_BACKUP
cp /var/cron/tabs/root $_BACKUP
cp /etc/rc.conf.local $_BACKUP
cp /etc/rc.shutdown $_BACKUP
cp /etc/pf.conf $_BACKUP
cp /etc/php-5.6.ini $_BACKUP
