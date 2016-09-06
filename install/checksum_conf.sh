#!/bin/sh
_DEFAULT=/var/mailserver

if [ -f $_DEFAULT/install/SHA256 ]; then
	rm -f $_DEFAULT/install/SHA256
fi


if [ -f /etc/mygate ]; then
	/bin/sha256 /etc/mygate > $_DEFAULT/install/SHA256
fi

/bin/sha256 /etc/hostname.* \
	/etc/hosts \
	/etc/myname \
	/etc/resolv.conf \
	/etc/group \
	/etc/passwd \
	/etc/master.passwd \
	/etc/pwd.db \
	/etc/spwd.db \
	/etc/login.conf \
	/etc/sysctl.conf \
	/etc/mailer.conf \
	/etc/newsyslog.conf \
	/etc/my.cnf \
	/var/cron/tabs/root \
	/etc/rc.conf.local \
	/etc/rc.shutdown \
	/etc/pf.conf \
	/etc/php-5.6.ini \
	/etc/php-fpm.conf \
	/etc/nginx/nginx.conf \
	/etc/mail/aliases \
	/etc/mail/spamassassin/local.cf \
 	/etc/clamav-milter.conf \
	/etc/clamd.conf \
	/etc/freshclam.conf \
 	/etc/postfix/header_checks.pcre \
	/etc/postfix/master.cf \
	/etc/postfix/main.cf \
	/etc/postfix/milter_header_checks \
	/etc/dovecot/dovecot.conf \
	/var/www/roundcubemail/config/config.inc.php \
	>> $_DEFAULT/install/SHA256
