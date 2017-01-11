from crc import *
from const import *


def protocol_packet(TYPE, CMD, DATA=[]):
    LEN = len(DATA) + 5

    payload = [LEN, TYPE, CMD] + DATA
    # crc = crcb(payload)

    # Check Sum for command
    crc = check_sum(payload)

    crc_arr = [crc >> i & 0xff for i in (8, 0)]

    return payload + crc_arr


# System Command (0x00) /// Firmware version (0x00)
def sys_firmware_version():
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x00)

# System Command (0x00) /// Temperature (0x01)
def sys_temperature():
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x01)


# System Command (0x00) /// RF Power ON (0x05)
def sys_rf_power_on():
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x05)


# System Command (0x00) /// Reader status (0x0b)
def sys_reader_status():
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x0b)


# System Command (0x00) /// RF Power Level Control(0x12)
def sys_rf_power_level(power_level):
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x12, power_level)


# System Command (0x00) /// Antenna Select(0x0D)
def sys_antenna_select():
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x0D)


# System Command (0x00) /// Antenna Select(0x1D)
def sys_antenna_rate(antenna_rate):
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x1D, antenna_rate)


# System Command (0x00) /// Antenna status(0x0E)
def sys_antenna_status():
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x0E)


# System Command (0x00) /// Antenna status(0x53)
def sys_antenna_source(enable):
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x53, enable)


# System Command (0x00) /// Antenna switch(0x0F)
def sys_antenna_switch(enable):
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x0F, enable)


# EPC Class 1 Generation 2 Command (0x20) /// Read Single Tag ID (0x00)
def read_single_tag_id():
    return protocol_packet(TYPE_EPC_COMMAND, 0x00)


def sys_configure_antenna(value):
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x88, value)


def sys_antenna_level():
    return protocol_packet(TYPE_SYSTEM_COMMAMD, 0x62)


# EPC Class 1 Generation 2 Command (0x20) /// Read Single Tag ID (0x10).
def read_single_tag_id_timeout(timeout):
    return protocol_packet(TYPE_EPC_COMMAND, 0x10, timeout)
