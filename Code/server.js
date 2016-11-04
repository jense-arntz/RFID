/**
 * Created by Jense Arntz on 7/10/2016.
 */

// Require express framework.
var express = require('express');
var http = require('http');
var request = require('request');
var bodyParser = require('body-parser');
var multiparty = require('multiparty');
var formdata = require('form-data');
var sleep = require('sleep');
var archiver = require('archiver');
var zipArchive = archiver('zip');
var dns = require('dns');
var app = express();

// ============== Define the static directives.===================//
app.use('/public', express.static('/home/RFID/Code/public'));
// app.use('/public', express.static('/home/pi/rfid/Code/public'));

// =============== parse application/json ========================//
app.use(bodyParser.urlencoded({extended: false}));
// =============== parse application/json ========================//
app.use(bodyParser.json());


// =============== Create database if no exists. ==================//
var fs = require("fs");
var file = "/home/RFID/reader_setting.db";
var file_streaming = "/home/RFID/reader.db";
var clock_file = "/home/RFID/clock.txt";
// var file = "/home/pi/rfid/reader_setting.db";
// var file_streaming = "/home/pi/rfid/reader.db";
var exists = fs.existsSync(file);
var exists_streaming_db = fs.existsSync(file_streaming);
var sqlite3 = require("sqlite3").verbose();

var connection_flag = true;
var eshow_flag = '';
var eshow_key = '';
var client_key = '';
var file_path = '';
var mac_addr = '';
var interval;
var clock;
var time_interval = 20000;
var clock_interval = 5000;
var srcDirectory = '/home/RFID/';
var reader_name = '';
var outputpath = '';
var timerate_status = false;
var start_status = false;
var syncon_status = false;

// ========================= Pages ========================//

// index.html
app.get('/', function (req, res) {
    res.sendFile(__dirname + "/" + "dashboard.html");
});

//dashboard.html
app.get('/dashboard.html', function (req, res) {
    res.sendFile(__dirname + "/" + "dashboard.html");
});

//index.html
app.get('/index.html', function (req, res) {
    res.sendFile(__dirname + "/" + "index.html");
});

// live_data.html
app.get('/live_data.html', function (req, res) {
    res.sendFile(__dirname + "/" + "live_data.html");
});

// settings.html
app.get('/settings.html', function (req, res) {
    res.sendFile(__dirname + "/" + "settings.html");
});

//list.html
app.get('/list.html', function (req, res) {
    res.sendFile(__dirname + "/" + "list.html");
});


// ======================= API(List, Add, Delete, Update) ================================ //
app.get('/api/status/', function (req, res) {
   var data = [];
    data.push({startstatus: start_status, timerate: timerate_status, syncon: syncon_status});
    res.set('Content-Type', 'application/json');
    res.send(data);
});
// ======================= Check status =================================== //
// ========================= Load the eshow id ============================
app.get('/api/id/', function (req, res) {
    var db_id = new sqlite3.Database(file);

    var posts = [];
    db_id.serialize(function () {
        db_id.each("SELECT * FROM eshow", function (err, row) {
            posts.push({eshow_id: row.show_key, client_key: row.client_key});
            console.log(row.show_key, row.client_key);
            eshow_flag = row.show_key;
            eshow_key = row.client_key;
        }, function () {
            // All done fetching records, render response
            res.set('Content-Type', 'application/json');
            res.send(posts);
        });
    });
});


// ========================= Create/Edit eshow id===========================
app.post('/api/id/', function (req, res) {
    var db_id = new sqlite3.Database(file);
    if (eshow_flag == '' && client_key == '') {
        db_id.run("INSERT into eshow (show_key) VALUES (?)",
            [req.body.eshow_id]);
        eshow_flag = req.body.eshow_id;
        console.log('Insert Eshow ID Success!');
        data = 'Insert Eshow key Success!';
    }
    else {
        db_id.run("UPDATE eshow set show_key=? where id=1",
            [req.body.eshow_id]);
        console.log('Edit Eshow ID Success!');
        data = 'Update Eshow key Success!';
    }
    res.send(data);
});

// ========================== Create/Edit client_key =======================
app.post('/api/key/', function (req, res) {
    var db_id = new sqlite3.Database(file);
    if (eshow_flag == '' && client_key == '') {
        db_id.run("INSERT into eshow (client_key) VALUES (?)",
            [req.body.client_key]);
        console.log('Insert Client Key Success!');
        data = 'Insert Client Key Success!';
    }
    else {
        db_id.run("UPDATE eshow set client_key=? where id=1",
            [req.body.client_key]);
        console.log(req.body.client_key);
        console.log('Edit Client Key Success!');
        data = 'Update Client Key Success!';
    }
    res.send(data);
});

