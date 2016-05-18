// Server-side code
/* jshint node: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */
/* global Promise: true */

"use strict";

/* Configuration */
var nconf = require("nconf");
// CLI and ENV
nconf.argv().env();
// Load from file
nconf.file({ file: "config.json" });
// Defaults
nconf.defaults({
    "httpPort": 3000,
    "redisPort": 6379,
    "purgeDB": false,
    "topics": ["bird", "mammal", "fish", "machine" ]
});

/* Depends */
var express = require("express");
var io = require("socket.io");
var Multimap = require("multimap");
var redis = require("redis");
var request = require("request");
var random = require("random-js")();
var xssFilters = require("xss-filters");

/* Initialize */
var httpPort = nconf.get("httpPort");
var redisPort = nconf.get("redisPort");
var purgeDB = nconf.get("purgeDB");
var topics = nconf.get("topics");
// variable to handle express
var app = express();
app.use(express.static("./"));
// variable to handle io connection
var server = null;
// variable to handle db connection
var redisClient = null;
// parsing rediscloud credentials
var vcap_services = process.env.VCAP_SERVICES;
// namespace for the socket connection
var guesswhat = null;
// if connected to db
var db = false;
// if connected to API
var define = null;

/* Data */
var line_history = [];
var room_magic = {};
var room_player = {};
var map = new Multimap();


//Function to Get Definition of magic word
function defineFromAPI(word) {
    var onelook = "http://www.onelook.com/?xml=1&w=";
    var url = onelook + word;

    return new Promise(function(resolve) {
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var xml = Array.prototype.join.call(body, "");
                var lines = xml.split("\n");
                var max = 10;

                if (lines.length < 10) {
                    max = lines.length;
                }

                var count = 0;
                var stop = false;
                var found = false;

                while (!stop) {
                    if (lines[count] === "<OLQuickDef>") {
                        found = true;
                    }
                    else if (lines[count] === "</OLQuickDef>") {
                        stop = true;
                    }
                    else if (count >= max) {
                        stop = true;
                    }
                    else if (found) {
                        define = lines[count].split("&")[0];
                    }

                    ++count;
                }

                console.log("==> definition:", define);
                resolve(define);
            }
        });
    });
}


//Function to get Magic Word
function wordsFromAPI() {
    var colors = [ "red", "green", "blue", "yellow", "black", "pink", "white" ];
    var seed = random.integer(0, colors.length-1);
    var adjective = colors[seed];
    var limit = 50;

    var xyzzy = null;
    var categories = topics.join(",");
    //console.log(categories);
    var datamuse = "http://api.datamuse.com/words?";
    var url = datamuse + "rel_jja=" + adjective + "&topics=" + categories + "&max=" + limit;
    return new Promise(function(resolve) {
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var json = JSON.parse(body);
                var pick = random.integer(0, json.length-1);
                xyzzy = json[pick].word;
                console.log("==> magicword:", xyzzy);
                resolve(xyzzy);
            }
        });
    });
}


//Function to connect to DB will return true if successfully connected
function connectDB() {
    // cloud foundry
    if (vcap_services) {
        console.log("===> redis cloud", vcap_services);
        var rediscloud_service = JSON.parse(vcap_services).rediscloud[0];
        var credentials = rediscloud_service.credentials;
        redisClient = redis.createClient(credentials.port, credentials.hostname, {no_ready_check: true});
        redisClient.auth(credentials.password);
    }
    else {
        console.log("===> local redis");
        redisClient = redis.createClient(redisPort);
    }


    redisClient.on("error", function(err) {
        console.error("Redis server refused connection on port", redisPort);
        console.log(err);
        db = false;
    });

    redisClient.on("end", function() {
        console.log("Connection to Redis Server closed");
        db = false;
    });

    redisClient.on("connect", function() {
        console.log("Connected to Redis Server on port", redisPort);
        db = true;
    });

    // Wipe DB
    if (server.engine.clientsCount === 0 && purgeDB) {
        redisClient.flushdb(function(err, status) {
            console.log("Purged Redis DB");
        });
    }
}


//Function to start server and make socket io listen to the connections on server
function startServer() {
    if (typeof vcap_services !== "undefined") {
        httpPort = process.env.PORT;
    }

    var httpd = io.listen(app.listen(httpPort, function() {
        console.log("Starting Express server on httpPort", httpPort);
    }).on("error", function(err) {
        if (err.errno === "EADDRINUSE") {
            console.log("Port", httpPort, "busy. Unable to start Express server");
            console.log("To debug: $ lsof -i :" + httpPort);
            process.exit(1);
        }
        else if (err) {
            console.log(err);
            process.exit(1);
        }
    }));

    return httpd;
}

