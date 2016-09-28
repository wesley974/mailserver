#!/bin/sh

_err() {
echo "!!! ${@}"
exit 1
}

bye_bye() {
        rm -rf ${_TMPDIR}
        exit 1
}

_DEFAULT=/var/mailserver
_RDC=/var/www/roundcubemail
_TMP="${TMPDIR:=/tmp}"
_TMPDIR=$(mktemp -dp ${_TMP} .install-XXXXXXXXXX) || exit 1

trap "bye_bye" 1 2 3 13 15

if [ $(uname -r) != "6.0" ]; then
	_err "support only OpenBSD 6.0"
fi

if [ $# -gt 1 ]; then
        _err "support only one argument (-max)"
fi

case "$1" in
        "") DKIM_VALUE=1024;;
        -max) DKIM_VALUE=2048;;
        *) _err "support only one argument (-max)";;
esac

echo " -- Tune system"
/usr/sbin/sysctl kern.maxfiles=10000
/usr/sbin/sysctl machdep.lidsuspend=0
echo kern.maxfiles=10000 >> /etc/sysctl.conf
echo machdep.lidsuspend=0 >> /etc/sysctl.conf

cat /etc/login.conf | sed 's/:openfiles-cur=128/:openfiles-cur=1024/' > $_TMPDIR/login.conf.new
cp $_TMPDIR/login.conf.new /etc/login.conf
/usr/bin/cap_mkdb /etc/login.conf
ulimit -n 1024

echo " -- Create spamassassin's home"
mkdir -p /var/db/spamassassin

echo " -- Install packages"
pkg_add roundcubemail clamav postfix--mysql%stable p5-Mail-SpamAssassin \
    dovecot-mysql dovecot-pigeonhole dkimproxy libmagic
if [ "$?" == 1 ]; then
	_err "install package error"
fi

echo " -- Stop and disable unwanted services"
/usr/sbin/rcctl stop smtpd
/usr/sbin/rcctl disable smtpd
/usr/sbin/rcctl stop sndiod
/usr/sbin/rcctl disable sndiod

echo " -- Set Ntpd"
/usr/sbin/rcctl set ntpd flags -s
/usr/sbin/rcctl restart ntpd

