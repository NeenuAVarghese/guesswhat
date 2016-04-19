var express = require('express');
var gw = {
    port: 3000,
    staticHtml: "./"
};

var app = express();

app.use(express.static('./'));
app.use(express.static('./libraries/bootstrap/'));

var server;
var io;
var line_history = [];


server = app.listen(gw.port, function() {
    console.log("Multiplayer app listening on port 3000");
});

io = require('socket.io').listen(server);
io.sockets.on('connection', function(socket) {
    console.log('Connected: %s', socket.id);
    for (var i in line_history) {
        socket.emit('draw_line', {
            line: line_history[i]
        });
    }


    socket.on('draw_line', function(data) {
        line_history.push(data.line);
        io.emit('draw_line', {
            line: data.line
        });
    });


    socket.on('disconnect', function() {
        console.log("User Disconnected");
    });
});