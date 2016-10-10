#!/bin/sh
_DEFAULT=/var/mailserver
_BACKUP=${_DEFAULT}/install/backup
mkdir -p ${_BACKUP}
cp -p /etc/hostname.* ${_BACKUP}
cp -p /etc/hosts ${_BACKUP}
cp -p /etc/myname ${_BACKUP}
cp -p /etc/mygate ${_BACKUP} 2> /dev/null
cp -p /etc/resolv.conf ${_BACKUP}
cp -p /etc/group ${_BACKUP}
cp -p /etc/passwd ${_BACKUP}
cp -p /etc/master.passwd ${_BACKUP}
cp -p /etc/pwd.db ${_BACKUP}
cp -p /etc/spwd.db ${_BACKUP}
cp -p /etc/login.conf ${_BACKUP}
cp -p /etc/sysctl.conf ${_BACKUP}
cp -p /etc/mailer.conf ${_BACKUP}
cp -p /etc/mail/aliases ${_BACKUP}
cp -p /etc/newsyslog.conf ${_BACKUP}
cp -p /etc/my.cnf ${_BACKUP}
cp -p /var/cron/tabs/root ${_BACKUP}
cp -p /etc/rc.conf.local ${_BACKUP}
cp -p /etc/rc.shutdown ${_BACKUP}
cp -p /etc/pf.conf ${_BACKUP}
cp -p /etc/php-5.6.ini ${_BACKUP}
