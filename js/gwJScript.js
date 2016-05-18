// Client-side code
/* jshint browser: true, jquery: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true */
/* global io: true, ko: true, xssFilters: true, console: true */

var main = function() {
    "use strict";

    //var socket = io.connect();
    var socket = io("/guesswhat");
    var reconnect = true;
    var painting = true;
    var loggedin = false;

    var gw = {
        landpage: {
            section: {
                navbar: {
                    handle: "#mainnav",
                    startGame: "#gwStart",
                    logout: "#logoutLink",
                    showTime: "#showtimer"
                },
                content: {
                    canvasDiv: "#divCanvas",
                    chatform: {
                        handle: "#gwChatForm",
                        field: {
                            sendButton: "#gwChatButton",
                            sendText: "#gwChatText"
                        }
                    },
                    hintCard: {
                        handle: "#hintCard",
                        definition: "#definition",
                        word: "#magicwrd",
                        changeWord: "#changeword",
                        startDrawing: "#startDrawing"
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
                    startCard: {
                        handle: "#gameStartCard",
                        message: "#playerInit"
                    },
                    activeusersList: "#gwActiveUser",
                    colorPicker: "#gwColorPicker",
                    chatMessages: "#gwMessages",
                    word: "#gwPrompt"
                },
                footer: ""
            },
            action: {
                handle: ".picker",
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

    function clearCanvas() {
        context.clearRect(0, 0, width, height);
        console.log("canvas cleared");
    }

    //Function to handle Clear Canvas button
    $(gw.landpage.action.clearCanvas).on("click", function() {
        socket.emit("clearcanvas");
        clearCanvas();
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
        if (painting && gw.mouse.click && gw.mouse.move) {
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
    function formSuccess() {
        $(gw.landpage.section.content.playCard.status).removeClass("toggleshow");
        $(gw.landpage.section.content.playCard.status).removeClass("alert-danger").addClass("alert-success");
        $(gw.landpage.section.content.playCard.status).html("<strong>Success!</strong> Joining a game");
        $(gw.landpage.section.content.playCard.status).show().fadeOut(500);

        $(gw.landpage.section.content.playCard.handle).modal("hide");
        reconnect = false;
        loggedin = true;

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

    // autofocus modal input
    $(gw.landpage.section.content.playCard.handle).on("shown.bs.modal", function () {
        $(gw.landpage.section.content.playCard.username).focus();
    });

    // autofocus chat input
    $(gw.landpage.section.content.playCard.handle).on("hidden.bs.modal", function () {
       $(gw.landpage.section.content.chatform.field.sendText).focus();
    });

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

    // get a word
    $(gw.landpage.section.navbar.startGame).on("click", function() {
        socket.emit("getmagicword");
        $(gw.landpage.action.handle).prop("disabled", false);
        $(gw.landpage.section.content.chatform.field.sendButton).prop("disabled", true);
        $(gw.landpage.section.content.chatform.field.sendText).prop("disabled", true);
    });

    // get another word
    $(gw.landpage.section.content.hintCard.changeWord).on("click", function() {
        socket.emit("getmagicword");
    });

    // start the game
    $(gw.landpage.section.content.hintCard.startDrawing).on("click", function() {
        console.log("player", socket.id);
        socket.emit("startgame", socket.id);
    });

    // logout
    $(gw.landpage.section.navbar.logout).on("click", function() {
        console.log("logging out");
        clearCanvas();
        $(gw.landpage.section.content.activeusersList).empty();
        $(gw.landpage.section.content.chatMessages).empty();
        reconnect = true;
        loggedin = false;
        window.onbeforeunload = null;
        socket.emit("logout");
        $(gw.landpage.section.content.playCard.handle).modal("show");
    });

    // handle chat message input
    $(gw.landpage.section.content.chatform.handle).submit(function() {
        var data = $(gw.landpage.section.content.chatform.field.sendText).val();

        // sanitize chat message
        data = xssFilters.inHTMLData(data);
        if (data.indexOf(">") !== -1) {
            console.log("Warning, message cannot contain HTML tags");
        }

        socket.emit("sendchat", socket.id, data);
        return false;
    });

    socket.on("disconnect", function() {
        reconnect = true;
        console.log("server down");
        window.onbeforeunload = null;
    });

    // call the server-side function "adduser" and send two parameters (mode, name)
    socket.on("connect", function() {
        $(gw.landpage.action.handle).prop("disabled", false);
        $(gw.landpage.section.content.chatform.field.sendButton).prop("disabled", false);
        $(gw.landpage.section.content.chatform.field.sendText).prop("disabled", false);
        $(gw.landpage.section.content.playCard.handle).modal({backdrop: "static",keyboard: false});
        $(gw.landpage.section.content.playCard.handle).modal("show");

        // handle username input
        $(gw.landpage.section.content.playCard.form).submit(function(event) {
            var newuser = $(gw.landpage.section.content.playCard.username).val();
            var grpname = $(gw.landpage.section.content.playCard.groupname).val();

            // sanitize username and group name
            newuser = xssFilters.inHTMLData(newuser);
            grpname = xssFilters.inHTMLData(grpname);

            if (newuser.toUpperCase() === "SERVER") {
                newuser = "NA";
            }
            else if (newuser.toLowerCase().indexOf("script>") !== -1) {
                console.log("Nice try, script kiddy");
                newuser = "NA";
            }

            if (grpname.toLowerCase() === "freeforall") {
                grpname = "NA";
            }
            else if (grpname.toUpperCase().indexOf("SCRIPT>") !== -1) {
                console.log("Nice try, script kiddy");
                grpname = "NA";
            }

            if ($(gw.landpage.section.content.playCard.btn1).hasClass("active")) {

                if (newuser.length > 2) {
                    socket.emit("adduser", 1, newuser, "", function(err, msg) {
                        console.log(err);
                        if (msg === "SUCCESS") {
                            if (reconnect) {
                                console.log("connect socket #1");
                                formSuccess();
                            }
                        }
                        else {
                            formFailure("Username already taken");
                            $(gw.landpage.section.content.playCard.username).val("");
                            event.preventDefault();
                        }

                    });
                }
                else {
                    formFailure("Invalid username");
                    $(gw.landpage.section.content.playCard.username).val("");
                    event.preventDefault();
                }

                return false;
            }
            else if ($(gw.landpage.section.content.playCard.btn2).hasClass("active")) {

                if (newuser.length > 2 && grpname.length > 2) {
                    socket.emit("adduser", 2, newuser, grpname, function(err, msg) {
                        console.log(err);
                        if (msg === "SUCCESS") {
                            if (reconnect) {
                                console.log("connect socket #2");
                                formSuccess();
                            }
                        }
                        else {
                            formFailure("Username already taken in room");
                            $(gw.landpage.section.content.playCard.username).val("");
                            event.preventDefault();
                        }

                    });
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

                return false;
            }
            else {
                formFailure("Unable to join game");
                $(gw.landpage.section.content.playCard.username).val("");
                $(gw.landpage.section.content.playCard.groupname).val("");
                event.preventDefault();
            }
        });
    });

    function chatBubble(username, content, userid, timestamp) {
        var chatmsg = "";

        if (userid === 0) {
            chatmsg = "<p class='gwMsg'><strong>" + "SERVER: " + content + "</strong></p>";
        }
        else if (userid === socket.id) {
            chatmsg = "<div class='chatYou'><div class='spacer'></div><div class='gwMsg'>";
            chatmsg += "<p>" + content + "</p><span class='msginfo'>" + username;
            chatmsg += "&nbsp;&bull;&nbsp;<span data-livestamp='" + timestamp + "'></span></span></div></div>";
        }
        else {
            chatmsg = "<div class='chatThem'><div class='spacer'></div><div class='gwMsg'>";
            chatmsg += "<p>" + content + "</p><span class='msginfo'>" + username;
            chatmsg += "&nbsp;&bull;&nbsp;<span data-livestamp='" + timestamp + "'></span></span></div></div>";
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

    // listener, whenever the server emits "updateword", this updates the game round
    socket.on("updateword", function(data) {
        var bubble = chatBubble("SERVER", data, 0);
        $(gw.landpage.section.content.chatMessages).append(bubble);
        context.clearRect(0, 0, width, height);
        autoScroll();
    });

    socket.on("updateusers", function(data) {
        $(gw.landpage.section.content.activeusersList).empty();
        $.each(data, function(key, value) {
            $(gw.landpage.section.content.activeusersList).append("<p>" + key + "    <span class='badge'>" + value + "</span></p><div>");
        });
    });

    socket.on("clearcanvas", function() {
        clearCanvas();
    });

    socket.on("incTimer", function(data, userid) {
        if (loggedin) {
            $(gw.landpage.section.navbar.showTime).text("  " + data);
        }

        if (data > 0 && data < 90) {
            console.log("except", userid);
            if (userid !== socket.id) {
                painting = false;
                $(gw.landpage.action.handle).prop("disabled", true);
            }

            $(gw.landpage.section.navbar.startGame).hide();
        }
    });

    socket.on("message", function(data) {
        console.log(data.magicwrdmeaning, data.magicwrd);
        $(gw.landpage.section.content.hintCard.definition).text(data.magicwrdmeaning);
        $(gw.landpage.section.content.hintCard.word).text(data.magicwrd);
        $(gw.landpage.section.content.hintCard.handle).modal({backdrop: "static",keyboard: false});
        $(gw.landpage.section.content.hintCard.handle).modal("show");
        $(gw.landpage.section.navbar.startGame).hide();
        console.log("painting", painting);
    });

    socket.on("disablePlay", function() {
        $(gw.landpage.section.navbar.startGame).hide();
    });

    socket.on("enablePlay", function() {
        $(gw.landpage.section.navbar.startGame).show();
        $(gw.landpage.action.handle).prop("disabled", false);
        $(gw.landpage.section.content.chatform.field.sendButton).prop("disabled", false);
        $(gw.landpage.section.content.chatform.field.sendText).prop("disabled", false);
        painting = true;
    });

    socket.on("gameStarted", function(data) {
        $(gw.landpage.section.content.startCard.message).text(data);
         $(gw.landpage.section.content.startCard.handle).modal("show");
    });
    // View Model to handle typing indicator
    function TypingViewModel() {
        this.isTyping = ko.observable("");
        this.stoppedTyping = ko.pureComputed(this.isTyping)
            .extend({ rateLimit: { method: "notifyWhenChangesStop", timeout: 3000 } });

        this.reset = function() {
            this.isTyping("");
        };

        this.isTyping.subscribe(function (newValue) {
             if(newValue !== "") {
                 $("#typing").text("...");
             }
             else {
                 $("#typing").text("");
             }
        }, this);

        this.stoppedTyping.subscribe(function (newValue) {
             if(newValue !== "") {
                 $("#typing").text("stopped typing");
             }
             else {
                 $("#typing").text("");
             }
        }, this);
    }

    handleDrawEvent();

    // Activate knockout.js
    ko.applyBindings(new TypingViewModel());
};

$(document).ready(main);
