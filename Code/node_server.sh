#!/bin/bash
# /etc/init.d/node_server.sh

### BEGIN INIT INFO
# Provides:          node_server
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Example initscript
# Description:       This file should be used to construct scripts to be
#                    placed in /etc/init.d.
### END INIT INFO

# Carry out specific functions when asked to by the system
case "$1" in
   start)
    echo "Starting node server"
    # run application you want to start
    #node /home/pi/test.js > /home/pi/test.log
    /usr/local/lib/node_modules /home/RFID/Code/server.js >> /home/RFID/Code/test.log
   ;;
   stop)
    echo "Stopping node server"
    # kill application you want to stop
    killall -9 node
    # Not a great approach for running
    # multiple node instances
    ;;
  *)
    echo "Usage: /etc/init.d/node_server {start|stop}"
    exit 1
    ;;
esac

exit 0