// ==================== Load the device list===================================
app.get('/api/device/list/', function (req, res) {
    var db = new sqlite3.Database(file);

    var posts = [];
    db.serialize(function () {
        db.each("SELECT * FROM reader_setting", function (err, row) {
            posts.push({
                name: row.reader_name,
                mac_address: row.mac_address,
                address: row.ip_address,
                power: row.power_level
            });
            console.log(row.reader_name, row.mac_address, row.ip_address, row.power_level);
            mac_addr = row.mac_address;
            reader_name = row.reader_name;
        }, function () {
            // All done fetching records, render response
            res.set('Content-Type', 'application/json');
            res.send(posts);
        });
    });
});

// ==================== Load the File list===================================
app.get('/api/device/files/', function (req, res) {
    var db = new sqlite3.Database(file);

    var posts = [];
    db.serialize(function () {
        db.each("SELECT * FROM file", function (err, row) {
            posts.push({
                file_name: row.file_name,
                file_size: row.file_size,
                date: row.date
            });
            console.log(row.file_name, row.file_size, row.date);

        }, function () {

            res.set('Content-Type', 'application/json');
            res.send(posts);
        });
    });
});


// ====================Add the device to db.==================================
app.post('/api/add/', function (req, res) {
    console.log("Got a Add request for the homepage");

    try {
        console.log(req.body.name, req.body.mac_address, req.body.address, req.body.power);
        mac_addr = req.body.mac_address;
        if (req.body.power > 255) {
            res.send('Power level value must be lower than 255.');
        }
        else {
            var db = new sqlite3.Database(file);

            db.run("INSERT into reader_setting (reader_name, mac_address, ip_address, power_level) VALUES (?, ?, ?, ?)",
                [req.body.name, req.body.mac_address, req.body.address, req.body.power]);

            console.log('Insert data Success!');
            res.send('Added the Device to List.');
        }

    }
    catch (e) {
        console.log('\r\n', e);
        res.send(e);
    }
});

// ====================Update the device settings to db.======================
app.post('/api/update/', function (req, res) {
    console.log("Got a Update request for the homepage");
    try {
        console.log(req.body.name, req.body.mac_address, req.body.address, req.body.power);
        if (req.body.power > 255) {
            res.send('Power level value must be lower than 255.');
        }
        else {
            var db = new sqlite3.Database(file);

            db.run("UPDATE reader_setting set reader_name=?, ip_address=?, power_level=? where mac_address=?",
                [req.body.name, req.body.address, req.body.power, req.body.mac_address]);
            reader_name = req.body.name;
            console.log('Update data Success!');
            res.send('Updated the Device Setting.');
        }
    }
    catch (e) {
        console.log('\r\n', e);
        res.send(e);
    }
});


// ==============Delete the device from db.=========================
app.post('/api/delete/', function (req, res) {
    console.log("Got a Delete request for the homepage");
    try {
        console.log(req.body.address);

        var db = new sqlite3.Database(file);

        db.run("Delete from reader_setting where mac_address=?",
            [req.body.address]);
        reader_name = '';
        mac_addr = '';

        console.log('Delete data Success!');
        res.send('Deleted the Devices From List.');
    }
    catch (e) {
        console.log('\r\n', e);
        res.send(e);
    }
});

// ========================== Create/Edit client_key =======================
app.get('/api/endshow/', function (req, res) {
    get_show_key(function handleResult(err, result) {
        if (err) {
            console.log('Get the show key error.');
            res.send('No show key error');
        }
        eshow_flag = result;
        console.log(eshow_flag);
    });

    var data = '';
    if (eshow_flag == '') {
        console.log('Show Key Empty!');
        data = 'Please Insert Show Key';
    }
    else {
        var timeStamp = (new Date).toISOString().replace(/z/gi, '').trim();
        var folderpath = srcDirectory + eshow_flag;
        outputpath = srcDirectory + eshow_flag + ':' + timeStamp + '.zip';
        // make eshow dir.
        if (!fs.existsSync(folderpath)) {
            data = 'No Files exist!!!'
        }
        else {
            var string = 'Name: ' + reader_name + '\n' + 'Mac address: ' + mac_addr;
            console.log(string);

            fs.writeFile(folderpath + '/info.txt', string, function (err) {
                if (err) console.log(err);
                console.log('successful.');
            });
            console.log(folderpath);

            var output = fs.createWriteStream(outputpath);

            output.on('close', function () {
                console.log('done with the zip', outputpath);
            });
            console.log('1');
            zipArchive.pipe(output);
            console.log('2');
            zipArchive.bulk([
                {src: ['**/*'], cwd: folderpath, expand: true}
            ]);
            console.log('3');
            zipArchive.finalize(function (err, bytes) {

                if (err) {
                    throw err;
                }

                console.log('done:', base, bytes);
                send_zip_aws(outputpath);

            });

            data = 'zip archive is sent to AWS successfully.'
        }

    }
    res.send(data);
});