//FUnction to update DB after User Login
function putToDB(socket, username, groupname) {
    var usernames = {};
    //put users to db
    if (db) {
        redisClient.exists(username, function(err, object) {
            if (object !== 1) {
                // initialize scores to 0
                redisClient.hmset(username, {
                    "wins": 0,
                    "groupname": groupname,
                    "socketid": socket.id
                });

                var grp = "G"+ groupname;
                redisClient.sadd(grp, username, function() {

                    redisClient.smembers(grp, function(err, items) {
                        if (err) {
                            console.log("Error in getting elements of user list");
                        }

                        var i = 0;
                        items.forEach(function(item) {
                            console.log(items);
                            redisClient.hget(item, "wins", function(err, data) {
                                i++;
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    usernames[item] =  data;
                                }

                                if (i === items.length) {
                                    // update the list of users in chat, client-side
                                    guesswhat.to(socket.room).emit("updateusers", usernames);
                                    // echo globally (all clients) that a person has connected
                                    socket.broadcast.to(socket.room).emit("updatechat", "SERVER", username + " has connected", 0);
                                }
                            });
                       });

                   });

                });
            }
        });
    }
}

function recordDraw(roomname) {
    var room = roomname;
    line_history.length = 0;
    redisClient.lrange(room, 0, -1, function(err, items) {
        if (err) {
            console.log("Error in getting elements of user list");
        }

        if (items !== null) {

            items.forEach(function(item) {
                line_history.push(JSON.parse(item));
            });

            for (var i in line_history) {
                if (line_history[i] !== null) {
                    guesswhat.to(room).emit("draw_line", line_history[i]);
                }
                else {
                    console.log("Drawing null");
                }
            }
        }
    });
}

function newUser(groupname, newuser) {
    var username = newuser.toLowerCase();

    if (map.has(groupname)) {
        var members = map.get(groupname);
        if (members.indexOf(username) !== -1) {
            console.log("===> " + username, "already exists in", groupname);
            return false;
        }
        else {
            map.set(groupname, username);
            console.log("===> welcome to", groupname, username);
            return true;
        }
    }
    else {
        map.set(groupname, username);
        console.log("===> you have created", groupname, "thanks " + username);
        return true;
    }
}

function userLogin(socket) {
    // when the client emits "adduser", this listens and executes
    socket.on("adduser", function(mode, username, groupname, callback) {

        // sanitize username
        username = xssFilters.inHTMLData(username);

        if (username === null) {
            username = "unknown";
        }

        // detect game mode
        if (mode === 1) {
            // we store the username in the socket session for this client
            socket.username = username;
            groupname = "freeforall";

            // users cannot have same name in a room
            if (newUser(groupname, username)) {
                callback("", "SUCCESS");
                //we store the room information in the socket session
                socket.room = "freeforall";
                socket.join(socket.room);
                console.log("Free-for-all mode");

                 // echo to client they've connected
                socket.emit("updatechat", "SERVER", "you have connected as '" + username + "'", 0);

                // store username in Redis database
                putToDB(socket, username, groupname);

                // write line history to canvas
                recordDraw(socket.room);
            }
        }

        else if (mode === 2) {
            //error handling needed....
            console.log(groupname);
            // we store the username in the socket session for this client
            socket.username = username;

            // users cannot have same name in a room
            if (newUser(groupname, username)) {
                callback("", "SUCCESS");
                //we store the room information in the socket session
                socket.room = groupname;
                socket.join(groupname);
                console.log("Teams mode");

                 // echo to client they've connected
                socket.emit("updatechat", "SERVER", "you have connected as '" + username + "'", 0);

                // store username in Redis database
                putToDB(socket, username, groupname);

                // write line history to canvas
                recordDraw(socket.room);
            }

        }

        else {
            console.log("Invalid mode", mode);
        }

        callback("foobar", "FAILED");

    });
}

function removeFromDb(socket) {
    if (db) {
        var cgrp = "G" + socket.room;
        console.log(cgrp);
        redisClient.srem(cgrp, 1,  socket.username, function(err) {
            if (err) {
                console.log("User Removed form list");
            }
        });

        //remove the hash set for user
        redisClient.hdel(socket.username, "wins");
        redisClient.hdel(socket.username, "groupname");
        redisClient.hdel(socket.username, "socketid");

        // remove from multimap
        map.delete(socket.room + "", socket.username);

        redisClient.exists(cgrp, function(err, object) {
            if (object === 0 && typeof socket.room !== "undefined") {
                redisClient.ltrim(socket.room, -1 ,0, function(err) {
                    if (!err) {
                        console.log(socket.room + " Room deleted !");
                        map.delete(socket.room + "");
                    }
                });
            }
        });

        var usernames = {};
        redisClient.smembers(cgrp, function(err, items) {
            if (err) {
                console.log("Error in getting elements of user list");
            }

            var i = 0;
            items.forEach(function(item) {
                console.log(items);
                redisClient.hget(item, "wins", function(err, data) {
                    i++;
                    if (err) {
                        console.log(err);
                    }
                    else {
                        usernames[item] =  data;
                    }

                    if (i === items.length) {
                        // update the list of users in chat, client-side
                        guesswhat.to(socket.room).emit("updateusers", usernames);
                    }
                });
            });

        });
    }
}

