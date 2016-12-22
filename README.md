# Setting node.js environment in raspberry pi

# Raspberry pi 2 to install nodejs.
### install node.js and npm

    wget https://nodejs.org/dist/v4.0.0/node-v4.0.0-linux-armv7l.tar.gz 
    tar -xvf node-v4.0.0-linux-armv7l.tar.gz 
    cd node-v4.0.0-linux-armv7l
    
    - Copy to /usr/local

    sudo cp -R * /usr/local/
    
    apt-get install npm
    apt-get install libkrb5-dev
    apt-get install gcc
    apt-get install g++
    
### version 4.4.5
    wget https://nodejs.org/dist/v4.4.5/node-v4.4.5-linux-armv6l.tar.gz
    tar -xvf node-v4.4.5-linux-armv6l.tar.gz
    cd node-v4.4.5-linux-armv6l
    sudo cp -R * /usr/local/
    sudo reboot
### install express framework.

    npm install -g express 
    npm install request
    npm install multiparty
    npm install form-data
    npm install sleep
    npm install archiver
    npm install -g body-parser 
    npm install -g cookie-parser
    npm install mkdirp
    npm install jsftp
    npm install -g sqlite3
    npm install -g forever
    npm install -g multer --save
    npm install -g node-gyp
    npm install -g npm@latest
    npm install async --save
    
    
## Set the node js server running at start up.    
### install packages for startup.
    
   - First, we’ll want to install forever on the server. Run the following command to take care of that:

     sudo npm install -g forever
   - Once you’ve got forever installed, it’s a good idea to have it throw pid files and log files somewhere. I threw a directory into /var/run for just this purpose (although I’m not sure if this is technically the best place for such a thing):
    
     sudo mkdir /var/run/forever
    
    
### Debian Service
    - Now for the fun part! First, create yourself an empty init script, substituting the word SERVICE for the name you want to use for the service:

    sudo touch /etc/init.d/start_node.sh
    sudo chmod a+x /etc/init.d/start_node.sh
    sudo update-rc.d start_node.sh defaults

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
    
    
# on Raspberry pi 3 to install nodejs.
###I installed node.js using the second method in the question today, worked just fine. I have Raspbian Jessie on a Raspberry 3.

    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
    sudo apt-get install -y nodejs 
    sudo apt-get install -y build-essential