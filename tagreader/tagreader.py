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

antenna_level = ''
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


def read_power_level(s, power_level=0x0f):
    # Get the reader setting from reader_setting.db.
    power_antenna_data = get_power_level()
    if power_antenna_data is not False:
        power_level = int(power_antenna_data['power_level'])
    print 'power_level: {}'.format(power_level)
    # Send the Power Level command.
    s.send(bytearray(sys_rf_power_level([power_level])))
    time.sleep(.1)

    ack = s.recv(1).encode('hex')
    # sleep ?
    if ack == ACK_FAIL:
        print('ACK FAIL')
        return False

    return True


def get_power_level():
    try:
        db_setting = sqlite.connect('/home/RFID/reader_setting.db')
        cur = db_setting.cursor()
        sql = 'SELECT * FROM reader_setting'
        result = cur.execute(sql)
        datas = result.fetchall()

        # power level
        for data in datas:
            pwr_level = data[4]
            print {'power_level: {}': pwr_level}
            return {'power_level': pwr_level}
        return False
    except Exception as e:
        print(e)
        return False


def read_antenna_source(s):
    # Send the Antenna Source command.
    s.send(bytearray(sys_antenna_source([0x01])))
    time.sleep(.1)

    ack = s.recv(1).encode('hex')
    # sleep ?
    if ack == ACK_FAIL:
        print('ACK FAIL')
        return False

    return True


def enable_antenna_switch(s):
    s.send(bytearray(sys_antenna_switch([0x01])))
    time.sleep(.1)

    ack = s.recv(1).encode('hex')
    print 'enable_antenna_switch ACK: {}'.format(ack)
    # sleep ?
    if ack == ACK_FAIL:
        print('ACK FAIL')
        return False

    len = int(s.recv(1).encode('hex'), 16)
    print 'read_antenna_switch length: {}'.format(len)
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
    antenna_switch = body[2:]
    print('antenna switch: {}'.format(antenna_switch.encode('hex')))

    return True


def antenna_switch_rate(s):
    s.send(bytearray(sys_antenna_rate([0x05, 0x05])))
    time.sleep(.1)

    ack = s.recv(1).encode('hex')
    # sleep ?
    print 'antenna_switch_rate ACK: {}'.format(ack)
    if ack == ACK_FAIL:
        print('ACK FAIL')
        return False

    return True


def reset_reader(s):
    s.send(bytearray(sys_reset()))
    time.sleep(.1)

    ack = s.recv(1).encode('hex')
    # sleep ?
    print 'antenna_reset ACK: {}'.format(ack)
    if ack == ACK_FAIL:
        print('ACK FAIL')
        return False

    return True
# def reader_antenna_select(s, antenna):
#     # Get the reader setting from reader_setting.db.
#
#     antenna_level = int(antenna)
#     # Send the Power Level command.
#     s.send(bytearray(sys_antenna_select([antenna_level])))
#     time.sleep(.1)
#
#     ack = s.recv(1).encode('hex')
#     # sleep ?
#     if ack == ACK_FAIL:
#         print('ACK FAIL')
#         return False
#
#     len = int(s.recv(1).encode('hex'), 16)
#     print 'read_antenna_select length: {}'.format(len)
#     if len > 0:
#         body = s.recv(len)
#     else:
#         print('LEN = 0')
#         return False
#
#     cmd_type = body[0].encode('hex')
#     cmd_code = body[1].encode('hex')
#
#     print('command type: {}'.format(cmd_type))
#     print('command code: {}'.format(cmd_code))
#
#     # check command type and command code
#     antenna_status = body[2]
#     print('antenna_status: {}'.format(antenna_status.encode('hex')))
#     if antenna_status.encode('hex') == 0x00:
#         print ("antenna select successful.")
#         return True
#     elif antenna_status.encode('hex') == 0x10:
#         print ("antenna select failed.")
#         return False
#     return True


def start_loop(s, time_interval=5):
    print 'start_loop __enter__'

    global tag_reader_thread_event
    s.send(bytearray(read_single_tag_id()))
    # time.sleep(.1)

    ack = int(s.recv(1).encode('hex'), 16)
    print 'ack: {}'.format(ack)

    if ack != ACK_SUCCESS:
        print 'ack no success'
        return

    while tag_reader_thread_event.isSet():
        # Send the read single tag id command.
        if tag_reader_thread_event.isSet() == False:
            break
        print "start_loop ack success"
        plen = int(s.recv(1).encode('hex'), 16)
        print 'start_loop length: {}'.format(plen)

        len_count = 0
        body = ''
        if plen > 0:

            while len_count < plen - 1:
                data = s.recv(1)
                body += data
                len_count += 1

            print 'body: {}'.format(body)

        else:
            print('LEN = 0')
            break

        cmd_type = body[0].encode('hex')
        cmd_code = body[1].encode('hex')

        print('command type: {}'.format(cmd_type))
        print('command code: {}'.format(cmd_code))

        # check command type and command code
        response = body[2:]
        print 'response: {}'.format(response)
        print('protocol code: {}'.format(response[0].encode('hex'), response[1].encode('hex')))
        print('ePC number: {}'.format(response[2:-5].encode('hex')))
        print('antenna number: {}'.format(response[-3].encode('hex')))

        # save EPC number and time into db.
        # if not save_db(response[2:-4].encode('hex')):
        #     print('Already exists EPC Number in db. Updating time...')
        #     time.sleep(time_interval)
        #     continue

        save_db(response[2:-5].encode('hex'), response[-3].encode('hex'))

        # time.sleep(int(time_interval))

    print "exit socket."
    s.send(bytearray([STOP_COMMAND]))


