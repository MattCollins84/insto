/*
 *  InstoClient
 */
function InstoClient(apiKey, userData, userQuery, options, host) {
  
  /*** Code to async load socket.io library ***/
  this.addEvent = function(elm, evType, fn, useCapture) {
    //Credit: Function written by Scott Andrews
    //(slightly modified)
    var ret = 0;
  
    if (elm.addEventListener) {
        ret = elm.addEventListener(evType, fn, useCapture);
    } else if (elm.attachEvent) {
        ret = elm.attachEvent('on' + evType, fn);
    } else {
        elm['on' + evType] = fn;
    }
  
    return ret;
  };
	
	/*** async load ***/
  this.load = function(src, callback) {
    var a = document.createElement('script');
    a.type = 'text/javascript';
    a.src = src;
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(a, s);
    
    this.addEvent(a, 'load', callback, false);
  }
  
  if (typeof options != "object") {
  	options = {};
  }
  
  // setup callbacks
  var callbacks = {
  	onConnect: ((typeof options.onConnect == "function") ? options.onConnect : function(data) {}),
  	onConnectedUsers: ((typeof options.onConnectedUsers == "function") ? options.onConnectedUsers : function(data) {}),
  	onNotification: ((typeof options.onNotification == "function") ? options.onNotification : function(data) {}),
  	onQuery: ((typeof options.onQuery == "function") ? options.onQuery : function(data) {}),
  	onUserConnect: ((typeof options.onUserConnect == "function") ? options.onUserConnect : function(data) {}),
  	onUserDisconnect: ((typeof options.onUserDisconnect == "function") ? options.onUserDisconnect : function(data) {})
  }
  
  //check we have a host value
  if (typeof host == "undefined") {
    host = "http://api.insto.co.uk:3000";
  }
  
  //check we have a callback
  if (typeof callback != "function") {
    callback = function(data) {};
  }
  
  var _c;
  var socket;
  var _apiKey = apiKey
	var _hostname = window.location.hostname;
		
  this.load(host+"/socket.io/socket.io.js", function() {
		/*
		 *  Validation
		 *  Check that we have the required information provided 
		 */
	
		//make sure we have an API key 
		if (typeof apiKey != "string") {
			_c = false;
			throw 'Insto: You must supply a valid API key';
			return;
		}
	
		//check that userData is passed in
		if (typeof userData != "object") {
			_c = false;
			throw 'Insto: You must supply a valid Javascript object in the userData parameter';
			return;
		}
	
		//see if we have a user query
		if (typeof userQuery != "object") {
			userQuery = false;
		} else {
			userQuery._apiKey = _apiKey;
		}
	
		/*
		 *  Connect to Socket.IO server
		 */
		socket = io.connect(host); //our socket.io object
		console.log(socket);
		/*
		 *  Handle Socket.IO events
		 */
	
		// handle identify
		socket.on('identify', function(data) {
			socket.emit('identity', { "auth": {"apiKey": apiKey, "hostname": window.location.hostname}, "userData": userData, "userQuery": userQuery });
		});
	
		// listen for connection notification
		socket.on('connected', function(data) {
			callbacks.onConnect(data);
			return;
		});
		
		// listen forr API key failure
		socket.on('api-fail', function(data) {
			_c = false;
			throw 'Insto: '+data.msg;
			return;
		});
	
		// listen for incoming messages and send to callback
		socket.on('notification', function(msg) {
			callbacks.onNotification(msg);
		});
	
		// listen for incoming connection query matches
		socket.on('instousersconnected', function(msg) {
		
			var obj = new Object;
			obj.users = msg;
			callbacks.onConnectedUsers(obj);
		});
	
		// listen for incoming connection query matches
		socket.on('instoconnect', function(msg) {
			callbacks.onUserConnect(msg);
		});
	
		// listen for incoming disconnection query matches
		socket.on('instodisconnect', function(msg) {
			callbacks.onUserDisconnect(msg);
		});
	
		// listen for incoming disconnection query matches
		socket.on('instoquery', function(msg) {
		
			var obj = new Object;
			obj.users = msg;
			callbacks.onQuery(obj);
			
		});
  });
  
  /*
   *  Websocket API methods
   */
  
  // websocket API send request
  this.send = function(query, msg, sendToSelf) {
    
    if (typeof query != "object") {
      throw 'Insto: Invalid query object';
      return;
    }
    
    if (_c === false) {
      throw 'Insto: not connected';
      return;
    }
    
    // add apikey to query object
    query._apiKey = _apiKey;
    
    if (typeof msg != "object") {
      msg = {};
    }
    
    if (typeof sendToSelf == "undefined") {
      sendToSelf = false;
    }
    
    //create our object
    var obj = new Object;
    obj['_query'] = query;
    obj['_msg'] = new Object;
    obj['_msg'] = msg;
    obj['_sendToSelf'] = (sendToSelf)?true:false;

    //send our object
    socket.emit('api-send', obj);
    
  }
  
  // broadcast websocket API call
  this.broadcast = function(msg) {
    
    if (_c === false) {
      throw 'Insto: not connected';
      return;
    }
    
    var obj = new Object;
    obj['_msg'] = new Object;
    obj['_msg'] = msg;
    obj['_apiKey'] = _apiKey;
    
    //send our object
    socket.emit('api-broadcast', obj);
    
  }
  
  // handle query websocket API call
  this.query = function(query) {
    
    if (_c === false) {
      throw 'Insto: not connected';
      return;
    }
    
    // add apikey to query object
    query._apiKey = _apiKey;
    
    //send our object
    socket.emit('api-query', query);
    
  }
  
}
