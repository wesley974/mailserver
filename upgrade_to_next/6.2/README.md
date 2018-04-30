# OpenBSD Mailserver - upgrade to 6.2

## Step 1, grab bsd.rd (6.2)
Get and boot from the install kernel bsd.rd (6.2) and choose upgrade.
At the upgrade process, type this at question 'Set name(s)?': -g* -x* +xb*

## Step 2, follow guide (6.1 to 6.2)
Please read following this: http://www.openbsd.org/faq/upgrade62.html
You don't need to run sysmerge here.

## Last step :)

<pre>
<code># Just run:</code>
<code>cd /var/mailserver/upgrade_to_next/6.2
<code>./bin/upgrade_to_62</code>
</pre>

Reboot, you re done.

>*Enjoy!*

Use mailserver entirely at your own risk. No one will help you.
And if you like the project and if you wish updates, support it adding a star (.).