// send zip file to aws app.
function send_zip_aws(file_path) {
    var aws_api = 'http://54.175.198.243/api/zip/' + mac_addr + '/';

    var formData = {
        // Pass a simple key-value pair
        filename: eshow_flag,
        // Pass eshow key
        eshow_key: eshow_flag,
        // Pass data via Streams
        file: fs.createReadStream(file_path)
    };
    request.post({
        url: aws_api,
        formData: formData
    }, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('upload failed:', err);
        }
        console.log('Upload successful!  Server responded with:', body);
    });

    console.log('sending zip file to AWS app.');
}


// Get the show_key from db.
function get_show_key(callback) {
    var db_id = new sqlite3.Database(file);
    var show_key = '';
    db_id.serialize(function () {
        db_id.each("SELECT * FROM eshow WHERE id=1", function (err, row) {
            if (err) {
                return callback(err);
            }
            show_key = row.show_key;
            console.log(row.show_key);
            callback(null, show_key);
        });
    });
}

// Copy file
function copyFile(source, target, filename, db_streaming, timeStamp) {

    var rd = fs.createReadStream(source);
    var data = [];
    var db = new sqlite3.Database(file);
    rd.on("error", function (err) {
        console.log("reading error");
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function (err) {
        console.log("writing error");
    });
    wr.on("close", function (ex) {
        console.log('Closed');
        var size = getFilesizeInBytes(target);
        console.log('size', size);

        insert_file_to_db(filename, size, timeStamp);
        console.log('insert_file_to_db');

        send_file_aws(target, db_streaming);
        if (connection_flag == true) {
            data = check_backup();
            console.log('data: ' + data);
            if (data.length != 0) {
                for (var i = 0; i < data.length; i++) {
                    send_file_aws(data[i], db)
                }

            }
        }
    });
    rd.pipe(wr);
}

// ====================Add the file name to file.db.==================================
function insert_file_to_db(filename, size, date) {
    console.log("Insert file name to file db");

    try {
        var db = new sqlite3.Database(file);

        db.run("INSERT into file (file_name, file_size, date) VALUES (?, ?, ?)",
            [filename, size, date]);

        console.log('Insert data Success!');
    }

    catch (e) {
        console.log('\r\n', e);
    }
}

// ==================== Get the file size==================================
function getFilesizeInBytes(filepath) {

    var stats = fs.statSync(filepath);
    var fileSizeInBytes = stats["size"] / 1000;
    return fileSizeInBytes;

}

// Delete the db and transfer the db file to main server.
app.get('/api/transfer/', function (req, res) {
    console.log("Got a transfer request from the homepage");
    var db_streaming = new sqlite3.Database(file_streaming);
    get_show_key(function handleResult(err, result) {
        if (err) {
            console.log('Get the show key error.');
            res.send('No show key error');
        }
        eshow_flag = result;
    });
    try {
        if (!exists_streaming_db) {
            console.log('no reader.db file exists.');
            res.send('No DB File to transfer.');
        }
        else {
            console.log("table exists. cleaning existing records");
            var folder_path = srcDirectory + eshow_flag;

            // make eshow dir.
            if (!fs.existsSync(folder_path)) {
                fs.mkdirSync(folder_path);
            }

            // Filename
            var timeStamp = (new Date).toISOString().replace(/z/gi, '').trim();
            console.log(timeStamp);
            var filename = eshow_flag + ':' + timeStamp + '.db';
            console.log(filename);
            var file_path = folder_path + '/' + filename;

            // Copy the file to given path.
            copyFile(file_streaming, file_path, filename, db_streaming, timeStamp);

            sleep.sleep(3);

            res.send('Transfer File Successful.');
        }
    }
    catch (e) {
        console.log('\r\n', e);
        res.send(e);
    }
});

function check_internet() {
    dns.resolve('www.google.com', function(err) {
  if (err) {
     console.log("No connection");
      return false;
  } else {
     console.log("Connected");
      return true;
  }
});

}

// send file to aws app.
function send_file_aws(file_path, db_streaming) {
    var aws_api = 'http://54.175.198.243/api/file/' + mac_addr + '/';
    console.log('send_file_aws: ' + aws_api);
    console.log('mac_address: ' + mac_addr);
    // console.log('filename: ' + filename);

    var formData = {
        // Pass a simple key-value pair
        filename: filename,
        // Pass eshow key
        eshow_key: eshow_flag,
        // Pass data via Streams
        file: fs.createReadStream(file_path)
    };
    request.post({
        url: aws_api,
        formData: formData
    }, function optionalCallback(err, httpResponse, body) {
        if (err) {
            connection_flag = false;
            save_backup(file_path);
            return console.error('upload failed:', err);
        }

        console.log('Upload successful!  Server responded with:', body);
        db_streaming.run("DELETE FROM reader", function (error) {
            if (error)
                console.log(error);
        });
        db_streaming.run("VACUUM", function (error) {
            if (error)
                console.log(error);
        });
        console.log('Clear Table reader data');

    });
    console.log('sending file to AWS app.');
}

function check_backup() {
    var db_backup = new sqlite3.Database(file);
    posts = [];
    db_backup.serialize(function () {
        db_backup.each("SELECT * FROM backup", function (err, row) {
            posts.push(row.filepath);
            console.log(row.filepath);
        });

    });
    console.log(posts.length);
    return posts;
}


function save_backup(filepath) {
    var db_backup = new sqlite3.Database(file);

    db_backup.run("INSERT into backup (filepath) VALUES (?)", filepath);

    console.log('save backup : ' + filepath);
}

// ====================== Streaming Data from db. ======================
app.get('/api/stream/', function (req, res) {
    console.log("Got a Stream request for the homepage");
    var db_streaming = new sqlite3.Database(file_streaming);

    var posts = [];
    db_streaming.serialize(function () {
        db_streaming.each("SELECT * FROM reader", function (err, row) {
            if (err) {
                posts.push({EPC: 'No Card', time: 'None'});
                res.set('Content-Type', 'application/json');
                res.send(posts);

            }
            posts.push({antenna: row.antenna, EPC: row.card_data, Custom: row.custom_field, time: row.timestamp});
            console.log(row.antenna, row.card_data, row.custom_field, row.timestamp)
        }, function (err) {
            var send_data = [];
            if (err){
                send_data = []
            }
            else {
                if (posts.length > 10) {
                    count = posts.length - 1;
                    for (var i = count; i > count - 10; i--) {
                        send_data.push(posts[i]);
                    }
                }
            }
            // All done fetching records, render response
            res.set('Content-Type', 'application/json');
            res.send(send_data);
        });
    });
});

// =================== Sync On ===================================
app.get('/api/sync_on/', function (req, res) {
    console.log('sync on');
    syncon_status = true;
    interval = setInterval(function (req, res) {
        console.log("Got a transfer request from the homepage");
        var db_streaming = new sqlite3.Database(file_streaming);
        get_show_key(function handleResult(err, result) {
            if (err) {
                console.log('Get the show key error.');
                res.send('No show key error');
            }
            eshow_flag = result;
        });
        try {
            if (!exists_streaming_db) {
                console.log('no streaming.db file exists.');
                res.send('No DB File to transfer.');
            }
            else {
                console.log("table exists. cleaning existing records");
                var folder_path = '/home/pi/' + eshow_flag;

                // make eshow dir.
                if (!fs.existsSync(folder_path)) {
                    fs.mkdirSync(folder_path);
                }

                // Filename
                var timeStamp = (new Date).toISOString().replace(/z/gi, '').trim();
                console.log(timeStamp);
                var filename = eshow_flag + ':' + timeStamp + '.db';
                console.log(filename);
                var file_path = folder_path + '/' + filename;

                // Copy the file to given path.
                copyFile(file_streaming, file_path, filename, db_streaming, timeStamp);

                sleep.sleep(3);
                res.send('Sync on Successful.');
            }
        }
        catch (e) {
            console.log('\r\n', e);
        }
    }, time_interval);
});


// =================== Sync Off ==================================
app.get('/api/sync_off/', function (req, res) {
    console.log('sync off');
    syncon_status = false;
    clearInterval(interval);
    res.send('start sync off');
});

// =================== Sync Manual ================================
app.get('/api/sync_manual/', function (req, res) {
    console.log('sync manual');

    console.log("Got a transfer request from the homepage");
    var db_streaming = new sqlite3.Database(file_streaming);
    get_show_key(function handleResult(err, result) {
        if (err) {
            console.log('Get the show key error.');
            res.send('No show key error');
        }
        eshow_flag = result;
    });
    try {
        if (!exists_streaming_db) {
            console.log('no streaming.db file exists.');
            res.send('No DB File to transfer.');
        }
        else {
            console.log("table exists. cleaning existing records");
            var folder_path = '/home/pi/' + eshow_flag;

            // make eshow dir.
            if (!fs.existsSync(folder_path)) {
                fs.mkdirSync(folder_path);
            }

            // Filename
            var timeStamp = (new Date).toISOString().replace(/z/gi, '').trim();
            console.log(timeStamp);
            var filename = eshow_flag + ':' + timeStamp + '.db';
            console.log(filename);
            var file_path = folder_path + '/' + filename;
            // Copy the file to given path.
            copyFile(file_streaming, file_path, filename, db_streaming, timeStamp);

            sleep.sleep(3);
            res.send('Sync Manual Successful.');
        }
    }
    catch (e) {
        console.log('\r\n', e);
        res.send(e);
    }
});


// ================ Start server from AWID.=========================
app.get('/api/start/:timer(\\d+)', function (req, res) {
    console.log("Got a Start request");
    start_status = true;
    calculate_alive_time();
    timer = req.params.timer;
    timerate_status = timer;
    console.log(timer);

    //The url we want is: 'http://127.0.0.1:8080'
    var options = {
        host: '127.0.0.1',
        port: 8080,

        path: '/start?timer=' + timer
    };

    on_callback = function (response) {

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            console.log(chunk);
            res.send('Started !!!');

        });

        response.on('error', function handleRequestError(error) {
            console.log("Request error:", error);
            res.send(error);
        });

        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {

        });
    };
    http.request(options, on_callback).end();
});

