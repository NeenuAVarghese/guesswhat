// Server-side code
/* jshint node: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */

"use strict";

// Config
var port = 8080;
var line_history = [];
var usernames = {};
var magic = "elephant";

// Depends
var express = require("express");
var io = require("socket.io");

// Initialize
var app = express();

app.use(express.static("./"));

// Run server
var server = io.listen(app.listen(port, function() {
    console.log("Start express server on port", port);
}));

// Functions
function userLogin(socket) {
    // when the client emits "adduser", this listens and executes
    socket.on("adduser", function(username) {
        // we store the username in the socket session for this client
        socket.username = username;
        // add the client"s username to the global list
        usernames[username] = username;
        // echo to client they've connected
        socket.emit("updatechat", "SERVER", "you have connected");
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit("updatechat", "SERVER", username + " has connected");
        // update the list of users in chat, client-side
        server.sockets.emit("updateusers", usernames);
    });
}

function userLogout(socket) {
    // when the user disconnects.. perform this
    socket.on("disconnect", function() {
        console.log("User:", socket.username, "Disconnected");
        // remove the username from global usernames list
        delete usernames[socket.username];
        // update list of users in chat, client-side
        server.sockets.emit("updateusers", usernames);
        // echo globally that this client has left
        socket.broadcast.emit("updatechat", "SERVER", socket.username + " has disconnected");
    });
}

function recordDraw(socket) {
    for (var i in line_history) {
        // FIXME
        if (line_history[i] !== null) {
            // Debugging
            //console.log("Record draw", line_history[i]);
            socket.emit("draw_line", line_history[i]);
        }
    }
}

function transmitDraw(socket) {
    socket.on("draw_line", function(data) {
        line_history.push(data);
        socket.emit("draw_line", data);
    });
}

function parseChat(socket, data) {
    var line = Array.prototype.join.call(data, "");
    var words = line.split(" ");

    for (var i = 0; i < words.length; ++i) {
        // Debugging
        //console.log("word", words[i]);

        if (words[i] === magic) {
            console.log("Winner", socket.username);
            // echo to client they've won
            socket.emit("updatechat", "SERVER", "you win!");
            socket.emit("updatechat", "SERVER", "the word was: " + magic);
            // echo globally (all clients) that a person has won
            socket.broadcast.emit("updatechat", "SERVER", "the word was: " + magic);
            socket.broadcast.emit("updatechat", "SERVER", "player " + socket.username + " was the winner");
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

// Main
server.sockets.on("connection", function(socket) {
    console.log("Connected: %s", socket.id);
    userLogin(socket);
    recordDraw(socket);
    transmitDraw(socket);
    transmitChat(socket);
    userLogout(socket);
});
