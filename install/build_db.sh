#!/bin/sh
env LD_PRELOAD=/usr/local/lib/ruby/gems/1.8/gems/mysql-2.9.1/lib/mysql/mysql_api.so rake -s db:setup RAIL_ENV=production
