#!/bin/sh
echo "BE CAREFUL! ALL DATAS (DB) WILL BE ERASED!"
echo "PRESS ENTER TO CONTINUE OR BREAK IT WITH CTRL-C!"
read pause

_DEFAULT=/var/mailserver
mysqladmin drop mail
mysqladmin drop spamcontrol
mysqladmin drop webmail

/bin/sh ${_DEFAULT}/install/build_db.sh

/usr/local/bin/mysql < ${_DEFAULT}/install/gui/spamcontrol.sql

/usr/local/bin/mysqladmin create webmail
/usr/local/bin/mysql webmail < /var/www/roundcubemail/SQL/mysql.initial.sql
/usr/local/bin/mysql webmail -e "grant all privileges on webmail.* to 'webmail'@'localhost' identified by 'webmail'"
