<h2>INSTALL THE GUI</h2>
<pre><code>
cd /var/mailserver/install
./install_gui.sh # install Admin, Account app
./build_db.sh # create databases
./run_gui.sh # run the Admin & Account app

# The script "kill_gui.sh" is used to stop the GUI.</p>
</code></pre>

<h2>HOW TO USE/TEST THE GUI</h2>
<p>Just browse https://ip_address:4200/getting_started</p>

<h2>INSTALL THE MAIL SYSTEM</h2>
<pre><code>
cd /var/mailserver/install
./install_system.sh # install clamav SpamAssassin postfix dovecot and Roundcube
./enable_admin_rc.sh # add the "Admin" button in Roundcube (Larry, Classic)
</code></pre>
