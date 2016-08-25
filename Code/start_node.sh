#!/bin/bash

export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules


case "$1" in
  start)
  exec forever --sourceDir=/home/RFID/Code -p /var/run/forever start server.js
  ;;

  stop)
  exec forever stop --sourceDir=/home/RFID/Code server.js
  ;;
*)
  echo "Usage: /etc/init.d/start_node {start|stop}"
  exit 1
  ;;
esac

exit 0