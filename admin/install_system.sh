#!/bin/sh

function test_pkg {
if [ "$?" == 1 ]; then
    echo "Error"
    exit 1
fi
}

if [ $(uname -r) != "5.9" ]; then
        echo "This only works on OpenBSD 5.9"
        exit 1
fi

DEFAULT=/var/mailserver
