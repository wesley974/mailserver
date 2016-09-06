# OpenBSD Mailserver - upgrade to 6.0


Boot from the install kernel bsd.rd and choose upgrade.<br>Look at this http://www.openbsd.org/faq/upgrade60.html

Edit the file /etc/fstab, add 'wxallowed' (rw,wxallowed)
<pre>
# Update packages
<code>pkg_add -u</code>

# Update /etc/newsyslog, /etc/login.conf and /etc/mail/aliases
<code>sh /var/mailserver/upgrade/bin/upgrade.sh</code>

# Get Mtier updates
/usr/local/sbin/openup
</pre>
Reboot, you re done.

>*Enjoy!*