echo " -- Set Spamassassin"
install -m 644 $_DEFAULT/install/system/spamassassin/*.cf /etc/mail/spamassassin/local.cf
install -m 755 $_DEFAULT/install/system/spamassassin/spamfilter /usr/local/sbin/
/usr/sbin/rcctl enable spamassassin
/usr/sbin/rcctl set spamassassin flags -s mail -u _spamdaemon -xq
/usr/sbin/rcctl start spamassassin
/usr/local/bin/sa-update -v
echo "30      6       *       *       *       /usr/local/bin/sa-update -v && /usr/sbin/rcctl reload spamassassin" >> /var/cron/tabs/root

echo " -- Set ClamAV"
install -m 644 $_DEFAULT/install/system/clamav/*clam* /etc 2> /dev/null
if [ ! -f /var/db/clamav/main.cld ]; then
touch /var/log/clamd.log 2> /dev/null
chown _clamav:_clamav /var/log/clamd.log
touch /var/log/clam-update.log 2> /dev/null
chown _clamav:_clamav /var/log/clam-update.log
touch /var/log/freshclam.log 2> /dev/null
chown _clamav:_clamav /var/log/freshclam.log
mkdir -p /var/db/clamav
chown -R _clamav:_clamav /var/db/clamav
/usr/local/bin/freshclam --no-warnings
fi
/usr/sbin/rcctl enable freshclam
/usr/sbin/rcctl enable clamd
/usr/sbin/rcctl enable clamav_milter
/usr/sbin/rcctl start freshclam
/usr/sbin/rcctl start clamd
/usr/sbin/rcctl start clamav_milter

echo " -- Set DKIM ($DKIM_VALUE)"
/usr/sbin/rcctl enable dkimproxy_out
mkdir -p /etc/ssl/dkim
(cd /etc/ssl/dkim && openssl genrsa -out private.key $DKIM_VALUE)
(cd /etc/ssl/dkim && openssl rsa -in private.key -pubout -out public.key)
chown -R _dkimproxy._dkimproxy /etc/ssl/dkim
chmod -R 770 /etc/ssl/dkim
install -m 644 $_DEFAULT/install/system/dkim/dkimproxy_out.conf /etc
/usr/sbin/rcctl start dkimproxy_out

echo " -- Set Postfix"
/usr/local/sbin/postfix-enable
mkdir -p /etc/postfix/sql
install -m 644 $_DEFAULT/install/system/postfix/* /etc/postfix
install -m 644 $_DEFAULT/install/system/postfix-sql/* /etc/postfix/sql
/usr/bin/newaliases
/usr/sbin/rcctl enable postfix
/usr/sbin/rcctl start postfix

echo " -- Set Dovecot"
install -m 644 $_DEFAULT/install/system/dovecot/*.conf /etc/dovecot
touch /var/log/imap 2> /dev/null
chgrp _dovecot /usr/local/libexec/dovecot/dovecot-lda
chmod 4750 /usr/local/libexec/dovecot/dovecot-lda
/usr/sbin/rcctl enable dovecot

cat <<EOF>>/etc/login.conf
dovecot:\\
          :openfiles-cur=512:\\
          :openfiles-max=2048:\\
          :tc=daemon:

EOF

/usr/bin/cap_mkdb /etc/login.conf

cp $_DEFAULT/install/system/dovecot/quota-warning.sh /usr/local/bin
chmod +x /usr/local/bin/quota-warning.sh
/usr/sbin/rcctl start dovecot

echo " -- Set newsyslog"
cp /etc/newsyslog.conf /etc/examples
head -n 16 /etc/examples/newsyslog.conf > /etc/newsyslog.conf

cat <<EOF>>/etc/newsyslog.conf
/var/www/logs/access.log                644  4     *    \$W0   Z /var/run/nginx.pid SIGUSR1
/var/www/logs/error.log                 644  7     250  *     Z /var/run/nginx.pid SIGUSR1

EOF

echo " -- Set Roundcube"
/usr/local/bin/mysqladmin create webmail
/usr/local/bin/mysql webmail < $_RDC/SQL/mysql.initial.sql
/usr/local/bin/mysql webmail -e "grant all privileges on webmail.* to 'webmail'@'localhost' identified by 'webmail'"
(cd $_RDC;ftp http://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types && chown www.www mime.types)
mv $_RDC/config/config.inc.php $_RDC/config/config.inc.php.backup
cp $_DEFAULT/install/system/roundcube/*.php $_RDC/config

echo " -- Set Roundcube sa plugin"
(cd $_RDC/plugins && git clone https://github.com/JohnDoh/Roundcube-Plugin-SpamAssassin-User-Prefs-SQL sauserprefs)
(cd $_RDC/plugins/sauserprefs && cp $_DEFAULT/install/system/roundcube/plugins/sauserprefs/config.inc.php .)

echo " -- Set Roundcube password plugin"
(cd $_RDC/plugins/password && cp $_DEFAULT/install/system/roundcube/plugins/password/config.inc.php .)

echo " -- Set Roundcube markasjunk plugin"
(cd $_RDC/plugins && git clone https://github.com/JohnDoh/Roundcube-Plugin-Mark-as-Junk-2 markasjunk2)
(cd $_RDC/plugins/markasjunk2 && cp $_DEFAULT/install/system/roundcube/plugins/markasjunk2/config.inc.php .)

echo " -- Set Roundcube sieverules plugin"
(cd $_RDC/plugins && git clone https://github.com/JohnDoh/Roundcube-Plugin-SieveRules-Managesieve sieverules)
(cd $_RDC/plugins/sieverules && cp $_DEFAULT/install/system/roundcube/plugins/sieverules/config.inc.php .)

echo " -- Set Roundcube contextmenu plugin"
(cd $_RDC/plugins && git clone https://github.com/JohnDoh/Roundcube-Plugin-Context-Menu contextmenu)

echo " -- Set Roundcube Mobile"
(cd $_RDC/skins && git clone https://github.com/messagerie-melanie2/Roundcube-Skin-Melanie2-Larry-Mobile melanie2_larry_mobile)
(cd $_RDC/plugins && git clone https://github.com/messagerie-melanie2/Roundcube-Plugin-Mobile mobile)
(cd $_RDC/plugins && git clone https://github.com/messagerie-melanie2/Roundcube-Plugin-JQuery-Mobile jquery_mobile)
(cd $_RDC/plugins && ftp https://getcomposer.org/download/1.1.2/composer.phar)
(cd $_RDC/plugins && /usr/local/bin/php composer.phar require melanie2/mobile:dev-master)

echo " -- Set Packet Filter"
(cd $_DEFAULT/install/system && git clone https://github.com/wesley974/rmspams)
chmod +x $_DEFAULT/install/system/rmspams/install.sh
(cd $_DEFAULT/install/system/rmspams && $_DEFAULT/install/system/rmspams/install.sh)

rm -rf $_TMPDIR
