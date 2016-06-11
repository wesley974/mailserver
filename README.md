# OpenBSD Mailserver

A full mailserver with an admin GUI and a domain admin GUI.
This works on OpenBSD 5.9.

Includes:

- postfix
- dovecot
- spamassasin 
- clamav with automatic updates
- packet filter
- roundcube webmail (with sauserprefs plugin)
- dkimproxy (sign out)
- rmspams 

*The admin and account apps forked from the free [mailserv project](https://github.com/mailserv/mailserv).
You get access to the account app via Roundcube (admin button).

## Installation

#### Get git

    export PKG_PATH=http://ftp2.fr.openbsd.org/pub/OpenBSD/5.9/packages/amd64/
    pkg_add git

#### Update the box

    cd /usr/local/sbin
    ftp https://stable.mtier.org/openup
    chmod +x openup
    openup && reboot
    
#### Fetch the project

    cd /var
    git clone https://github.com/wesley974/mailserver
    
#### Install the GUI

>**Don't forget to tune your hosts file and verify your hostname!**

    /var/mailserver/install/install_gui.sh
    /var/mailserver/install/build_db.sh

#### Install the mail system

    /var/mailserver/install/install_system.sh 
    /var/mailserver/install/enable_admin_rc.sh

## USAGE

#### Execute the apps

    /var/mailserver/install/run_gui.sh

#### Set the mailserver administrator

Just browse https://ip_address:4200/getting_started

Then set the email for root messages :

    /var/mailserver/install/sysmail.sh

#### Security, generate checksum (SHA256) for the config files

    /var/mailserver/install/checksum_conf.sh
    
After an update (openup), check for modified config files :

    sha256 -c /var/mailserver/install/SHA256

#### Security, backup config files
	
    /var/mailserver/install/backup_conf.sh

#### The mailserver app

https://ip_address:4200

#### Your webmail

https://ip_address

>*Enjoy!*
