#!/bin/sh
ALIASES=/etc/mail/aliases
ROOT=/var/mailserver
ADM=$(/usr/local/bin/mysql -u root < $ROOT/install/system/aliases/req.sql | grep -v ^id | awk '{print $4}')

if [ -z "$ADM" ]; then
	exit 1
fi

grep ^root $ALIASES > /dev/null
if [ "$?" == 0 ]; then
	grep -v ^root  $ALIASES > /tmp/aliases.tmp
	mv /tmp/aliases.tmp $ALIASES
	echo "root: $ADM" >> /etc/mail/aliases
	/usr/bin/newaliases
else
	echo "root: $ADM" >> /etc/mail/aliases
	/usr/bin/newaliases
fi
