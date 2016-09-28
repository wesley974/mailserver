#!/bin/sh
_DEFAULT=/var/mailserver
_BACKUP=$_DEFAULT/install/backup

if [ -f $_BACKUP/app.sql.gz ]; then
	(cd $_BACKUP && gunzip $_BACKUP/app.sql.gz)
fi

mysql -u root << EOF
drop database mail;
create database mail;
EOF

mysql -u root mail < $_BACKUP/app.sql

/usr/sbin/mtree -qedf $_BACKUP/special.var_mailserver_mail -p /var/mailserver/mail -u


