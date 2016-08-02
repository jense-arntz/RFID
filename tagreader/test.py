from protocol import *
from const import *
from db import *

from datetime import datetime
import socket
import select
import time
import threading

ack_flag = False

# Tag reader Thread.
tag_reader_thread = None
tag_reader_thread_event = None
# Socket
s = None


def print_with_timestamp(msg):
    print '{} {}'.format(time.time(), msg)


def send_stop(s):
    s.send(bytearray([STOP_COMMAND]))
    print_with_timestamp('send second STOP')

    # read out dummy data
    if not receive_stop_ack(s):
        s.close()
        return


def receive_stop_ack(s):
    inputready, outputready, exceptready = select.select([s], [], [], .1)
    if s in inputready:
        ack_of_stop = s.recv(3)
        print_with_timestamp('ACK: {}'.format(ack_of_stop))
        if len(ack_of_stop) == '':
            print('none ack of STOP')
            return False

        if bytearray(ack_of_stop) != [0x00, 0xFF, 0x00]:
            print('invalid ack of STOP')
            return False

    return True


def receive_dummy_data(s):
    # first send STOP command
    s.send(bytearray([STOP_COMMAND]))
    print_with_timestamp('send first STOP')
    time.sleep(0.1)

    buf = ''
    count = 0
    finish = False
    while not finish:
        inputready, outputready, exceptready = select.select([s], [], [], .1)
        if not s in inputready:
            break

        data = s.recv(BUFFER_SIZE)
        print_with_timestamp('receive_dummy_data: {}'.format(data.encode('hex')))

        if data == '':
            break

        # parse packet
        buf += data
        while len(buf) > 0:
            print('buf[{}]: {}'.format(len(buf), buf.encode('hex')))
            plen = int(buf[0].encode('hex'), 16)
            print('len: {}'.format(plen))
            if plen == 0:
                print('last packet')
                finish = True
                break
            else:
                body = buf[1:plen-1]
                cmd_type = body[0]
                cmd_code = body[1]
                pcrc = body[-1:]

                print('command type: {}'.format(cmd_type.encode('hex')))
                print('command code: {}'.format(cmd_code.encode('hex')))

                # check command type and command code
                response = body[2:-1]
                print('response: {}'.format(response.encode('hex')))
                print('crc: {}'.format(pcrc.encode('hex')))

                buf = buf[plen:]

    print_with_timestamp('read out done')


def read_reader_status(s):
    print('read_reader_status __enter__')

    # Send the reader status.
    s.send(bytearray(sys_reader_status()))
    time.sleep(.1)

    buf = ''
    finish = False
    while True:
        inputready, outputready, exceptready = select.select([s], [], [], .1)
        if not s in inputready:
            break

        data = s.recv(BUFFER_SIZE)
        buf += data

    if len(buf) == 0:
        print 'no response in 100ms'
        return False

    print 'read_reader_status buf: {}'.format(buf.encode('hex'))

    ack = buf[0]
    if ack == ACK_FAIL:
        print('ACK FAIL')
        return False

    plen = int(buf[1].encode('hex'), 16)

    print 'read_reader_status length: {}'.format(plen)
    if plen > 0:
        body = buf[2:]
    else:
        print('LEN = 0')
        return False

    cmd_type = body[0].encode('hex')
    cmd_code = body[1].encode('hex')

    print('command type: {}'.format(cmd_type))
    print('command code: {}'.format(cmd_code))

    # check command type and command code
    status = body[1:]
    print('rf_power: {}'.format(status[1].encode('hex')))
    print('protocol_data_rate: {}'.format(status[2].encode('hex')))
    print('region_code: {}'.format(status[3].encode('hex')))
    print('frequency_index_number: {}'.format(status[4].encode('hex')))
    print('frequency_hopping_status: {}'.format(status[5].encode('hex')))
    print('iso_18000_CH_I: {}'.format(status[6].encode('hex')))
    print('iso_18000_CH_Q: {}'.format(status[7].encode('hex')))
    print('em_CH_I: {}'.format(status[12].encode('hex')))
    print('em_CH_Q: {}'.format(status[13].encode('hex')))
    print('rf_power_level: {}'.format(status[16].encode('hex')))
    print('write_rf_power_level: {}'.format(status[17].encode('hex')))
    print('epc_c1_gen_2_ch_I: {}'.format(status[18].encode('hex')))
    print('epc_c1_gen_2_ch_Q: {}'.format(status[19].encode('hex')))
    print('system_flag: {}'.format(status[20].encode('hex')))

    return True


def read_firmware_version(s):

    # Send the firmware version command.
    s.send(bytearray(sys_firmware_version()))
    time.sleep(.1)

    ack = s.recv(1).encode('hex')
    # sleep ?
    if ack == ACK_FAIL:
        print('ACK FAIL')
        return False

    len = int(s.recv(1).encode('hex'), 16)
    print 'read_firmware_version length: {}'.format(len)
    if len > 0:
        body = s.recv(len)
    else:
        print('LEN = 0')
        return False

    cmd_type = body[0].encode('hex')
    cmd_code = body[1].encode('hex')

    print('command type: {}'.format(cmd_type))
    print('command code: {}'.format(cmd_code))

    # check command type and command code
    firmware_version = body[1:]
    print('firmware version: {}'.format(firmware_version.encode('hex')))

    return True


def reader_power_level(s, power_level=[0x0f]):
    # Send the Power Level command.
    s.send(bytearray(sys_rf_power_level(power_level)))
    time.sleep(.1)

    ack = s.recv(1).encode('hex')
    # sleep ?
    if ack == ACK_FAIL:
        print('ACK FAIL')
        return False

    return True


def start_loop(time_interval=5):
    print 'start_loop __enter__'

    print "start_loop ack success"

    while tag_reader_thread_event.isSet():
        db1 = reader_db()
        db1.insert_db('aaaa', '12')
        print 'aaaaa'
        time.sleep(time_interval)


def main(timer):
    # ready to start
    print 'timer: {}'.format(timer)
    start_loop()


# Start thread
def start_tag_reader_thread(timer):
    global tag_reader_thread
    global tag_reader_thread_event

    tag_reader_thread_event = threading.Event()
    tag_reader_thread_event.set()
    # tag_reader_thread_event = True

    tag_reader_thread = threading.Thread(target=main, args=(timer))
    tag_reader_thread.start()


# Stop thread
def stop_tag_reader_thread():
    global tag_reader_thread
    global tag_reader_thread_event

    if tag_reader_thread is None or tag_reader_thread_event is None:
        print "return"
        return

    tag_reader_thread_event.clear()
    print "clear"
    tag_reader_thread.join()
    print "join"
    tag_reader_thread = None
    tag_reader_thread_event = None
    print "tag_thread ending"



