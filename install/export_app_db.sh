#!/bin/sh
_DEFAULT=/var/mailserver
_BACKUP=${_DEFAULT}/install/backup
mkdir -p ${_BACKUP}
/usr/local/bin/mysqldump -f -u root mail | gzip -9 > ${_BACKUP}/app.sql.gz
(cd ${_DEFAULT}/mail && /usr/sbin/mtree -c -k uid,gid,mode > ${_BACKUP}/special.var_mailserver_mail)
