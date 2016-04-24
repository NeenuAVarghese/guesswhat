// Server-side code
/* jshint node: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */

"use strict";

// Config
var port = 3000;
var line_history = [];
var usernames = {};
var magic = [ "bunny", "dog", "elephant", "fish", "turtle" ];
var xyzzy = 0;

// Depends
var express = require("express");
var io = require("socket.io");
var redis = require("redis");

// Initialize
var redisClient = redis.createClient();
var app = express();
app.use(express.static("./"));
var server = null;

// Functions
function startServer() {
    var process = io.listen(app.listen(port).on("error", function(err) {
        if (!err) {
            console.log("Starting express server on port", port);
            redisClient.on("connect", function() {
                console.log("Connected to Redis Server");
            });
        }
        else if (err.errno === "EADDRINUSE") {
            console.log("Port", port, "busy. Unable to start express server");
            console.log("To debug: $ lsof -i :" + port);
        }
        else {
            console.log(err);
        }
    }));

    return process;
}

function userLogin(socket) {
    // when the client emits "adduser", this listens and executes
    socket.on("adduser", function(username) {
        // we store the username in the socket session for this client
        socket.username = username;

        // store username in Redis database
        redisClient.exists(username, function(err, object) {
            if (object !== 1) {
                // initialize score to 0
                redisClient.hmset(username, {
                    "score": 0
                });
                redisClient.rpush("users", username);
            }
        });

        // echo to client they've connected
        socket.emit("updatechat", "SERVER", "you have connected");
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit("updatechat", "SERVER", username + " has connected");

        // add the client's username to the global list
        redisClient.lrange("users", 0, -1, function(err, items) {
            if (err) {
                console.log("Error in getting elements of user list");
            }
            items.forEach(function(item) {
                console.log("Item", item);
                usernames[username] = username;
            });
        });

        // update the list of users in chat, client-side
        server.sockets.emit("updateusers", usernames);
    });
}

function userLogout(socket) {
    // when the user disconnects.. perform this
    socket.on("disconnect", function() {
        console.log("User:", socket.username, "Disconnected");

        // remove the username from global usernames list
        redisClient.lrem("users",1,  socket.username, function(err) {
            if (err) {
                console.log("User Removed form list");
            }
        });

        delete usernames[socket.username];
        // update list of users in chat, client-side
        server.sockets.emit("updateusers", usernames);
        // echo globally that this client has left
        socket.broadcast.emit("updatechat", "SERVER", socket.username + " has disconnected");
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

function parseChat(socket, data) {
    var line = Array.prototype.join.call(data, "");
    var words = line.split(" ");

    for (var i = 0; i < words.length; ++i) {
        console.log(words[i], magic[xyzzy]);
        if (words[i] === magic[xyzzy]) {
            console.log("Winner", socket.username);
            // echo to client they've won
            server.sockets.emit("updateword", "you win!");
            server.sockets.emit("updateword", "the word was '" + magic[xyzzy] + "'");
            // echo globally (all clients) that a person has won
            socket.broadcast.emit("updateword", "the word was '" + magic[xyzzy] + "'");
            socket.broadcast.emit("updateword", "player " + socket.username + " was the winner");

            // change word
            if (xyzzy < magic.length) {
                xyzzy += 1;
            }
            else {
                xyzzy = 0;
            }
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

// Main
server.sockets.on("connection", function(socket) {
    console.log("Connected: %s", socket.id);
    userLogin(socket);
    recordDraw(socket);
    transmitDraw(socket);
    transmitChat(socket);
    userLogout(socket);
});
