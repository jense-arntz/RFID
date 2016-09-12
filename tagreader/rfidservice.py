#!/usr/bin/python

import json
import httplib
import sys
import cgi
import BaseHTTPServer
import signal
from SocketServer import ThreadingMixIn
from urlparse import urlparse, parse_qs
import logging
from os import fork

# from test import *
from tagreader import *
from db import *
from subprocess import Popen

HOST_NAME = '127.0.0.1'
PORT_NUMBER = 8080


class HttpHandler(BaseHTTPServer.BaseHTTPRequestHandler):
    ENCODING = "UTF-8"
    server_version = "RFIDSERVER/0.1"
    protocol_version = "HTTP/1.1"

    def _send_data(self, code, mime, data):
        assert type(data) == type(b"")
        self.send_response(code)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Type", "{0}; charset={1}".format(mime, self.ENCODING))
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, message):
        data = message.encode(self.ENCODING)
        self._send_data(httplib.OK, "application/json", data)

    def _send_html(self, message):
        data = message.encode(self.ENCODING)
        self._send_data(httplib.OK, "text/html", data)

    def _send_text(self, message):
        data = message.encode(self.ENCODING)
        self._send_data(httplib.OK, "text/plain", data)

    def _send_error(self, code, message):
        data = message.encode(self.ENCODING)
        self._send_data(code, "text/html", data)

    def _get_json(self, data):
        return json.dumps(data)

    def index(self, postvars):
        msg = ''
        self._send_html(msg)

    def terminate_server(self):
        print("in terminate_server")
        sys.exit(0)

    def error(self, message):
        self._send_error(httplib.NOT_FOUND, message)

    def no_page(self, postvars):
        self.error(u"<p>NO SUCH PAGE</p>")

    # Receive start request from node js server..
    def do_start(self, postvars):
        print('do_start')
        print postvars
        timer = postvars['timer'][0]
        print 'timer: {}'.format(timer)
        try:
            militimer = float(timer)/1000
            start_tag_reader_thread(militimer)
            self._send_json(json.dumps({'result': 0, 'message': 'ok'}))
        # Something else happened.
        except Exception, e:
            print(e)
            self._send_json(json.dumps({'result': 0, 'message': 'error'}))
        except IOError as e:
            print(e)
            self._send_json(json.dumps({'result': 0, 'message': 'error'}))

    # Receive stop request from node js server.
    def do_stop(self, postvars):
        print('do_stop')
        print postvars

        try:
            stop_tag_reader_thread()
            self._send_json(json.dumps({'result': 0, 'message': 'ok'}))
        # Something else happened.
        except Exception, e:
            print(e)
            self._send_json(json.dumps({'result': 0, 'message': 'error'}))
        except IOError as e:
            print(e)
            self._send_json(json.dumps({'result': 0, 'message': 'error'}))

    # Run when request method is Get.
    def do_GET(self):
        try:
            GETMAP = {
                "/start": self.do_start,
                "/stop": self.do_stop
            }

            parsed = urlparse(self.path)
            path = parsed.path
            handler = GETMAP.get(path, self.no_page)

            query = parsed.query
            query_param = parse_qs(query)
            handler(query_param)

        except Exception as e:
            print(e)

    # Run when request Method is Post.
    def do_POST(self):
        try:
            POSTMAP = {
                "/start": self.do_start,
                "/stop": self.do_stop
            }

            parsed = urlparse(self.path)
            path = parsed.path
            handler = POSTMAP.get(path, self.no_page)

            ctype, pdict = cgi.parse_header(self.headers.getheader('content-type'))
            # when content type is 'multipart/form-data'.
            if ctype == 'multipart/form-data':
                postvars = cgi.parse_multipart(self.rfile, pdict)
                print postvars

            # when content type is 'application/x-www-form-urlencoded'.
            elif ctype == 'application/x-www-form-urlencoded':
                length = int(self.headers.getheader('content-length'))
                postvars = cgi.parse_qs(self.rfile.read(length), keep_blank_values=1)

            # when content type is 'application/json'.
            elif ctype == 'application/json':
                print 'application/json'
                content_len = self.headers.getheader('content-length')
                size = int(''.join(content_len))
                data = self.rfile.read(size)
                postvars = json.loads(data)
                print 'postvars'
            # when no conditions match.
            else:
                postvars = {}

            handler(postvars)

        except IOError as e:
            print(e)


class HttpServer(ThreadingMixIn, BaseHTTPServer.HTTPServer):
    def __init__(self, host, port):
        BaseHTTPServer.HTTPServer.__init__(self, (host, port), HttpHandler)

    def __enter__(self):
        print("__enter__")
        return self

    def __exit__(self):
        print("__exit__")
        return False


def install_signal_handlers():
    def signal_term_handler(signal, frame):
        print("terminated by SIGTERM")
        sys.exit(1)

    signal.signal(signal.SIGTERM, signal_term_handler)



def main():
    install_signal_handlers()
    try:
        with HttpServer(HOST_NAME, PORT_NUMBER) as http:
            print('Starting server, use <Ctrl-C> to stop')
            http.serve_forever()
    except KeyboardInterrupt as e:
        print("terminated by CTRL-C")
    except Exception as e:
        print(e)


if __name__ == "__main__":
    main()
