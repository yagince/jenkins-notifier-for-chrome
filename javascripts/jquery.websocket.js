(function($) {
    jQuery.fn.webSocket = function(config){
	var defaults = {
	    _class    : WebSocket,
	    entry : 'ws://' + location.hostname + ':18081/room',
	};
	config = jQuery.extend(defaults, config);

	var target = this;
	function fire(name, data){
	    target.trigger(name, data);
	}

	var ws = new config._class(config.entry);
	ws.onopen = function() {
	    fire('websocket::connect', ws);
	}
	ws.onmessage = function(text){
	    var obj = jQuery.parseJSON(text.data);
	    fire('websocket::message', obj);
	}
	ws.onerror = function(msg){
	    fire('websocket::error', msg);
	}
	return this;
    }
})(jQuery);
