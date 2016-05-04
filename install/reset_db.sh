#!/bin/sh
echo "BE CAREFUL! ALL DATAS (DB) WILL BE ERASED!"
echo "PRESS ENTER TO CONTINUE OR BREAK IT WITH CTRL-C!"
read pause

DEFAULT=/var/mailserver
mysqladmin drop mail
mysqladmin drop spamcontrol
mysqladmin drop webmail

/bin/sh $DEFAULT/install/build_db.sh
/usr/local/bin/mysql -e "grant select on mail.* to 'postfix'@'localhost' identified by 'postfix';"
/usr/local/bin/mysql -e "grant all privileges on mail.* to 'mailadmin'@'localhost' identified by 'mailadmin';"

/usr/local/bin/mysql < $DEFAULT/install/gui/spamcontrol.sql

/usr/local/bin/mysqladmin create webmail
/usr/local/bin/mysql webmail < /var/www/roundcubemail/SQL/mysql.initial.sql
/usr/local/bin/mysql webmail -e "grant all privileges on webmail.* to 'webmail'@'localhost' identified by 'webmail'"
