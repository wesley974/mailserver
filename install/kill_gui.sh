#!/bin/sh
_DEFAULT=/var/mailserver
kill $(pgrep -f mongrel) 2> /dev/null &&
rm -rf $_DEFAULT/admin/{log,tmp}/* 2>/dev/null
rm -rf $_DEFAULT/account/{log,tmp}/* 2>/dev/null
