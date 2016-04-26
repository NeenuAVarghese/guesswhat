// Client-side code
/* jshint browser: true, jquery: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */
/* global io: true, prompt: true, console: true */

var main = function() {
    "use strict";

    var socket = io.connect();

    //var hostname = "http://" + window.location.hostname;
    //var port = location.port;

    var gw = {
        landpage: {
            section: {
                navbar: "",
                content: {
                    canvasDiv: "#divCanvas",
                    chatform: {
                        handle: "#gwChatForm",
                        field: {
                            sendButton: "#gwChatButton"
                        }
                    },
                    playCard: {
                        handle: "#playCard",
                        input: "#playInput",
                        form: "#playForm",
                        btn1: "#btn-solo",
                        btn2: "#btn-teams",
                        status: "#playFooter",
                        playSubmitBtn: "#playSubmit"
                    },
                    activeusersList: "#gwActiveUser",
                    colorPicker: "#gwColorPicker",
                    chatMessages: "#gwMessages"
                },
                footer: ""
            },
            action: {
                red: "#gwRed",
                black: "#gwBlack",
                green: "#gwGreen",
                blue: "#gwBlue",
                clearCanvas: "#gwClear"
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
            pos_prev: {
                x:0,
                y:0
            }
        },
        color: "#000000"
    };

    var context = $(gw.canvas.handle)[0].getContext("2d");
    var width = $(gw.landpage.section.content.canvasDiv).width();
    var height = $(gw.landpage.section.content.canvasDiv).height();

    //Function to handle Clear Canvas
    $(gw.landpage.action.clearCanvas).on("click", function() {
        context.clearRect(0, 0, width, height);
    });
    //Function to handle Red Color
    $(gw.landpage.action.red).on("click", function() {
        gw.color = "#990000";
    });
    //Function to handle Black Color
    $(gw.landpage.action.black).on("click", function() {
        gw.color = "#000000";
    });
    //Function to handle Green Color
    $(gw.landpage.action.green).on("click", function() {
        gw.color = "#006600";
    });
    //Function to handle blue Color
    $(gw.landpage.action.blue).on("click", function() {
        gw.color = "#0000ff";
    });

    //Function to HandleSocket Emit on mouse movements
    function handleSocketEmit() {
        // check if the user is drawing
        if (gw.mouse.click && gw.mouse.move) {
            socket.emit("draw_line", {
                x: gw.mouse.pos.x,
                y: gw.mouse.pos.y,
                prevX: gw.mouse.pos_prev.x,
                prevY: gw.mouse.pos_prev.y,
                color: gw.color
            });
            gw.mouse.move = false;
        }

        setTimeout(handleSocketEmit, 25);
    }
    // Function to track User mouse events on canvas
    function handleDrawEvent() {
        var touchcanvas = document.getElementById('gw_Canvas');
        $(gw.canvas.handle)[0].width = width;
        $(gw.canvas.handle)[0].height = height;

        touchcanvas.addEventListener('touchstart', function(e) {
            gw.mouse.click = true;
            if (e) {
                console.log("error", "onTouchstart", e);
            }
        }, false);

        touchcanvas.addEventListener('touchmove', function(e) {
            if (e) {
                console.log("error", "ontouchmove", e);
            }

            gw.mouse.pos_prev.x = gw.mouse.pos.x;
            gw.mouse.pos_prev.y = gw.mouse.pos.y;

            var offset = $(this).offset();
            gw.mouse.pos.x = e.pageX - offset.left;
            gw.mouse.pos.y = e.pageY - offset.top;
            gw.mouse.move = true;
        }, false);

        $(gw.canvas.handle)[0].onmousedown = function(e) {
            gw.mouse.click = true;
        };

        $(gw.canvas.handle)[0].onmouseup = function(e) {
            gw.mouse.click = false;
        };

        $(gw.canvas.handle)[0].onmousemove = function(e) {
            gw.mouse.pos_prev.x = gw.mouse.pos.x;
            gw.mouse.pos_prev.y = gw.mouse.pos.y;

            var offset = $(this).offset();
            gw.mouse.pos.x = e.pageX - offset.left;
            gw.mouse.pos.y = e.pageY - offset.top;
            gw.mouse.move = true;
        };

        function drawCanvas(x, y, pX, pY, c) {
                context.beginPath();
                context.lineWidth = 2;
                context.strokeStyle = c;
                context.moveTo(pX, pY);
                context.lineTo(x, y);
                context.closePath();
                context.stroke();
        }

        socket.on("draw_line", function(data) {
            drawCanvas(data.x, data.y, data.prevX, data.prevY, data.color);
        });

        handleSocketEmit();
    }

    function autoScroll() {
        // get height of chat box
        var h = 0;
        $(".gwMsg").each(function(i, value) {
            h += parseInt($(this).height()) + 20;
        });
        h = h.toString();

        // scroll to bottom of chat
        $(".chatPanel").animate({scrollTop: h});
    }

    // load modal when page loads
    //$(gw.landpage.section.content.playCard.handle).modal({backdrop: "static",keyboard: false});

    // handle button toggle
    $(gw.landpage.section.content.playCard.btn1).on("click", function() {
        $(this).addClass("active");
        $(gw.landpage.section.content.playCard.btn2).removeClass("active");
    });
    $(gw.landpage.section.content.playCard.btn2).on("click", function() {
        $(this).addClass("active");
        $(gw.landpage.section.content.playCard.btn1).removeClass("active");
    });



    $("#logoutLink").on("click", function() {
        console.log("logging out");
        socket.emit("logout", function() {
            socket.disconnect();
        });
        $(gw.landpage.section.content.playCard.handle).modal("show");
    });

    // handle chat message input
    $(gw.landpage.section.content.chatform.handle).submit(function() {
        socket.emit("sendchat", $(gw.landpage.section.content.chatform.field.sendButton).val());
        $(gw.landpage.section.content.chatform.field.sendButton).val("");
        return false;
    });

    // call the server-side function "adduser" and send one parameter (value of prompt)
    socket.on("connect", function() {
        //socket.emit("adduser", prompt("newuser"));

        $(gw.landpage.section.content.playCard.handle).modal("show");
        // handle username input
        $(gw.landpage.section.content.playCard.form).submit(function(event) {
            var newuser = $(gw.landpage.section.content.playCard.input).val();

            if (newuser.length > 2) {
                $(gw.landpage.section.content.playCard.status).append("<div class='alert alert-success'><strong>Success!</strong> Joining a game</div>").show().fadeOut(2000);

                if ($(gw.landpage.section.content.playCard.btn1).hasClass("active")) {
                    console.log("connect socket #1");
                    socket.emit("adduser", newuser);
                    //connectSocket(newuser, "solo");
                }
                else if ($(gw.landpage.section.content.playCard.btn2).hasClass("active")) {
                    console.log("connect socket #2");
                    socket.emit("adduser", newuser);
                    //connectSocket(newuser, "team");
                }
                $(gw.landpage.section.content.playCard.handle).modal("hide");
                return false;
            }
            else {
                $(gw.landpage.section.content.playCard.status).append("<div class='alert alert-danger'><strong>Error!</strong> Unable to join game</div>").show().fadeOut(2000);
                event.preventDefault();
                $(gw.landpage.section.content.playCard.handle).modal("hide");
            }
        });
    });

    // listener, whenever the server emits "updatechat", this updates the chat body
    socket.on("updatechat", function(username, data) {
        $(gw.landpage.section.content.chatMessages).append("<p class='gwMsg'><span class='glyphicon glyphicon-asterisk'></span><strong>" + username + ":</strong> " + data + "</p>");
        autoScroll();
    });

    // listener, whenever the server emits "updateword", this updates the game round
    socket.on("updateword", function(data) {
        $(gw.landpage.section.content.chatMessages).append("<p class='gwMsg'><span class='glyphicon glyphicon-asterisk'></span><strong>" + "SERVER: " + data + "</strong></p>");
        context.clearRect(0, 0, width, height);
        autoScroll();
    });

    socket.on("updateusers", function(data) {
        $(gw.landpage.section.content.activeusersList).empty();
        $.each(data, function(key, value) {
            $(gw.landpage.section.content.activeusersList).append("<span class='label label-info'>" + key +"</span><div>");
        });
    });

    handleDrawEvent();
};

$(document).ready(main);
