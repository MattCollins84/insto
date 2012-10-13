/*
 *  InstoClient
 *  This will be included in the client side
 *  To provide Websocket API features
 */
function InstoClient(userData, userQuery, callback, host, protocol) {
  
  /*
   *  Validation
   *  Check that we have the required information provided 
   */
   
  //check that userData is passed in
  if (typeof userData != "object") {
    throw 'Insto: You must supply a valid Javascript object in the first parameter';
    return;
  }
  
  //see if we have a user query
  if (typeof userQuery != "object") {
    userQuery = false;
  }
  
  //check we have a host value
  if (typeof host == "undefined") {
    host = "http://ec2-176-34-192-217.eu-west-1.compute.amazonaws.com:3000";
  }
  
  //check we have a callback
  if (typeof callback != "function") {
    callback = function(data) {};
  }
  
  /*
   *  Connect to Socket.IO server
   */
  var socket = io.connect(host); //our socket.io object
  
  /*
   *  Handle Socket.IO events
   */
  
  // handle identify
  socket.on('identify', function(data) {
    socket.emit('identity', { "userData": userData, "userQuery": userQuery });
  });
  
  // listen for incoming messages and send to callback
  socket.on('notification', function(msg) {
    msg._type = "notification";
    callback(msg);
  });
  
  // listen for incoming connection query matches
  socket.on('instousersconnected', function(msg) {
    
    var obj = new Object;
    obj._type = "connectedusers"
    obj.users = msg;
    callback(obj);
  });
  
  // listen for incoming connection query matches
  socket.on('instoconnect', function(msg) {
    msg._type = "connect";
    callback(msg);
  });
  
  // listen for incoming disconnection query matches
  socket.on('instodisconnect', function(msg) {
    msg._type = "disconnect";
    callback(msg);
  });
  
  // listen for incoming disconnection query matches
  socket.on('instoquery', function(msg) {
    
    var obj = new Object;
    obj._type = "query";
    obj.users = msg;
    callback(obj);
  });
  
  
  /*
   *  Websocket API methods
   */
  
  // websocket API send request
  this.send = function(query, msg) {
    
    if (typeof query != "object") {
      throw 'Insto: Invalid query object';
    }
    
    //create our object
    var obj = new Object;
    obj['_query'] = query;
    obj['_msg'] = new Object;
    obj['_msg']['msg'] = msg;

    //send our object
    socket.emit('api-send', obj);
    
  }
  
  // broadcast websocket API call
  this.broadcast = function(msg) {
    
    var obj = new Object;
    obj['_msg'] = new Object;
    obj['_msg']['msg'] = msg;
    
    //send our object
    socket.emit('api-broadcast', obj);
    
  }
  
  // handle query websocket API call
  this.query = function(query) {

    //send our object
    socket.emit('api-query', query);
    
  }
  
}
