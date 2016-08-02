#!/bin/bash

export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules
#export SERVER_PORT=8081
#export SERVER_IFACE='192.168.1.111'

case "$1" in
  start)
  exec forever --sourceDir=/home/RFID/Code -p /var/run/forever start server.js
  ;;

  stop)
  exec forever stop --sourceDir=/home/RFID/Code server.js
  ;;
esac

exit 0