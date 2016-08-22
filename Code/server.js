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

var app = express();


// ============== Define the static directives.===================//
app.use('/public', express.static('public'));

// =============== parse application/json ========================//
app.use(bodyParser.urlencoded({extended: false}));
// =============== parse application/json ========================//
app.use(bodyParser.json());


// =============== Create database if no exists. ==================//
var fs = require("fs");
var file = "../reader_setting.db";
var file_streaming = "../reader.db";
var exists = fs.existsSync(file);
var exists_streaming_db = fs.existsSync(file_streaming);
var sqlite3 = require("sqlite3").verbose();

var eshow_flag = '';
var eshow_key = '';
var client_key = '';
var file_path = '';
var mac_addr = '';
var interval;
var time_interval = 10000;
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

// ======================= API(List, Add, Delete, Update) ================================//

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
        }, function () {
            // All done fetching records, render response
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

        console.log('Delete data Success!');
        res.send('Deleted the Devices From List.');
    }
    catch (e) {
        console.log('\r\n', e);
        res.send(e);
    }
});

//function will check if a directory exists, and create it if it doesn't
function checkDirectory(directory, callback) {
    fs.stat(directory, function (err, stats) {
        //Check if error defined and the error code is "not exists"
        if (err && err.errno === 34) {
            //Create the directory, call the callback.
            fs.mkdir(directory, callback);
        } else {
            //just in case there was a different error:
            callback(err)
        }
    });
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
function copyFile(source, target, filename, db_streaming) {

    var rd = fs.createReadStream(source);
    rd.on("error", function (err) {
        console.log("reading error");
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function (err) {
        console.log("writing error");
    });
    wr.on("close", function (ex) {
        console.log('Closed');
        send_file_aws(target, filename, db_streaming);
    });
    rd.pipe(wr);
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
            copyFile(file_streaming, file_path, filename, db_streaming);
            // var stream = fs.createReadStream(file_streaming).pipe(fs.createWriteStream(file_path));
            sleep.sleep(3);

            res.send('Transfer File Successful.');
        }
    }
    catch (e) {
        console.log('\r\n', e);
        res.send(e);
    }
});

// send file to aws app.
function send_file_aws(file_path, filename, db_streaming) {
    var aws_api = 'http://54.167.227.250/api/file/' + mac_addr + '/';
    console.log('send_file_aws: ' + aws_api);
    console.log('mac_address: ' + mac_addr);
    console.log('filename: ' + filename);

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
            return console.error('upload failed:', err);
        }
        console.log('Upload successful!  Server responded with:', body);
        db_streaming.run("DELETE FROM reader", function (error) {
            if (error)
                console.log(error);
        });

    });

    console.log('sending file to AWS app.');
}


// ====================== Streaming Data from db. ======================
app.get('/api/stream/', function (req, res) {
    console.log("Got a Stream request for the homepage");
    var db_streaming = new sqlite3.Database(file_streaming);

    var posts = [];
    db_streaming.serialize(function () {
        db_streaming.each("SELECT * FROM reader", function (err, row) {
            if (err) {
                posts.push({EPC: 'No Card', time: 'No Card'});
                res.set('Content-Type', 'application/json');
                res.send(posts);

            }
            posts.push({antenna: row.antenna, EPC: row.card_data, Custom: row.custom_field, time: row.timestamp});
            console.log(row.antenna, row.card_data, row.custom_field, row.timestamp)
        }, function () {
            // All done fetching records, render response
            res.set('Content-Type', 'application/json');
            res.send(posts);
        });
    });
});

// =================== Sync On ===================================
app.get('/api/sync_on/', function (req, res) {
    console.log('sync on');
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
                copyFile(file_streaming, file_path, filename, db_streaming);
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
            copyFile(file_streaming, file_path, filename, db_streaming);
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
    timer = req.params.timer;

    //antenna = req.params.antenna;
    console.log(timer);
    //console.log(antenna);

    //The url we want is: 'http://127.0.0.1:8080'
    var options = {
        host: '127.0.0.1',
        port: 8080,
        //path: '/start?timer=' + timer + '&antenna=' + antenna
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
        }
    });
    db.close();
}

// ==================== Start node.js server.======================//
var server = app.listen(8081, function () {
    create_db();
    var host = server.address().address;
    var port = server.address().port;
    console.log("Node Server listening at http://%s:%s", host, port)
});