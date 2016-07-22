#!/bin/sh
_LARRY=/var/www/roundcubemail/skins/larry/includes/header.html
_CLASSIC=/var/www/roundcubemail/skins/classic/includes/taskbar.html
_TMP="${TMPDIR:=/tmp}"
_TMPDIR=$(mktemp -dp ${_TMP} .install-XXXXXXXXXX) || exit 1

grep Admin $_LARRY > /dev/null 2>&1

if [ "$?" == 1 ]; then
cp $_LARRY $_TMPDIR
sed '/\<div id="taskbar"/a \
<a href=\"../../../account/auth/autologin?id=<roundcube:var name='request:roundcube_sessid' />\">Admin</a>
' $_TMPDIR/header.html > $_LARRY
fi

grep Admin $_CLASSIC > /dev/null 2>&1

if [ "$?" == 1 ]; then
cp $_CLASSIC $_TMPDIR
sed '/\<div id="taskbar"/a \
<a href=\"../../../account/auth/autologin?id=<roundcube:var name='request:roundcube_sessid' />\">Admin</a> 
' $_TMPDIR/taskbar.html > $_CLASSIC
fi

rm -rf $_TMPDIR