// ================= Stop server from AWID.=======================
app.get('/api/stop/', function (req, res) {
    start_status = false;
    timerate_status = false;
    clearInterval(clock);
    console.log("Got a Stop request");
    var options = {
        host: '127.0.0.1',
        port: 8080,
        path: '/stop'
    };
    callback = function (response) {

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            console.log(chunk);
            res.send('Stopped !!!');
        });

        //another chunk of data has been recieved, so append it to `str`
        response.on('error', function handleRequestError(error) {
            console.log("Request error:", error);
            res.send(error);
        });

        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {

        });
    };
    http.request(options, callback).end();
});


// =============== Calculate alive time ==========================//
function calculate_alive_time() {
    console.log('sync on');
    clock = setInterval(function (req, res) {
        var read_data = 0;
        var data = 0;
        fs.readFile(clock_file, 'utf8', function (err, readdata) {
            if (err) {
                return console.log(err);
            }
            console.log(readdata);

            data =parseInt(readdata, 10) + 5;
            fs.writeFile(clock_file, data, function (err) {
                if (err) return console.log(err);
                console.log(clock_file + ' -> ' + data);
            });
            send_data_aws(data);
        });


    }, clock_interval);

}


// ======================== send data to aws =========================//
function send_data_aws(data) {
    var aws_data_api = 'http://54.175.198.243/api/update/status/' + mac_addr + '/';
    console.log('send_file_aws: ' + aws_data_api);
    console.log('mac_address: ' + mac_addr);
    request({
        url: aws_data_api,
        method: 'POST',
        //Lets post the following key/values as form
        json: true,
        body: {alive_time: data}
    }, function (error, response, body) {
        if (error) {
            console.log(error);
        } else {
            console.log(response.statusCode, body);
        }
    });
}

// ========================== Create db when no exists.===================//
function create_db() {
    if (!exists) {
        console.log("Creating DB file.");
        fs.openSync(file, "w");
    }

    var db = new sqlite3.Database(file);

    db.serialize(function () {
        if (!exists) {
            console.log("Creating table.");
            db.run("CREATE TABLE reader_setting (id INTEGER PRIMARY KEY AUTOINCREMENT, reader_name TEXT, mac_address TEXT, ip_address TEXT, power_level Text)");
            db.run("CREATE TABLE eshow(id INTEGER PRIMARY KEY AUTOINCREMENT, show_key TEXT, client_key TEXT)");
            db.run("CREATE TABLE file(id INTEGER PRIMARY KEY AUTOINCREMENT, file_name TEXT, file_size INTEGER, date TEXT)");
            db.run("CREATE TABLE backup(id INTEGER PRIMARY KEY AUTOINCREMENT, filepath TEXT)");
        }
    });

    db.close();
}

// ==================== Start node.js server.======================//
var server = app.listen(10000, function () {
    create_db();

    var host = server.address().address;
    var port = server.address().port;
    console.log("Node Server listening at http://%s:%s", host, port)
});