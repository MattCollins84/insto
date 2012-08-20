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
    host = "http://127.0.0.1:3000";
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

}
