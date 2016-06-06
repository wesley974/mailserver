#!/bin/sh
DEFAULT=/var/mailserver
DKIM=$DEFAULT/install/system/dkim/dkimproxy_out.conf
ADM=$(/usr/local/bin/mysql -u root < $DEFAULT/install/system/domains/req_d.sql | grep -v ^name$)
if [ -z "$ADM" ]; then
install -m 644 $DKIM /etc
/usr/sbin/rcctl restart dkimproxy_out
exit 0
fi
LIST=
for i in $ADM
do
	if [ -z "$LIST" ]; then
	LIST=$i
	else
	LIST=$LIST,$i
	fi
done
echo "Your DKIM TXT Record :"
cat /etc/ssl/dkim/public.key
cat $DKIM | sed "s/^domain.*/domain    $LIST/" > /tmp/dkim.temp
install -m 644 /tmp/dkim.temp /etc/dkimproxy_out.conf
rm /tmp/dkim.temp
/usr/sbin/rcctl restart dkimproxy_out
