#!/bin/sh
DEFAULT=/var/mailserver

_err() {
echo "!!! ${@}"
exit 1
}

/usr/local/bin/mysql -e "grant select on mail.* to 'postfix'@'localhost' identified by 'postfix';"
/usr/local/bin/mysql -e "grant all privileges on mail.* to 'mailadmin'@'localhost' identified by 'mailadmin';"

/usr/local/bin/mysql -e "show databases;" | grep mail > /dev/null 2>&1
if [ $? == 0 ]; then
	_err "mail database already exist"
fi

cd $DEFAULT/admin && env LD_PRELOAD=/usr/local/lib/ruby/gems/1.8/gems/mysql-2.9.1/lib/mysql/mysql_api.so rake -s db:setup RAIL_ENV=production
