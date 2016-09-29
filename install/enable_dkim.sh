#!/bin/sh
_DEFAULT=/var/mailserver
_DKIM=$_DEFAULT/install/system/dkim/dkimproxy_out.conf
_ADM=$(/usr/local/bin/mysql -u root < $_DEFAULT/install/system/domains/req_d.sql | grep -v ^name$)
_TMP="${TMPDIR:=/tmp}"
_TMPDIR=$(mktemp -dp ${_TMP} .install-XXXXXXXXXX) || exit 1

if [ -z "$_ADM" ]; then
install -m 644 $_DKIM /etc
/usr/sbin/rcctl restart dkimproxy_out
exit 0
fi

LIST=
for i in $_ADM
do
	if [ -z "$LIST" ]; then
	LIST=$i
	else
	LIST=$LIST,$i
	fi
done
echo "Your DKIM TXT Record :"
cat /etc/ssl/dkim/public.key
cat $_DKIM | sed "s/^domain.*/domain    $LIST/" > $_TMPDIR/dkim.temp
install -m 644 $_TMPDIR/dkim.temp /etc/dkimproxy_out.conf
/usr/sbin/rcctl restart dkimproxy_out
rm -rf $_TMPDIR
