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
  
  api.get('/test2', function(req, res){
    fs.readFile("test/test2.html", function (err, data) {
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
  
  /*
   *  BROADCAST
   *  Broadcast API method
   */
  api.get('/message/all', function(req, res){

    // send broadcast message to all clients
    syslog.log("Insto: Broadcastmessage sent");

    // use broadcast to send to all sockets
    user.sendBroadcast(req.query, function(err) { 
        restSend(res, err);
    });

  });

  /*
   *  SEND MESSAGE
   *  Send message to all matching users
   */
  api.get('/message/to/:key/:value', function(req, res) {

    // log the request
    syslog.log("Insto: send message "+req.route.path);
    
    // format query
    var userQuery = new Object;
    userQuery[req.params.key] = req.params.value;

    // attempt to send message to specified user of group of users
    user.sendMessage(userQuery, req.query, function(status) {
        restSend(res, status);
    });

  });
  
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
   *  PUB/SUB
   *  Message received
   */
  redisPubSub.on("message", function (channel, message) {

    // if this a broadcast message
    if(channel==user.redisBroadcastChannel) {
      // send this message to all sockets
      io.sockets.volatile.emit('notification', JSON.parse(message));
    } 
    
    // if targetted at individual user(s)
    else {
      
      // if this socket exists, attempt to send message
      if(io.sockets.sockets[channel]) {
        io.sockets.sockets[channel].volatile.emit('notification', JSON.parse(message));      
      }
      
    }
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
      
      /*
       *  SETUP the newly connected user
       */
      
      // subscribe to this users pubsub channel in redis
      redisPubSub.subscribe(socket.id);

      // store user data in redis
      if (identity.userData) {
        // add user to the user array
        if(user.addUser(identity.userData, socket.id)) {
          syslog.log("WebSocket: Received identity packet");
        }
      }
      
      // if this guy has a user query
      if (identity.userQuery && typeof identity.userQuery == "object") {
        
        // save user query to redis
        user.saveUserQuery(identity.userQuery, socket.id);
        
        // try to find matches for this user query from the existing users, and return to this socket
        user.matchUserQuery(identity.userQuery, socket.id, function(matches) {
          socket.emit('instousersconnected', matches);
        });

      }
      
      
      // attempt to match user against existing user queries

    });
    
    
    /*
     *  Websocket API
     *  Handle Websocket API requests
     */
    
    
    // if we receive a websocket API-Send call
    socket.on('api-send', function(data) {
    
      /*
       *  data must be a JS object in this format
       *  data['_query']  - query to identify user
       *  data['_msg']    - a JS object to send to the matched user
       */
      syslog.log("Insto: Received send request");
      user.sendMessage(data['_query'], data['_msg'], function() {});
    });
    
    
    // if we receive a websocket API-Broadcast call
    socket.on('api-broadcast', function(data) {
    
      /*
       *  data must be a JS object in this format
       *  data['_msg']  - a JS object to send to the matched user
       */
      syslog.log("Insto: Received broadcast request");
      user.sendBroadcast(data['_msg'], function() {});
    });
    
    
    
    /*
     *  When a socket disconnects
     */
    socket.on('disconnect', function () {
      syslog.log('User disconnected');
      
      // remove this from our array of users
      user.removeUserBySessionId(this.id);

      // unsubscribe to this pubsub channel, because this socket has gone away
      redisPubSub.unsubscribe(socket.id);
      
      // remove user query
      user.deleteUserQuery(socket.id);
      
    });

  });
  
    
  
  
  

}

module.exports = {
  startup: startup
}
