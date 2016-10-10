#!/bin/sh
_DEFAULT=/var/mailserver
_ALIASES=/etc/mail/aliases
_ADM=$(/usr/local/bin/mysql -u root < ${_DEFAULT}/install/system/aliases/req_e.sql | grep -v ^email$)
_TMPDIR=$(mktemp -dp /tmp .install-XXXXXXXXXX) || exit 1

if [ -z "${_ADM}" ]; then
	exit 1
fi

grep ^root ${_ALIASES} > /dev/null
if [ "$?" == 0 ]; then
	grep -v ^root  ${_ALIASES} > ${_TMPDIR}/aliases.tmp
	cp ${_TMPDIR}/aliases.tmp ${_ALIASES}
	echo "root: ${_ADM}" >> /etc/mail/aliases
	/usr/bin/newaliases
else
	echo "root: ${_ADM}" >> /etc/mail/aliases
	/usr/bin/newaliases
fi
rm -rf ${_TMPDIR}
