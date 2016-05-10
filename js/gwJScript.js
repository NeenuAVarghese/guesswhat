// Client-side code
/* jshint browser: true, jquery: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */
/* global io: true, console: true */

var main = function() {
    "use strict";

    //var socket = io.connect();
    var socket = io("/guesswhat");

    var gw = {
        landpage: {
            section: {
                navbar: {
                    handle: "#mainnav",
                    startGame: "#gamestartlnk",
                    logout: "#logoutLink",
                    showTime: "#showtimer"
                },
                content: {
                    canvasDiv: "#divCanvas",
                    chatform: {
                        handle: "#gwChatForm",
                        field: {
                            sendButton: "#gwChatButton"
                        }
                    },
                    hintCard: {
                        handle: "#hintCard",
                        definition: "#definition",
                        word: "#magicwrd"
                    },
                    playCard: {
                        handle: "#playCard",
                        expand: "#toggleFit",
                        welcome: "#modal-welcome",
                        moretext: "#modal-description",
                        form: "#playForm",
                        btn1: "#btn-solo",
                        btn2: "#btn-teams",
                        status: "#playStatus",
                        submit: "#playSubmit",
                        username: "#nameInput",
                        groupdiv: ".groupname",
                        groupname: "#groupInput"
                    },
                    activeusersList: "#gwActiveUser",
                    colorPicker: "#gwColorPicker",
                    chatMessages: "#gwMessages",
                    word: "#gwPrompt"
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
        socket.emit("clearcanvas", "hello");
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

        setTimeout(handleSocketEmit, 5);
    }

    function drawCanvas(x, y, pX, pY, c) {

                context.beginPath();
                context.lineWidth = 5;
                context.lineJoin = context.lineCap = "round";
                context.strokeStyle = c;
                context.moveTo(pX, pY);
                context.lineTo(x, y);
                context.stroke();
    }

    // Function to track User mouse events on canvas
    function handleDrawEvent() {
        var touchcanvas = document.getElementById("gw_Canvas");
        $(gw.canvas.handle)[0].width = width;
        $(gw.canvas.handle)[0].height = height;

        touchcanvas.addEventListener("touchstart", function(e) {
            gw.mouse.click = true;
            if (e) {
                console.log("error", "onTouchstart", e);
            }
        }, false);

        touchcanvas.addEventListener("touchmove", function(e) {
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

        $(gw.canvas.handle)[0].onmousedown = function() {
            gw.mouse.click = true;
        };

        $(gw.canvas.handle)[0].onmouseup = function() {
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

        

        socket.on("draw_line", function(data) {
            drawCanvas(data.x, data.y, data.prevX, data.prevY, data.color);
        });

        handleSocketEmit();
    }

    function autoScroll() {
        // get height of chat box
        var h = 0;
        $(".gwMsg").each(function() {
            h += parseInt($(this).height()) + 20;
        });
        h = h.toString();
        // scroll to bottom of chat
        $(".chatPanel").animate({scrollTop: h});
    }

    // login success
    function formSuccess(mode, user, group) {
        $(gw.landpage.section.content.playCard.status).removeClass("toggleshow");
        $(gw.landpage.section.content.playCard.status).removeClass("alert-danger").addClass("alert-success");
        $(gw.landpage.section.content.playCard.status).html("<strong>Success!</strong> Joining a game");
        $(gw.landpage.section.content.playCard.status).show().fadeOut(500, function() {
            console.log("connect socket #" + mode);
            socket.emit("adduser", mode, user, group);
        });

        $(gw.landpage.section.content.playCard.handle).modal("hide");

        // Confirm leaving webapp
        window.onbeforeunload = function() {
            return "";
        };
    }

    // login error
    function formFailure(error) {
        $(gw.landpage.section.content.playCard.status).removeClass("toggleshow");
        $(gw.landpage.section.content.playCard.status).removeClass("alert-success").addClass("alert-danger");
        $(gw.landpage.section.content.playCard.status).html("<strong>Error!</strong> " + error).show().fadeOut(2000);
    }

    // handle expand button toggle
    $(gw.landpage.section.content.playCard.expand).on("click", function() {
        if ($(this).hasClass("glyphicon-chevron-down")) {
            $(gw.landpage.section.content.playCard.welcome).removeClass("fitonmodal");
            $(gw.landpage.section.content.playCard.moretext).removeClass("fitonmodal");
            $(this).removeClass("glyphicon-chevron-down").addClass("glyphicon-chevron-right");
        }
        else {
            $(gw.landpage.section.content.playCard.welcome).addClass("fitonmodal");
            $(gw.landpage.section.content.playCard.moretext).addClass("fitonmodal");
            $(this).removeClass("glyphicon-chevron-right").addClass("glyphicon-chevron-down");
        }
    });

    // handle mode button toggle
    $(gw.landpage.section.content.playCard.btn1).on("click", function() {
        $(this).addClass("active");
        $(gw.landpage.section.content.playCard.btn2).removeClass("active");
        $(gw.landpage.section.content.playCard.groupdiv).addClass("toggleshow");
    });

    $(gw.landpage.section.content.playCard.btn2).on("click", function() {
        $(this).addClass("active");
        $(gw.landpage.section.content.playCard.btn1).removeClass("active");
        $(gw.landpage.section.content.playCard.groupdiv).removeClass("toggleshow");
    });
    //startGame
    $(gw.landpage.section.navbar.startGame).on("click", function(){
        console.log("in func");
        socket.emit("startgame");
    });

    // logout
    $(gw.landpage.section.navbar.logout).on("click", function() {
        console.log("logging out");
        $(gw.landpage.section.content.activeusersList).empty();
        socket.emit("disconnect", function() {
            socket.disconnect();
        });
        $(gw.landpage.section.content.playCard.handle).modal("show");
    });

    /* show definition
    $(gw.landpage.section.content.word).on("click", function() {
        $(gw.landpage.section.content.hintCard.handle).modal("show");
    });*/

    // handle chat message input
    $(gw.landpage.section.content.chatform.handle).submit(function() {
        socket.emit("sendchat", socket.id, $(gw.landpage.section.content.chatform.field.sendButton).val());
        $(gw.landpage.section.content.chatform.field.sendButton).val("");
        return false;
    });

    // call the server-side function "adduser" and send two parameters (mode, name)
    socket.on("connect", function() {
        $(gw.landpage.section.content.playCard.handle).modal({backdrop: "static",keyboard: false});
        $(gw.landpage.section.content.playCard.handle).modal("show");

        // handle username input
        $(gw.landpage.section.content.playCard.form).submit(function(event) {
            var newuser = $(gw.landpage.section.content.playCard.username).val();
            var grpname = $(gw.landpage.section.content.playCard.groupname).val();

            if (newuser.toUpperCase() === "SERVER") {
                newuser = "NA";
            }

            if (grpname.toLowerCase() === "freeforall") {
                grpname = "NA";
            }

            if ($(gw.landpage.section.content.playCard.btn1).hasClass("active")) {
                if (newuser.length > 2) {
                    formSuccess(1, newuser, "");
                    return false;
                }
                else {
                    formFailure("Invalid username");
                    $(gw.landpage.section.content.playCard.username).val("");
                    event.preventDefault();
                }
            }
            else if ($(gw.landpage.section.content.playCard.btn2).hasClass("active")) {
                if (grpname.length > 2 && newuser.length > 2) {
                    formSuccess(2, newuser, grpname);
                    return false;
                }
                else if (newuser.length > 2) {
                    formFailure("Invalid group name");
                    $(gw.landpage.section.content.playCard.groupname).val("");
                    event.preventDefault();
                }
                else {
                    formFailure("Invalid username");
                    $(gw.landpage.section.content.playCard.username).val("");
                    event.preventDefault();
                }
            }
            else {
                formFailure("Unable to join game");
                $(gw.landpage.section.content.playCard.username).val("");
                event.preventDefault();
            }
        });
    });

    function chatBubble(username, content, userid, timestamp) {
        var chatmsg = "";

        if (userid === 0) {
            chatmsg = "<p class='gwMsg'><span class='glyphicon glyphicon-asterisk'></span><strong>" + "SERVER: " + content + "</strong></p>";
        }
        else if (userid === socket.id) {
            chatmsg = "<div class='chatYou'><div class='spacer'></div><div class='gwMsg'><p>" + content + "</p><span class='msginfo'>" + username + "&nbsp;&bull;<time datetime='" + timestamp + "'></time></span></div></div>";
        }
        else {
            chatmsg = "<div class='chatThem'><div class='spacer'></div><div class='gwMsg'><p>" + content + "</p><span class='msginfo'>" + username + "&nbsp;&bull;<time datetime='" + timestamp + "'></time></span></div></div>";
        }

        return chatmsg;
    }

    // listener, whenever the server emits "updatechat", this updates the chat body
    socket.on("updatechat", function(username, data, userid, timestamp) {
        if (timestamp === undefined || timestamp === null) {
            timestamp = 0;
        }

        var bubble = chatBubble(username, data, userid, timestamp);
        $(gw.landpage.section.content.chatMessages).append(bubble);
        autoScroll();
    });

    /* listener, whenever the server emits "updateword", this updates the game round
    socket.on("displayword", function(word, definition) {
        console.log("displayword");
        $(gw.landpage.section.content.word).text(word);
        $(gw.landpage.section.content.hintCard.definition).text(definition);
    });*/

    // listener, whenever the server emits "updateword", this updates the game round
    socket.on("updateword", function(data) {
        var bubble = chatBubble("SERVER", data, 0);
        $(gw.landpage.section.content.chatMessages).append(bubble);
        context.clearRect(0, 0, width, height);
        autoScroll();
    });

    socket.on("updateusers", function(data) {
        $(gw.landpage.section.content.activeusersList).empty();
        data.forEach(function(key){
            $(gw.landpage.section.content.activeusersList).append("<span class='label label-info'>" + key +"</span><div>");
        });
    });

    socket.on("clearcanvas", function() {
        context.clearRect(0, 0, width, height);
    });

    socket.on("incTimer", function(data){
        $(gw.landpage.section.navbar.showTime).text("  "+data);
    });
    socket.on("message", function(data){
        console.log(data.magicwrdmeaning, data.magicwrd);
        $(gw.landpage.section.content.hintCard.definition).text(data.magicwrdmeaning);
        $(gw.landpage.section.content.hintCard.word).text(data.magicwrd);
        $(gw.landpage.section.content.hintCard.handle).modal("show");
        //$(gw.landpage.section.navbar.startGame).attr('disabled','disabled');
    });

  

    handleDrawEvent();
};

$(document).ready(main);
