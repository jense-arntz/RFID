import sqlite3 as sqlite
import os


class reader_db():

    def __init__(self):
        """
        Initiate the Database.
        :return:
        """
        self.setting_file = '/home/RFID/reader_setting.db'
        self.key_table = 'eshow'
        self.setting_table = 'reader_setting'
        self.exist_db()

    def exist_db(self):
        if os.path.isfile('/home/RFID/reader.db'):
            self.db_file = '/home/RFID/reader.db'
            self.con = sqlite.connect(self.db_file)
            self.table_name = 'reader'
            self.cur = self.con.cursor()
        else:
            self.create_db()
            self.db_file = '/home/RFID/reader.db'
            self.con = sqlite.connect(self.db_file)
            self.table_name = 'reader'
            self.cur = self.con.cursor()

    def create_db(self):
        """
        If no database exists, then create database.
        :return:
        """
        db_file = '/home/RFID/reader.db'
        table_name_1 = 'reader'
        fn_1 = 'show_key'
        ft_1 = 'TEXT'
        fn_2 = 'client_key'
        ft_2 = 'TEXT'
        fn_3 = 'reader_name'
        ft_3 = 'TEXT'
        fn_4 = 'mac_address'
        ft_4 = 'TEXT'
        fn_5 = 'antenna'
        ft_5 = 'TEXT'
        fn_6 = 'card_data'
        ft_6 = 'TEXT'
        fn_7 = 'timestamp'
        ft_7 = 'TEXT'
        fn_8 = 'custom_field'
        ft_8 = 'TEXT'

        con = sqlite.connect(db_file)
        c = con.cursor()
        c.execute('CREATE TABLE {tn}({nf_1} {ft_1}, {nf_2} {ft_2}, {nf_3} {ft_3}, {nf_4} {ft_4}, {nf_5} {ft_5}'
                  ', {nf_6} {ft_6}, {nf_7} {ft_7}, {nf_8} {ft_8})'.format(tn=table_name_1,
                                                           nf_1=fn_1, ft_1=ft_1,
                                                           nf_2=fn_2, ft_2=ft_2,
                                                           nf_3=fn_3, ft_3=ft_3,
                                                           nf_4=fn_4, ft_4=ft_4,
                                                           nf_5=fn_5, ft_5=ft_5,
                                                           nf_6=fn_6, ft_6=ft_6,
                                                           nf_7=fn_7, ft_7=ft_7,
                                                           nf_8=fn_8, ft_8=ft_8))

        con.commit()
        con.close()

    def insert_db(self, card_data, timestamp, antenna=None, Custom_data=None):
        """
        Insert data into database.
        :param reg_no:
        :param pro_time:
        :return:
        """
        try:
            self.exist_db()
            data = self.get_setting()
            sql_transaction = 'BEGIN IMMEDIATE'
            self.cur.execute(sql_transaction)
            sql = 'INSERT INTO {table_name}(show_key, client_key, reader_name, mac_address, card_data, ' \
                  'timestamp, antenna, custom_field) VALUES(?,?,?,?,?,?,?,?)'.format(table_name=self.table_name)
            self.cur.execute(sql, (data['show_key'], data['client_key'], data['reader_name'], data['mac_address'],
                                   card_data, timestamp, antenna, Custom_data))
            self.con.commit()

        except Exception as e:
            pass

    def del_db(self):
        """
        Delete data from database.
        :param EPC:
        :return:
        """
        self.exist_db()
        sql = 'DELETE FROM {table_name}'.format(table_name=self.table_name)
        print 'reg_no None'
        self.cur.execute(sql)
        self.con.commit()

    def update_db(self, card_data, timestamp, Name=None):
        """
        Update data in database.
        :param reg_no:
        :param pro_time:
        :return:
        """
        self.exist_db()
        sql = 'UPDATE {table_name} SET timestamp=? WHERE card_data={card_data}'.format(table_name=self.table_name, card_data=card_data)

        self.cur.execute(sql, (timestamp,))

        self.con.commit()

    def sel_db(self):
        """
        Get data from database.
        :return:
        """
        global LENGTH
        # global FLAG
        self.exist_db()
        sql = 'SELECT * FROM {table_name}'.format(table_name=self.table_name)
        result = self.cur.execute(sql)
        data = result.fetchall()
        return data

    def get_setting(self):
        try:
            self.con_setting = sqlite.connect(self.setting_file)
            self.cur_setting = self.con_setting.cursor()
            sql_setting = 'SELECT * FROM {table_name}'.format(table_name=self.setting_table)
            sql_show_key = 'SELECT * FROM {table_name}'.format(table_name=self.key_table)
            setting_data = self.cur_setting.execute(sql_setting).fetchone()
            show_key_data = self.cur_setting.execute(sql_show_key).fetchone()

            return {
                    'reader_name': setting_data[1],
                    'mac_address': setting_data[2],
                    'show_key': show_key_data[1],
                    'client_key': show_key_data[2]
                   }
        except Exception as e:
            return {
                    'reader_name': 'None',
                    'mac_address': 'None',
                    'show_key': 'None',
                    'client_key': 'None'
                   }

db = reader_db()