function userDisconnect(socket) {
    // when the user disconnects.. perform this
    socket.on("disconnect", function() {
        if (socket.username !== undefined) {
            console.log("User:", socket.username, "Disconnected");

            // remove username from Redis database and update users
            removeFromDb(socket);

            // echo globally that this client has left
            guesswhat.to(socket.room).emit("updatechat", "SERVER", socket.username + " has disconnected", 0);
        }
    });
}


function userLogout(socket) {
    // when the user clicks logout
    socket.on("logout", function() {
        if (socket.username !== undefined) {
            console.log("User:", socket.username, "Disconnected");

            // remove username from Redis database and update users
            removeFromDb(socket);

            // echo globally that this client has left
            guesswhat.to(socket.room).emit("updatechat", "SERVER", socket.username + " has disconnected", 0);
        }
    });
}

function transmitDraw(socket) {
    socket.on("draw_line", function(data) {
         if (db) {
            redisClient.exists(socket.room, function() {
                if (typeof socket.room !== "undefined") {
                   redisClient.rpush(socket.room, JSON.stringify(data));
                }
            });
         }
        guesswhat.to(socket.room).emit("draw_line", data);
    });
}

function updatewin(socket, winuser) {
    if (db) {
        redisClient.hincrby(winuser, "wins", 1, function(err) {
            if (!err) {
                console.log("Data Updated !");
                redisClient.hget(winuser, "wins", function(err, data) {
                    console.log(data);
                });
            }
        });

        var cgrp = "G" + socket.room;
        var usernames = {};
        redisClient.smembers(cgrp, function(err, items) {
            if (err) {
                console.log("Error in getting elements of user list");
            }

            var i = 0;
            items.forEach(function(item) {
                console.log(items);
                redisClient.hget(item, "wins", function(err, data) {
                    i++;
                    if (err) {
                        console.log(err);
                    }
                    else {
                        usernames[item] =  data;
                    }

                    if (i === items.length) {
                        // update the list of users in chat, client-side
                        guesswhat.to(socket.room).emit("updateusers", usernames);
                    }
                });
            });

        });
    }
}

function clearCanvas(socket) {
    socket.on("clearcanvas", function() {
        redisClient.ltrim(socket.room, -1 ,0, function(err) {
            if (!err) {
                map.delete(socket.room + "");
            }
        });

        guesswhat.to(socket.room).emit("clearcanvas");
    });
}

function saltWord(socket, previous) {
    if (previous !== "" && typeof previous !== "undefined") {
        console.log("==> salting with", previous);
        topics.shift();
        topics.push(previous);
        console.log("==> topics:", topics);
    }
}

function winner(socket) {
    var winuser = socket.username;
    console.log("Winner", winuser);

    // echo to client they've won
    socket.emit("updateword", "You win!");
    // echo globally (all clients) that a person has won
    guesswhat.to(socket.room).emit("updateword", "The word was '" + room_magic[socket.room] + "'");
    guesswhat.to(socket.room).emit("updateword", "Player '" + winuser + "' was the winner");

    redisClient.ltrim(socket.room, -1 ,0, function(err) {
        if (!err) {
            map.delete(socket.room + "");
        }
    });

    guesswhat.to(socket.room).emit("clearcanvas");
    saltWord(socket, room_magic[socket.room]);
    room_magic[socket.room] = "";
    updatewin(socket, winuser);
}

function loser(socket) {
    console.log("no one won");

    // echo globally (all clients) that a person has won
    guesswhat.to(socket.room).emit("updateword", "The word was '" + room_magic[socket.room] + "'");
    guesswhat.to(socket.room).emit("updateword", "No one guessed it!");

    redisClient.ltrim(socket.room, -1 ,0, function(err) {
        if (!err) {
            map.delete(socket.room + "");
        }
    });

    guesswhat.to(socket.room).emit("clearcanvas");
    saltWord(socket, room_magic[socket.room]);
    room_magic[socket.room] = "";
}

function getword(room)
{
    return room_magic[room];
}

