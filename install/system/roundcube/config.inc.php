<?php

/* Local configuration for Roundcube Webmail */

// ----------------------------------
// SQL DATABASE
// ----------------------------------
// Database connection string (DSN) for read+write operations
// Format (compatible with PEAR MDB2): db_provider://user:password@host/database
// Currently supported db_providers: mysql, pgsql, sqlite, mssql or sqlsrv
// For examples see http://pear.php.net/manual/en/package.database.mdb2.intro-dsn.php
// NOTE: for SQLite use absolute path: 'sqlite:////full/path/to/sqlite.db?mode=0646'
$config['db_dsnw'] = 'mysql://webmail:webmail@localhost/webmail';

// log driver:  'syslog' or 'file'.
$config['log_driver'] = 'syslog';

// Syslog facility to use, if using the 'syslog' log driver.
// For possible values see installer or http://php.net/manual/en/function.openlog.php
$config['syslog_facility'] = LOG_LOCAL0;

// Log successful logins to <log_dir>/userlogins or to syslog
$config['log_logins'] = true;

// ----------------------------------
// IMAP
// ----------------------------------
// the mail host chosen to perform the log-in
// leave blank to show a textbox at login, give a list of hosts
// to display a pulldown menu or set one host as string.
// To use SSL/TLS connection, enter hostname with prefix ssl:// or tls://
// Supported replacement variables:
// %n - http hostname ($_SERVER['SERVER_NAME'])
// %d - domain (http hostname without the first part)
// %s - domain name after the '@' from e-mail address provided at login screen
// For example %n = mail.domain.tld, %d = domain.tld
$config['default_host'] = 'localhost';

// IMAP AUTH type (DIGEST-MD5, CRAM-MD5, LOGIN, PLAIN or empty to use
// best server supported one)
$config['imap_auth_type'] = 'plain';

// ----------------------------------
// SMTP
// ----------------------------------
// SMTP server host (for sending mails).
// To use SSL/TLS connection, enter hostname with prefix ssl:// or tls://
// If left blank, the PHP mail() function is used
// Supported replacement variables:
// %h - user's IMAP hostname
// %n - http hostname ($_SERVER['SERVER_NAME'])
// %d - domain (http hostname without the first part)
// %z - IMAP domain (IMAP hostname without the first part)
// For example %n = mail.domain.tld, %d = domain.tld
$config['smtp_server'] = '127.0.0.1';

// SMTP port (default is 25; use 587 for STARTTLS or 465 for the
// deprecated SSL over SMTP (aka SMTPS))
$config['smtp_port'] = 587;

// provide an URL where a user can get support for this Roundcube installation
// PLEASE DO NOT LINK TO THE ROUNDCUBE.NET WEBSITE HERE!
$config['support_url'] = '';

// use this folder to store log files (must be writeable for apache user)
// This is used by the 'file' log driver.
$config['log_dir'] = 'logs/';

// use this folder to store temp files (must be writeable for apache user)
$config['temp_dir'] = 'temp/';

// enforce connections over https
// with this option enabled, all non-secure connections will be redirected.
// set the port for the ssl connection as value of this option if it differs from the default 443
$config['force_https'] = true;

// Forces conversion of logins to lower case.
// 0 - disabled, 1 - only domain part, 2 - domain and local part.
// If users authentication is not case-sensitive this must be enabled.
// After enabling it all user records need to be updated, e.g. with query:
// UPDATE users SET username = LOWER(username);
$config['login_lc'] = 0;

// Session lifetime in minutes
// must be greater than 'keep_alive'/60
$config['session_lifetime'] = 1440;

// this key is used to encrypt the users imap password which is stored
// in the session record (and the client cookie if remember password is enabled).
// please provide a string of exactly 24 chars.
$config['des_key'] = '744c0385d863584ecb28baf2';

# null == default
// mime magic database
$config['mime_magic'] = '/usr/share/misc/magic';

// ----------------------------------
// PLUGINS
// ----------------------------------
// List of active plugins (in plugins/ directory)
$config['plugins'] = array('vcard_attachments', 'sauserprefs', 'password', 'contextmenu', 'emoticons', 'markasjunk2', 'sieverules', 'mobile');

// give this choice of date formats to the user to select from
$config['date_formats'] = array('Y-m-d', 'd-m-Y', 'Y/m/d', 'm/d/Y', 'd/m/Y', 'd.m.Y', 'j.n.Y');

// store spam messages in this mailbox
// NOTE: Use folder names with namespace prefix (INBOX. on Courier-IMAP)
$config['junk_mbox'] = 'Spam';

// Set the spell checking engine. 'googie' is the default. 'pspell' is also available,
// but requires the Pspell extensions. When using Nox Spell Server, also set 'googie' here.
$config['spellcheck_engine'] = 'googie';

// Enables files upload indicator. Requires APC installed and enabled apc.rfc1867 option.
// By default refresh time is set to 1 second. You can set this value to true
// or any integer value indicating number of seconds.
$config['upload_progress'] = true;

// display remote inline images
// 0 - Never, always ask
// 1 - Ask if sender is not in address book
// 2 - Always show inline images
$config['show_images'] = 1;

// compose html formatted messages by default
// 0 - never, 1 - always, 2 - on reply to HTML message only 
$config['htmleditor'] = 2;

// save compose message every 300 seconds (5min)
$config['draft_autosave'] = 60;

// default setting if preview pane is enabled
$config['preview_pane'] = true;

// Clear Trash on logout
$config['logout_purge'] = true;

// Compact INBOX on logout
$config['logout_expunge'] = true;

// If true, after message delete/move, the next message will be displayed
$config['display_next'] = false;

// Default font for composed HTML message.
// Supported values: Andale Mono, Arial, Arial Black, Book Antiqua, Courier New,
// Georgia, Helvetica, Impact, Tahoma, Terminal, Times New Roman, Trebuchet MS, Verdana
$config['default_font'] = '';

// lifetime of message cache
// possible units: s, m, h, d, w
$config['message_cache_lifetime'] = '10d';

// display these folders separately in the mailbox list.
// these folders will also be displayed with localized names
// NOTE: Use folder names with namespace prefix (INBOX. on Courier-IMAP)
$config['default_folders'] = array('INBOX', 'Drafts', 'Sent', 'Junk', 'Trash');

