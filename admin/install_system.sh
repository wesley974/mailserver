#!/bin/sh

function test_pkg {
if [ "$?" == 1 ]; then
    echo "Error"
    exit 1
fi
}

DEFAULT=/var/mailserver
