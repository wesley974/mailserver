#!/bin/sh
DEFAULT=/var/mailserver
rm -rf $DEFAULT/admin/{log,tmp}/* 2>/dev/null
env LD_PRELOAD=/usr/local/lib/ruby/gems/1.8/gems/mysql-2.9.1/lib/mysql/mysql_api.so /usr/local/bin/mongrel_rails start -c $DEFAULT/admin -p 4213 -a 127.0.0.1 -d -e production -P $DEFAULT/admin/log/mongrel.pid 2> /dev/null
