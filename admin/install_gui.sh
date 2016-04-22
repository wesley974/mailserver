#!/bin/sh

function test_pkg {
if [ "$?" == 1 ]; then
    echo "Error"
    exit 1
fi
}

DEFAULT=/var/mailserver
mkdir -p $DEFAULT/admin/{log,tmp}

echo "-- Git install"
echo installpath=ftp2.fr.openbsd.org > /etc/pkg.conf
pkg_add git
test_pkg

echo "-- Remove old staff"
rm -rf $DEFAULT/admin/{tmp,log}/*

echo "-- Set permissions"
chmod -R 755 $DEFAULT/admin
chmod -R 777 $DEFAULT/{tmp,log}

echo "-- Create mail folder"
mkdir -p $DEFAULT/mail
test_pkg

echo "-- Install packages"
pkg_add ImageMagick mariadb-server php-mysql-5.6.18 php-pdo_mysql-5.6.18 \
    php-intl-5.6.18 xcache gtar-1.28p1 nginx-1.9.10 node \
    ruby-1.8.7.374p5 ruby-gems-1.8.24 ruby-iconv-1.8.7.374 \
    ruby-mysql-2.9.1p0 ruby-rake-0.9.2.2p0
test_pkg

echo "-- Link Python"
ln -sf /usr/local/bin/python2.7 /usr/local/bin/python
ln -sf /usr/local/bin/python2.7-2to3 /usr/local/bin/2to3
ln -sf /usr/local/bin/python2.7-config /usr/local/bin/python-config
ln -sf /usr/local/bin/pydoc2.7  /usr/local/bin/pydoc

echo "-- Set MariaDB-server"
/usr/local/bin/mysql_install_db > /dev/null 2>&1
mv /etc/my.cnf /etc/examples/
sed '/\[mysqld\]/ a\
    bind-address    = 127.0.0.1
    ' /etc/examples/my.cnf > /etc/my.cnf
/usr/sbin/rcctl enable mysqld
/usr/sbin/rcctl start mysqld
test_pkg

echo " -- Set PHP"
ln -sf /etc/php-5.6.sample/intl.ini /etc/php-5.6/intl.ini
ln -sf /etc/php-5.6.sample/mcrypt.ini /etc/php-5.6/mcrypt.ini
ln -sf /etc/php-5.6.sample/mysql.ini /etc/php-5.6/mysql.ini
ln -sf /etc/php-5.6.sample/pdo_mysql.ini /etc/php-5.6/pdo_mysql.ini
ln -sf /etc/php-5.6.sample/pspell.ini /etc/php-5.6/pspell.ini
ln -sf /etc/php-5.6.sample/zip.ini /etc/php-5.6/zip.ini
ln -fs /etc/php-5.6.sample/xcache.ini /etc/php-5.6/xcache.ini
ln -sf /usr/local/bin/php-5.6 /usr/local/bin/php
echo "allow_url_fopen = On" >> /etc/php-5.6.ini
echo "suhosin.session.encrypt = Off" >> /etc/php-5.6.ini
install -m 644 $DEFAULT/admin/config/php-fpm.conf /etc
/usr/sbin/rcctl enable php56_fpm
/usr/sbin/rcctl start php56_fpm
test_pkg

echo " -- Set certificates"
/usr/bin/openssl genrsa -out /etc/ssl/private/server.key 2048 2>/dev/null
/usr/bin/openssl req -new -key /etc/ssl/private/server.key \
    -out /tmp/server.csr -subj "/CN=`hostname`" 2>/dev/null
/usr/bin/openssl x509 -req -days 1095 -in /tmp/server.csr \
    -signkey /etc/ssl/private/server.key -out /etc/ssl/server.crt 2>/dev/null
rm -f /tmp/server.csr


echo " -- Set Ruby env."
ln -sf /usr/local/bin/ruby18 /usr/local/bin/ruby
ln -sf /usr/local/bin/erb18 /usr/local/bin/erb
ln -sf /usr/local/bin/irb18 /usr/local/bin/irb
ln -sf /usr/local/bin/rdoc18 /usr/local/bin/rdoc
ln -sf /usr/local/bin/ri18 /usr/local/bin/ri
ln -sf /usr/local/bin/rake18 /usr/local/bin/rake
ln -sf /usr/local/bin/gem18 /usr/local/bin/gem
/usr/local/bin/gem install bundler
ln -sf /usr/local/bin/bundle18 /usr/local/bin/bundle
ln -sf /usr/local/bin/bundler18 /usr/local/bin/bundler
gem install rdoc -v=3.11
gem install fastercsv -v=1.5.4
gem install mongrel -v=1.1.5
gem install rails -v=2.3.4
ln -sf /usr/local/bin/rails18 /usr/local/bin/rails
ln -sf /usr/local/bin/mongrel_rails18 /usr/local/bin/mongrel_rails


echo " -- Set Nginx"
install -m 644 $DEFAULT/admin/config/nginx.conf /etc/nginx/
/usr/sbin/rcctl enable nginx
/usr/sbin/rcctl set nginx flags -u
/usr/sbin/rcctl start nginx
test_pkg

echo " -- Create  databases"
/usr/local/bin/mysql < $DEFAULT/admin/config/spamcontrol.sql
/usr/local/bin/mysql -e "grant select on mail.* to 'postfix'@'localhost' identified by 'postfix';"
/usr/local/bin/mysql -e "grant all privileges on mail.* to 'mailadmin'@'localhost' identified by 'mailadmin';"
