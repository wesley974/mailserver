#!/bin/sh
LARRY=/var/www/roundcubemail/skins/larry/includes/header.html
CLASSIC=/var/www/roundcubemail/skins/classic/includes/taskbar.html

grep Admin $LARRY > /dev/null 2>&1

if [ "$?" == 1 ]; then
cp $LARRY /tmp
sed '/\<div id="taskbar"/a \
<a href=\"../../../account/auth/autologin?id=<roundcube:var name='request:roundcube_sessid' />\">Admin</a>
' /tmp/header.html > $LARRY
rm /tmp/header.html
fi

grep Admin $CLASSIC > /dev/null 2>&1

if [ "$?" == 1 ]; then
cp $CLASSIC /tmp
sed '/\<div id="taskbar"/a \
<a href=\"../../../account/auth/autologin?id=<roundcube:var name='request:roundcube_sessid' />\">Admin</a> 
' /tmp/taskbar.html > $CLASSIC
rm /tmp/taskbar.html
fi
