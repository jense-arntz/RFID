#!/bin/bash

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

export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules
#export SERVER_PORT=8081
#export SERVER_IFACE='192.168.1.111'

case "$1" in
  start)
  exec forever --sourceDir=/home/RFID/Code -p /home/forever start server.js
  ;;

  stop)
  exec forever stop --sourceDir=/home/RFID/Code server.js
  ;;
esac

exit 0