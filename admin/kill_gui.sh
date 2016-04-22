DEFAULT=/var/mailserver
kill $(pgrep -f mongrel) 2> /dev/null &&
rm -rf $DEFAULT/admin/{log,tmp}/* 2>/dev/null
