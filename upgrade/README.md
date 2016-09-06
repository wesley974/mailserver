# OpenBSD Mailserver - upgrade to 6.0


Boot from the install kernel bsd.rd and choose upgrade.<br>Look at this http://www.openbsd.org/faq/upgrade60.html

Add 'wxallowed' to the /etc/fstab (rw,wxallowed)

Update packages
pkg_add -u

Reboot, you re done.

>*Enjoy!*
