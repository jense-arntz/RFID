# Setting node.js environment in raspberry pi

### install node.js and npm

    wget https://nodejs.org/dist/v4.0.0/node-v4.0.0-linux-armv7l.tar.gz 
    tar -xvf node-v4.0.0-linux-armv7l.tar.gz 
    cd node-v4.0.0-linux-armv7l
    
    - Copy to /usr/local

    sudo cp -R * /usr/local/
    
    apt-get install npm
    
### install express framework.

    npm install -g express 
    npm install -g body-parser 
    npm install -g cookie-parser
    npm install mkdirp
    npm install jsftp
    npm install -g sqlite3
    npm install -g forever
    npm install -g multer --save
    npm install -g node-gyp
    npm install -g npm@latest
    apt-get install gcc
    apt-get install g++
    
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
    
   