def save_db(card_data, antenna_number):
    # timestamp = time.strftime('%l:%M%p %Z on %b %d, %Y')
    timestamp = str(datetime.now())

    # Save the epc and time to db.
    db1 = reader_db()
    db1.insert_db(card_data, timestamp, antenna_number)

    print "Inserted EPC: {}, epc_time: {}".format(card_data, timestamp)
    # return True


def reader_power_on(s):
    # Send the Antenna Source command.
    s.send(bytearray(sys_rf_power_on()))
    time.sleep(.1)

    ack = s.recv(1).encode('hex')
    # sleep ?
    print 'sys RF Power on: {}'.format(ack)
    if ack == ACK_FAIL:
        print('ACK FAIL')
        return False

    return True


def reader_portal_ids(s):
    # read portal ids
    print 'start_loop __enter__'

    global tag_reader_thread_event
    s.send(bytearray(portal_ids(0x00, 0x00)))
    ack = int(s.recv(1).encode('hex'), 16)
    print 'ack: {}'.format(ack)

    if ack != ACK_SUCCESS:
        print 'ack no success'
        return

    while tag_reader_thread_event.isSet():
        # Send the read single tag id command.
        if tag_reader_thread_event.isSet() == False:
            break
        print "start_loop ack success"
        plen = int(s.recv(1).encode('hex'), 16)
        print 'start_loop length: {}'.format(plen)

        len_count = 0
        body = ''
        if plen > 0:

            while len_count < plen - 1:
                data = s.recv(1)
                body += data
                len_count += 1

            print 'body: {}'.format(body)

        else:
            print('LEN = 0')
            break

        cmd_type = body[0].encode('hex')
        cmd_code = body[1].encode('hex')

        print('command type: {}'.format(cmd_type))
        print('command code: {}'.format(cmd_code))

        # check command type and command code
        response = body[2:]
        print 'response: {}'.format(response)
        print('protocol code: {}'.format(response[0].encode('hex'), response[1].encode('hex')))
        print('ePC number: {}'.format(response[2:-5].encode('hex')))
        print('antenna number: {}'.format(response[-3].encode('hex')))

        # save EPC number and time into db.
        # if not save_db(response[2:-4].encode('hex')):
        #     print('Already exists EPC Number in db. Updating time...')
        #     time.sleep(time_interval)
        #     continue

        save_db(response[2:-5].encode('hex'), response[-3].encode('hex'))

        # time.sleep(int(time_interval))

    print "exit socket."
    s.send(bytearray([STOP_COMMAND]))


def main(timer):
    global s
    # Connect to MPR-2010 via Socket.
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((TCP_IP, TCP_PORT))

    # send STOP command.
    s.send(bytearray([STOP_COMMAND]))

    time.sleep(.1)

    # # read out dummy data
    receive_dummy_data(s)

    if not read_firmware_version(s):
        print('failed to read the reader\'s status.')
        s.close()
        return

    # read reader's status
    if not read_reader_status(s):
        print('failed to read the reader\'s status.')
        s.close()
        return
    time.sleep(.5)

    # set antenna source
    if not read_antenna_source(s):
        print('failed to read the reader\'s status.')
        s.close()
        return
    time.sleep(1)

    if not reader_power_on(s):
        print('failed to read the reader\'s status.')
        s.close()
        return
    time.sleep(1)

    # Enable Antenna Switch
    if not enable_antenna_switch(s):
        print('failed to read the reader\'s status.')
        s.close()
        return
    time.sleep(1)

    # control reader power level
    if not read_power_level(s):
        print('failed to read the reader\'s status.')
        s.close()
        return
    time.sleep(.5)

    # start_loop(s, time_interval=timer)
    reader_portal_ids(s)
    print 'end'
    s.close()


# Start thread
def start_tag_reader_thread(timer):
    global tag_reader_thread
    global tag_reader_thread_event

    tag_reader_thread_event = threading.Event()
    tag_reader_thread_event.set()
    # tag_reader_thread_event = True

    tag_reader_thread = threading.Thread(target=main, args=(timer,))
    tag_reader_thread.start()


# Stop thread
def stop_tag_reader_thread():
    global tag_reader_thread
    global tag_reader_thread_event

    if tag_reader_thread is None or tag_reader_thread_event is None:
        print "return"
        return
    s.send(bytearray([STOP_COMMAND]))
    tag_reader_thread_event.clear()
    print "clear"
    tag_reader_thread.join()
    print "join"

    tag_reader_thread = None
    tag_reader_thread_event = None
    print "tag_thread ending"


if __name__ == '__main__':

    main(5)
