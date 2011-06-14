$(function(){
    var apiUrl = localStorage["jenkins-url"];
    var jobName = localStorage["job-name"];
    var useWebsocket   = localStorage["use-websocket"];
    var websocketUrl   = localStorage["websocket-url"];

    if (apiUrl == null || jobName == null || (useWebsocket == 'true' && websocketUrl == null)) {
        return;
    }

    apiUrl = appendLastSlash(apiUrl);
    var prevBuild = -1;
    var JOB = "job/"
    var API_SUB  = "/lastBuild/api/json";
    var POLLING_TIME = 60 * 1000;

    $.ajaxSetup({
        "error": function() {
            $.fn.desktopNotify(
                {
                    picture: getIcon("FAILURE"),
                    title: "Failed to access to Jenkins",
                    text : apiUrl
                }
            );
        }
    });

    function appendLastSlash(url) {
        var lastChar = url.substring(url.length - 1);
        if (lastChar != "/") {
            return url + "/";
        }
        return url;
    }

    function getIcon(result) {
        var url = "images/blue.png";
        if (result == "UNSTABLE") {
            url = "images/yellow.png";
        } else if (result == "FAILURE") {
            url = "images/red.png";
        }
        return url;
    }

    function getColor(result) {
        var color = [0, 0, 255, 200];
        if (result == "UNSTABLE") {
            color =  [255, 255, 0, 200];
        } else if (result == "FAILURE") {
            color = [255, 0, 0, 200];
        }
        return color;
    }

    // replace popup event
    chrome.browserAction.setPopup({popup : ""});
    chrome.browserAction.onClicked.addListener(function(tab) {
        window.open(apiUrl + JOB + jobName);
    });

    function fetch(url) {
        $.getJSON(url, function(json, result) {
            if (result != "success") {
                return;
            }
            if (prevBuild != json.number) {
                prevBuild = json.number;
                chrome.browserAction.setBadgeText({text: String(json.number)});
                chrome.browserAction.setBadgeBackgroundColor({color: getColor(json.result)});
                $.fn.desktopNotify(
                    {
                        picture: getIcon(json.result),
                        title: "#" + json.number + " (" + json.result + ")",
                        text : json.actions[0].causes[0].shortDescription
                    }
                );
            }
        });
    }

    var connecting = false;
    function bind(wsUrl, url) {
        var ws = $("<div />");
        ws.bind("websocket::connect", function() {
            console.log('opened connection');
            connecting = true;
        });

        ws.bind("websocket::message", function(_, obj) {
            fetch(url);
        });

        ws.bind("websocket::error", function() {
            $.fn.desktopNotify(
                {
                    picture: getIcon("FAILURE"),
                    title: "Failed to access to Jenkins Websocket Notifier. Please check your websocket URL",
                    text : wsUrl
                }
            );
        });

        // auto reconnect
        ws.bind('websocket::close', function() {
            connecting = false;
            console.log('closed connection');
            setTimeout(function(){
                bind(websocketUrl, url);
            }, 5000);
        });

        ws.webSocket({
            entry : wsUrl
        });
    }

    var url = apiUrl + JOB + jobName + API_SUB;

    if (useWebsocket) {
        // resume
        var reload  = 5 * 60 * 1000;
        var before = new Date();
        setInterval(function() {
            var current = new Date();
            var diff = current - before;
            if ( diff > reload ) {
                if (connecting == false) {
                    bind(websocketUrl, url);
                }
            }
            before = current;
        }, reload);
        // first bind
        bind(websocketUrl, url);
    } else {
        fetch(url); // first fetch
        setInterval(function() {
            fetch(url);
        }, POLLING_TIME);
    }
});
