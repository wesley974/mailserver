# OpenBSD Mailserver - upgrade to 6.1

## Step 1, grab bsd.rd (6.1)
Get and boot from the install kernel bsd.rd (6.1) and choose upgrade.
At the upgrade process, type this at question 'Set name(s)?': -g* -x* +xb*

## Step 2, follow guide (6.0 to 6.1)
Please read following this: http://www.openbsd.org/faq/upgrade61.html
You don't need to run sysmerge here.

## Last step :)

<pre>
<code># Just run:</code>
<code>cd /var/mailserver/upgrade_to_next
<code>upgrade_to_61</code>
</pre>

Reboot, you re done.

>*Enjoy!*
