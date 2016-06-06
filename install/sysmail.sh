#!/bin/sh
DEFAULT=/var/mailserver
ALIASES=/etc/mail/aliases
ADM=$(/usr/local/bin/mysql -u root < $DEFAULT/install/system/aliases/req_e.sql | grep -v ^email$)

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
