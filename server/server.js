// Server-side code
/* jshint node: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */

"use strict";

// Config
var httpPort = 3000;
var redisPort = 6379;
var line_history = [];
var usernames = {};
//var magic = [ "bunny", "dog", "elephant", "fish", "turtle" ];
var xyzzy = null;

// Depends
var express = require("express");
var io = require("socket.io");
var redis = require("redis");
var datamuse = require("datamuse");
var random = require("random-js")();

// Initialize
var app = express();
app.use(express.static("./"));
var server = null;
var redisClient = null;
var db = false;

// Functions
function connectDB() {
    redisClient = redis.createClient(redisPort);
    redisClient.on("error", function() {
        console.error("Redis server refused connection on port", redisPort);
        return false;
    });

    redisClient.on("connect", function() {
        console.log("Connected to Redis Server on port", redisPort);
        return true;
    });

    redisClient.on("end", function() {
        console.log("Connection to Redis Server closed");
        return false;
    });
}

function startServer() {
    var process = io.listen(app.listen(httpPort).on("error", function(err) {
        if (!err) {
            console.log("Starting express server on httpPort", httpPort);
        }
        else if (err.errno === "EADDRINUSE") {
            console.log("Port", httpPort, "busy. Unable to start express server");
            console.log("To debug: $ lsof -i :" + httpPort);
        }
        else {
            console.log(err);
        }
    }));

    return process;
}

function wordsFromAPI() {
    var colors = [ "red", "green", "blue", "yellow", "black", "pink", "white" ];
    var seed = random.integer(0, colors.length-1);
    var adjective = colors[seed];
    //console.log("adj", adjective);
    var categories = "bird,mammal,fish,machine";
    var limit = 50;

    datamuse.words({
        rel_jja: adjective,
        topics: categories,
        max: limit
    })
    .then((json) => {
      var pick = random.integer(0, json.length-1);
      //console.log("rand", pick, json[pick].word);
      xyzzy = json[pick].word;
      //server.sockets.emit("displayword", xyzzy);
    });
}

function reveal(socket) {
    // echo new word
    server.sockets.emit("displayword", xyzzy);
}

function userLogin(socket) {
    // when the client emits "adduser", this listens and executes
    socket.on("adduser", function(mode, username) {

        // detect game mode
        if (mode === 1) {
            console.log("Free-for-all mode");
        }
        else if (mode === 2) {
            console.log("Teams mode");
        }
        else {
            console.log("Invalid mode", mode);
        }

        // we store the username in the socket session for this client
        socket.username = username;
        // add the client's username to the global list
        usernames[username] = username;
        console.log("add client", username);

        // store username in Redis database
        if (db) {
            console.log("rpush username", username);

            redisClient.exists(username, function(err, object) {
                if (object !== 1) {
                    // initialize scores to 0
                    redisClient.hmset(username, {
                        "wins": 0,
                    });
//                    redisClient.hmset(username, {
//                        "losses": 0,
//                    });
                    redisClient.rpush("users", username);
                }
            });



            redisClient.lrange("users", 0, -1, function(err, items) {
                if (err) {
                    console.log("Error in getting elements of user list");
                }
                items.forEach(function(item) {
                    console.log("Item", item);
                    usernames[username] = username;
                });
            });
        }

        // echo to client they've connected
        socket.emit("updatechat", "SERVER", "you have connected");
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit("updatechat", "SERVER", username + " has connected");
        // update the list of users in chat, client-side
        server.sockets.emit("updateusers", usernames);

        if (server.engine.clientsCount === 1) {
            reveal(socket);
        }
    });
}

function userLogout(socket) {
    // when the user disconnects.. perform this
    socket.on("disconnect", function() {
        console.log("User:", socket.username, "Disconnected");
        // remove the username from global usernames list
        delete usernames[socket.username];

        // remove username from Redis database
        if (db) {
            console.log("lrem username", socket.username);

            redisClient.lrem("users", 1,  socket.username, function(err) {
                if (err) {
                    console.log("User Removed form list");
                }
            });
        }

        // update list of users in chat, client-side
        server.sockets.emit("updateusers", usernames);
        // echo globally that this client has left
        socket.broadcast.emit("updatechat", "SERVER", socket.username + " has disconnected");

        if (server.engine.clientsCount === 1) {
            reveal(socket);
        }
    });
}

function recordDraw(socket) {
    for (var i in line_history) {
        if (line_history[i] !== null) {
            socket.emit("draw_line", line_history[i]);
        }
        else {
            console.log("Drawing null");
        }

    }
}

function transmitDraw(socket) {
    socket.on("draw_line", function(data) {
        line_history.push(data);
        server.sockets.emit("draw_line", data);
    });
}

function clearDraw(socket) {
    socket.on("clear_line", function() {
        line_history = [];
        server.sockets.emit("clear_line");
    });
}

function winner(socket) {
    console.log("Winner", socket.username);
    // echo to client they've won
    server.sockets.emit("updateword", "you win!");
    server.sockets.emit("updateword", "the word was '" + xyzzy + "'");
    // echo globally (all clients) that a person has won
    socket.broadcast.emit("updateword", "the word was '" + xyzzy + "'");
    socket.broadcast.emit("updateword", "player '" + socket.username + "' was the winner");

    // get new word
    wordsFromAPI();
    reveal(socket);
}

function parseChat(socket, data) {
    var line = Array.prototype.join.call(data, "");
    var words = line.split(" ");

    for (var i = 0; i < words.length; ++i) {
        console.log(words[i], xyzzy);
        if (words[i] === xyzzy) {
            winner(socket);
        }
        // fuzzy matching
        else if (words[i].replace(/s$/, "") === xyzzy) {
            console.log("trimmed 's'");
            winner(socket);
        }
        else if (words[i].replace(/y$/, "ies") === xyzzy) {
            console.log("expanded 's'");
            winner(socket);
        }
        else if (words[i] === xyzzy + "s") {
            console.log("appended 's'");
            winner(socket);
        }
    }
}

function transmitChat(socket) {
    // when the client emits "sendchat", this listens and executes
    socket.on("sendchat", function(data) {
        // we tell the client to execute "updatechat" with 2 parameters
        server.sockets.emit("updatechat", socket.username, data);
        // check for magic word
        parseChat(socket, data);
    });
}


// Run server
server = startServer();
db = connectDB();
wordsFromAPI();

// Main
server.sockets.on("connection", function(socket) {
    console.log("Connected: %s", socket.id);
    userLogin(socket);
    recordDraw(socket);
    transmitDraw(socket);
    transmitChat(socket);
    userLogout(socket);
});
