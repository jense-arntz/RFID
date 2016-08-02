	
For running Midori on startup, take a look at this tutorial. For DIY solutions, read on.

You can add your script executable command to the bottom of .bashrc that will run your script every time you log in.

### Make sure you are in the pi folder:
    $ cd ~
### Create a file and write a script to run in the file:
    $ sudo nano superscript
    Save and exit: Ctrl+X, Y, Enter
### Open up .bashrc for configuration:
    $ sudo nano .bashrc
    Scroll down to the bottom and add the line: ./superscript
    Save and exit: Ctrl+X, Y, Enter
### If you are looking for a solution that works on bootup to the console, take a look at this link. Basic rundown:

### Create a file for your startup script, write your script in the file and convert to unix file using dos2unix command. 
    - install doc2unix
    $ apt-get install tofrodos
    $ apt-get install dos2unix
    - convert to unix file.
    $ dos2unix startup.sh
    $ sudo nano /etc/init.d/startup.sh
    %Save and exit: Ctrl+X, Y, Enter%
    
    - Make the script executable:
    $ sudo chmod 755 /etc/init.d/startup.sh
    
    - Register script to be run at startup:
    $ sudo update-rc.d startup.sh defaults