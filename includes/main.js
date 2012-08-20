// variable to be used for socket.io, defined here as a global variable
var io;

// include the user class
var user = require('./user.js');

// include the syslog class
var syslog = require('./syslog.js');

// redis client for publist/subscribe communication
var redisClient;

// file system module to access system commands
var fs = require('fs');

/*
 * Define some generic functions to handle
 * standard responses from the RESTful API
 */

// send - success
var restSend = function(res, status, msg) {
  res.send({ 'msg' : msg, 
             'success' : status });
}

// send - not found
var restNotFound = function(res) {
  res.send( {'msg' : "Not Found" }, 404);
}


/*
 *  Method to start up the application
 *  port - the port to listen on
 */
var startup = function(port) {
  
  /*
   *  RESTful API
   *  Create the API methods for the RESTful API
   */
  
  // express - the REST API framework
  var express = require('express');
  var api = express();
  
  // Create HTTP server from Express application
  var http = require('http');
  var server = http.createServer(api);
  
  // listen for connections via the supplied port
  var application = api.listen(port)
  
  
  
  /*
   *  TEST
   *  Check basic connections
   */
  api.get('/test', function(req, res){
    fs.readFile("test/test.html", function (err, data) {
      // and end the connection with the contents of the static file
      res.writeHead(200, {'Content-Type': "text/html"});
      return res.end(data);
    });
  });
  
  /*
   *  CLIENT
   *  Serve out the client-side Websocket API library
   */
  api.get('/lib/client.js', function(req, res){
    syslog.log(req.route.path);

    fs.readFile("client/client.js", function (err, data) {
      res.writeHead(200, {'Content-Type': "text/javascript"});
      return res.end(data);
    });

  });
  
  // define API calls here
  
  
  /*
   * REDIS
   * redisPubSub  - Redis client for pub/sub
   * redisData    - Redis client for read/write data
   */
  redisPubSub = require("redis").createClient();
  redisData = require("redis").createClient();
  
  // log any redis errors
  redisPubSub.on("error", function (err) {
    syslog.log("Redis Pub/Sub Error " + err);
  });
  
  redisData.on("error", function (err) {
    syslog.log("Redis Data Error " + err);
  });

  // Automatically listen to Pub/Sub channel
  redisPubSub.on("connect", function(err) {
    syslog.log("Subscribing to broadcast channel");
    redisPubSub.subscribe(user.redisBroadcastChannel);
  });
  
  
  
  
  
  
  
  /*
   *  Socket.IO
   *  Create Socket.IO server
   */
   
   // startup socket.io
  io = require('socket.io').listen(application);
  
  /*
   *  CONNECTION
   *  Listen for new socket.IO connections
   *  On connection, listen for activity
   */
  io.sockets.on('connection', function (socket) {
    syslog.log('New client connected - Socket: '+socket.id);
    
    
    // ask the new connection for its identity
    syslog.log("New WebSocket connection: asking for identity");
    socket.emit('identify', {});

    // when we receive identity data
    socket.on('identity', function(identity) {
      
      syslog.log('Received identity');
      
      // subscribe to this users pubsub channel in redis
      redisPubSub.subscribe(socket.id);

      // store user data in redis
      
      // store user query in redis
      
      // attempt to match user against existing user queries

    });
    
    
    
    /*
     *  When a socket disconnects
     */
    socket.on('disconnect', function () {
      syslog.log('User disconnected');
    });

  });
  
    
  
  
  

}

module.exports = {
  startup: startup
}