function parseChat(socket, data) {
    var xyzzy = getword(socket.room);

    var line = Array.prototype.join.call(data, "");
    if (line !== "") {
        var words = line.split(" ");

        for (var i = 0; i < words.length; ++i) {
            var guess = words[i].replace(/[^a-zA-Z]/g, "").toLowerCase();
            console.log("guess:" + guess, "magic:" + xyzzy);

            // compare length
            var diffchar = xyzzy.length - guess.length;
            if (diffchar < 0) {
                diffchar *= -1;
            }

            if (room_player[socket.room] !== socket.id) {
                // word is exact match
                if (guess === xyzzy) {
                    winner(socket);
                }
                // fuzzy matching
                else if (guess === xyzzy + "s") {
                    console.log("appended 's'");
                    winner(socket);
                }
                else if (guess + "s" === xyzzy) {
                    console.log("trimmed 's'");
                    winner(socket);
                }
                else if (guess.replace(/y$/, "ies") === xyzzy) {
                    console.log("expanded 'ies'");
                    winner(socket);
                }
                else if (guess.replace(/ies$/, "y") === xyzzy) {
                    console.log("compressed 'ies'");
                    winner(socket);
                }
                else if (xyzzy.indexOf(guess) !== -1 && diffchar < 3) {
                    console.log("contains guess within " + diffchar + " chars");
                    winner(socket);
                }
                else if (guess.indexOf(xyzzy) !== -1 && diffchar < 3) {
                    console.log("contained inside guess within " + diffchar + " chars");
                    winner(socket);
                }
            }
        }
    }
}

function transmitChat(socket) {
    // when the client emits "sendchat", this listens and executes
    socket.on("sendchat", function(userid, data) {
        var timestamp = new Date().getTime() / 1000;

        // sanitize chat message
        data = xssFilters.inHTMLData(data);

        // we tell the client to execute "updatechat" with 4 parameters
        guesswhat.to(socket.room).emit("updatechat", socket.username, data, userid, timestamp);

        // check for magic word
        if (typeof room_magic[socket.room] !== "undefined" && room_magic[socket.room] !== "") {
            parseChat(socket, data);
        }
    });
}

function startTimer(socket, player) {
    var count = 90;
    var counter = null;

    function timer() {
        count = count - 1;

        // loser
        if (count < 0) {
            clearInterval(counter);
            guesswhat.to(socket.room).emit("incTimer", "Game Over !", null);
            guesswhat.to(socket.room).emit("enablePlay");
            loser(socket);
            return;
        }
        // winner
        else if (room_magic[socket.room] === "") {
            clearInterval(counter);
            guesswhat.to(socket.room).emit("incTimer", "Game Over !", null);
            guesswhat.to(socket.room).emit("enablePlay");
            return;
        }

        //Do code for showing the number of seconds here
        guesswhat.to(socket.room).emit("incTimer", count, player);
    }

    counter = setInterval(timer, 1000); //1000 will  run it every 1 second
}

function sendMagicword(socket) {
    socket.on("getmagicword", function() {
        wordsFromAPI().then(function(data) {
            var magicwrd = data;

            defineFromAPI(data).then(function(datadefinition) {
                var magicwrdmeaning = datadefinition;

                var puzzle = {
                    magicwrd : magicwrd,
                    magicwrdmeaning: magicwrdmeaning
                };

                room_magic[socket.room] = magicwrd;
                room_player[socket.room] = socket.id;
                guesswhat.to(socket.id).emit("message", puzzle);
            });
        });
    });
}

function startGame(socket) {
    socket.on("startgame", function(player) {
        console.log("player", player);
        guesswhat.to(socket.room).emit("disablePlay");

        var res = [];
        //get the list of socket id in room
        var room = guesswhat.adapter.rooms[socket.room];

        if (room) {
            for (var key in room.sockets) {
                if (key) {
                    res.push(key);
                }
            }
        }

        var index = res.indexOf(socket.id);
        if (index > -1) {
            res.splice(index, 1);
        }

        var msg = socket.username + " has initiated the game";
        startTimer(socket, player);
        res.forEach(function(val) {
            console.log(val, msg);
            guesswhat.to(val).emit("gameStarted", msg);
        });

    });
}


// Run server
server = startServer();
connectDB();
guesswhat = server.of("/guesswhat");


// Main
guesswhat.on("connection", function(socket) {
    console.log("Connected: %s", socket.id);
    userLogin(socket);
    transmitDraw(socket);
    transmitChat(socket);
    userDisconnect(socket);
    clearCanvas(socket);
    startGame(socket);
    userLogout(socket);
    sendMagicword(socket);
});
