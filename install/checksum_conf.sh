#!/bin/sh
DEFAULT=/var/mailserver
/bin/sha256 /etc/my.cnf \
	/etc/login.conf \
	/etc/php-5.6.ini \
	/etc/php-fpm.conf \
	/etc/nginx/nginx.conf \
	/etc/sysctl.conf \
	/etc/mail/spamassassin/local.cf \
 	/etc/clamav-milter.conf \
	/etc/clamd.conf \
	/etc/freshclam.conf \
 	/etc/postfix/header_checks.pcre \
	/etc/postfix/master.cf \
	/etc/postfix/main.cf \
	/etc/postfix/milter_header_checks \
	/etc/dovecot/dovecot.conf \
 	/etc/newsyslog.conf \
	/var/www/roundcubemail/config/db.inc.php \
	/var/www/roundcubemail/config/main.inc.php \
	/etc/group \
	/etc/passwd \
	/etc/master.passwd \
	/etc/pwd.db \
	/etc/spwd.db \
	/var/cron/tabs/root \
	/etc/pf.conf \
	/etc/rc.conf.local > $DEFAULT/install/SHA256
