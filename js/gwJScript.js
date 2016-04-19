// Client-side code
/* jshint browser: true, jquery: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */
/* global console: true, _: true, Clipboard: true */
var main = function() {
        "use strict";
        var socket = io.connect();
        var hostname = "http://" + window.location.hostname;
        var port = location.port;

        var gw = {
            landpage: {
                section: {
                    navbar: "",
                    content: {
                        canvasDiv: "#divCanvas"
                    },
                    footer: ""
                },
                action: {
                    red: "#gwRed",
                    black: "#gwBlack",
                    green: "#gwGreen",
                    blue: "#gwBlue"
                },
            },
            canvas: {
                handle: "#gw_Canvas"
            },
            mouse: {
                click: false,
                move: false,
                pos: {
                    x: 0,
                    y: 0
                },
                pos_prev: false
            }
        };

        var context = $(gw.canvas.handle)[0].getContext('2d');
        var width = $(gw.landpage.section.content.canvasDiv).width();
        var height = $(gw.landpage.section.content.canvasDiv).height();

        //Function to handle Red Color
        $(gw.landpage.action.red).on('click', function() {
            context.strokeStyle = "#990000";
        });
        //Function to handle Black Color
        $(gw.landpage.action.black).on('click', function() {
                context.strokeStyle = "#000000";
            }
            //Function to handle Green Color						  );
            $(gw.landpage.action.green).on('click', function() {
                context.strokeStyle = "#006600";
            });
            //Function to handle blue Color
            $(gw.landpage.action.blue).on('click', function() {
                context.strokeStyle = "#0000ff";
            });

            //Function to HandleSocket Emit on mouse movements
            function handleSocketEmit() {
                // check if the user is drawing
                if (gw.mouse.click && gw.mouse.move && gw.mouse.pos_prev) {
                    // send line to to the server
                    socket.emit('draw_line', {
                        line: [gw.mouse.pos, gw.mouse.pos_prev]
                    });
                    gw.mouse.move = false;
                }
                gw.mouse.pos_prev = {
                    x: gw.mouse.pos.x,
                    y: gw.mouse.pos.y
                };
                setTimeout(handleSocketEmit, 25);
            }
            // Function to track User mouse events on canvas
            function handleDrawEvent() {
                $(gw.canvas.handle)[0].width = width;
                $(gw.canvas.handle)[0].height = height;

                $(gw.canvas.handle)[0].onmousedown = function(e) {
                    gw.mouse.click = true;
                };

                $(gw.canvas.handle)[0].onmouseup = function(e) {
                    gw.mouse.click = false;
                };

                $(gw.canvas.handle)[0].onmousemove = function(e) {
                    gw.mouse.pos.x = e.clientX / width;
                    gw.mouse.pos.y = e.clientY / height;
                    gw.mouse.move = true;
                }

                socket.on('draw_line', function(data) {
                    var line = data.line;
                    context.beginPath();
                    context.lineWidth = 2;
                    context.moveTo(line[0].x * width, line[0].y * height);
                    context.lineTo(line[1].x * width, line[1].y * height);
                    context.stroke();
                });
                handleSocketEmit();
            }

            handleDrawEvent();
        }

        $(document).ready(main);