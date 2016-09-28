## The scripts

### build_db.sh
>Create only the mail database.

### enable_admin_rc.sh
>Enable the 'Admin' button for the both Roundcube themes (larry and classic).

### install_gui.sh
>Install the mailserver administration GUI and the domain admin app.

### install_system.sh
>Install the system (postfix, dovecot, dkimproxy, clamav, spamassassin, roundcube).

### kill_gui.sh
>Stop the mailserver administration GUI and the domain admin app.

### reset_db.sh
>Reset all mysql databases (mail, spamcontrol, and webmail).

### run_gui.sh
>Execute the mailserver administration GUI and the domain admin app.

### sysmail.sh
>Send the system mail to the first administrator.

### checksum_conf.sh
>Generate SHA256 file, that contains the config files checksum.

### backup_conf.sh
>Backup all system config files.

### enable_dkim.sh
>Enable dkim for all domains.

### export_app_db.sh
> Export mail database, and a specification file for mail folder. The files are app.sql.gz and special.var_mailserver_mail located in the backup folder.

### import_app_db.sh
> Import mail database, and populate the mail folder.
