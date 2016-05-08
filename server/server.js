// Server-side code
/* jshint node: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */

"use strict";

// Config
var httpPort = 3000;
var redisPort = 6379;
var line_history = [];
var usernames = {};
var magic = [ "bunny", "dog", "elephant", "fish", "turtle" ];
var xyzzy = 0;

// Depends
var express = require("express");
var io = require("socket.io");
var redis = require("redis");

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

function reveal() {
    // echo new word
   guesswhat.emit("displayword", magic[xyzzy]);
}

function userLogin(socket) {
    // when the client emits "adduser", this listens and executes
    socket.on("adduser", function(mode, username, groupname) {
        console.log(mode, username, groupname);
        // detect game mode
        if (mode === 1) {
            // we store the username in the socket session for this client
            socket.username = username;
            //we store the room information in the socket session
            socket.room = "freeforall";
            socket.join(socket.room);
            console.log("Free-for-all mode");
             // echo to client they've connected
            socket.emit("updatechat", "SERVER", "you have connected");
            

        }
        else if (mode === 2) {
            // we store the username in the socket session for this client
            socket.username = username;
            //we store the room information in the socket session
            socket.room = groupname;
            socket.join(socket.room)
            console.log("Teams mode");
             // echo to client they've connected
            socket.emit("updatechat", "SERVER", "you have connected");
            
        }
        else {
            console.log("Invalid mode", mode);
        }

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
                        "gropuname": groupname,
                        "socketid": socket.id
                    });
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

        // echo globally (all clients) that a person has connected
            guesswhat.to(socket.room).emit("updatechat", "SERVER", username + " has connected");
              // update the list of users in chat, client-side
            guesswhat.to(socket.room).emit("updateusers", usernames);

        // echo to client they've connected
        //guesswhat.emit("updatechat", "SERVER", "you have connected");
        // echo globally (all clients) that a person has connected
        //socket.broadcast.emit("updatechat", "SERVER", username + " has connected");
        // update the list of users in chat, client-side
        //guesswhat.emit("updateusers", usernames);

        if (server.engine.clientsCount === 1) {
            reveal();
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
        //server.sockets.emit("updateusers", usernames);
         guesswhat.to(socket.room).emit("updateusers", usernames);
        // echo globally that this client has left
        socket.broadcast.emit("updatechat", "SERVER", socket.username + " has disconnected");

        if (server.engine.clientsCount === 1) {
            reveal();
        }
    });
}

function recordDraw(socket) {
    for (var i in line_history) {
        if (line_history[i] !== null) {
            //socket.emit("draw_line", line_history[i]);
             guesswhat.to(socket.room).emit("draw_line", line_history[i]);
        }
        else {
            console.log("Drawing null");
        }

    }
}

function transmitDraw(socket) {
    socket.on("draw_line", function(data) {
        line_history.push(data);
        //server.sockets.emit("draw_line", data);
         guesswhat.to(socket.room).emit("draw_line", data);
    });
}

function winner(socket) {
    console.log("Winner", socket.username);
    // echo to client they've won
    socket.emit("updateword", "You win!");
    socket.emit("updateword", "The word was '" + magic[xyzzy] + "'");
    // echo globally (all clients) that a person has won
     guesswhat.broadcast.to(socket.room).emit("updateword", "The word was '" + magic[xyzzy] + "'");
    guesswhat.broadcast.to(socket.room).emit("updateword", "Player '" + socket.username + "' was the winner");

    // get new word
    if (xyzzy < magic.length) {
        xyzzy += 1;
    }
    else {
        xyzzy = 0;
    }
}

function parseChat(socket, data) {
    var line = Array.prototype.join.call(data, "");
    var words = line.split(" ");

    for (var i = 0; i < words.length; ++i) {
        console.log(words[i], magic[xyzzy]);
        if (words[i] === magic[xyzzy]) {
            winner(socket, magic[xyzzy]);
            reveal();
        }
    }
}

function transmitChat(socket) {
    // when the client emits "sendchat", this listens and executes
    socket.on("sendchat", function(data) {
        // we tell the client to execute "updatechat" with 2 parameters
        //server.sockets.emit("updatechat", socket.username, data);
        guesswhat.to(socket.room).emit("updatechat", socket.username, data);
        // check for magic word
        parseChat(socket, data);
    });
}

function clearCanvas(socket){
    socket.on("clearcanvas", function(data){
        line_history.length = 0;
    console.log("cleared....");
    guesswhat.to(socket.room).emit("clearcanvas");
    });
}


// Run server
server = startServer();
db = connectDB();
var guesswhat = server.of('/guesswhat');
// Main
//server.sockets.on("connection", function(socket) {
guesswhat.on("connection", function(socket){
    console.log("Connected: %s", socket.id);
    userLogin(socket);
    recordDraw(socket);
    transmitDraw(socket);
    transmitChat(socket);
    userLogout(socket);
    clearCanvas(socket);
});

