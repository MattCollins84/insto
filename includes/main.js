// variable to be used for socket.io, defined here as a global variable
var io;

// include the user class
var user = require('./user.js');

// include the usage class
var usage = require('./usage.js');

// include the syslog class
var syslog = require('./syslog.js');

// file system module to access system commands
var fs = require('fs');

// crypto
var crypto = require('crypto');

// couch DB users collection
var db = require("./cloudant.js").users;

/*
 * Define some generic functions to handle
 * standard responses from the RESTful API
 */

// send - success
var restSend = function(res, status, msg) {
  res.send({ 'data' : msg, 
             'success' : status });
}

// send - not found
var restNotFound = function(res) {
  res.send( {'msg' : "Not Found" }, 404);
}

/*
   * REDIS
   * redisPubSub  - Redis client for pub/sub
   * redisData    - Redis client for read/write data
   */
var redisPubSub = require("redis").createClient();
var redisData = require("redis").createClient();

/*
 *  Method to start up the application
 *  port - the port to listen on.
 */
var startup = function(port, protocol) {
  
  /*
   *  RESTful API
   *  Create the API methods for the RESTful API
   */
  
  // express - the REST API framework
  var express = require('express');
  var api = express();
  
  // Create HTTP server from Express application
  var http = require('http');
  var https = require('https');
  
  if (protocol == 'https') {
  
    // options for SSL
    var options = {
      key: fs.readFileSync('./includes/private.key').toString(),
      ca: [fs.readFileSync('./includes/additional.pem').toString()],
      cert: fs.readFileSync('./includes/public.pem').toString()
    }
    
    var server = https.createServer(options, api);
    console.log(server);
  } else {
    var server = http.createServer(api);
  }
  
  // listen for connections via the supplied port
  var application = api.listen(port)
  
  /*
   *  Render out connected users
   */
  api.get('/', function(req, res){
    fs.readFile("index.html", function (err, data) {
      // and end the connection with the contents of the static file
      res.writeHead(200, {'Content-Type': "text/html"});
      return res.end(data);
    });
  });
  
  /*
   *  API Usage - number of connections
   *  Return number of connections for a particular api key
   */
  api.get('/usage/:key/connections', function(req, res){
    
    // use broadcast to send to all sockets
    usage.numberOfConnections(req.params.key, function(err, data) { 
      if (err) {
        restSend(res, false, err);
      } else {
        restSend(res, true, data);
      }
    });
  });
  
  /*
   *  API Usage - messages sent
   *  Return number of messages sent between date ranges
   */
  api.get('/usage/:key/messages', function(req, res){
    
    var query = {
      "apiKey": req.params.key,
      "from": req.query.from,
      "to": req.query.to
    }
    
    // use broadcast to send to all sockets
    usage.numberOfMessages(query, function(err, data) { 
      if (err) {
        restSend(res, false, err);
      } else {
        restSend(res, true, data);
      }
    });
  });
  
  /*
   *  Create API user
   *  Create a new API user and return the api key
   */
  api.get('/user/create', function(req, res){
    
    // register a new user
    user.createApiUser(req.query, function(err, user) { 
      if (err) {
        restSend(res, false, err);
      } else {
      	
      	// subscribe to api user broadcast channel
        redisPubSub.subscribe('bcast-'+user.apikey);
        
        restSend(res, true, user);
        
      }
    });
  });
  
  /*
   *  TEST
   *  Perform tests to make sure everything is a-ok
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
  
  /*
   *  BROADCAST
   *  Broadcast API method
   */
  api.get('/:apikey/message/all', function(req, res){

    // send broadcast message to all clients
    syslog.log("Insto: Broadcast message sent");

    // use broadcast to send to all sockets
    user.sendBroadcast(req.params.apikey, req.query, function(err) { 
        restSend(res, err);
    });

  });

  /*
   *  SEND MESSAGE
   *  Send message to all matching users
   */
  api.get('/:apikey/message/to/:key/:value', function(req, res) {

    // log the request
    syslog.log("Insto: send message "+req.route.path);
    
    // format query
    var userQuery = new Object;
    userQuery[req.params.key] = req.params.value;
    userQuery._apiKey = req.params.apikey;
    
    // attempt to send message to specified user of group of users
    user.sendMessage(userQuery, req.query, false, function(status) {
        restSend(res, status);
    });

  });
  
  /*
   * Find users that match a supplied query
   */
  api.get('/:apikey/query', function(req, res) {

    // log the request
    syslog.log("Insto: query API request");
    
    var q = req.query;
    q._apiKey = req.params.apikey;
    
    user.matchUserQuery(q, null, function(matches) {
      restSend(res, true, matches);
    }); 

  });
  
  // app stats
  api.get('/stats', function(req, res){
    syslog.log("Insto: user stats request");

    // get the stats from the user store
    user.stats( function(users) {

      // when it's ready, send it back
      restSend(res, true, users);
    });

  });
  
  
  
  // log any redis errors
  redisPubSub.on("error", function (err) {
    syslog.log("Redis Pub/Sub Error " + err);
  });
  
  redisData.on("error", function (err) {
    syslog.log("Redis Data Error " + err);
  });
  
  // load all API users
  db.all({include_docs: true}, function(err, docs) {
    if (err) {
      console.log('** ERROR: could not load API users'); 
    } else {
      console.log('** Loading API users into memory');
      for (i in docs) {
        
        var d = docs[i];
        
        if (d.id.substring(0,1) == "_") {
          continue;
        }
        
        console.log('Loading: '+d.id);
        //store api user in hash
        redisData.hset(user.redisApiHash, d.id, JSON.stringify(d.doc) );
        
        //store usage counter for this api in redos
        redisData.hset(user.redisApiUsage, d.id, 0);
        
        // subscribe to api user broadcast channel
        redisPubSub.subscribe('bcast-'+d.id);
      }
      
    }
  });
  
  /*
   *  PUB/SUB
   *  Message received - send to clients
   */
  redisPubSub.on("message", function (channel, message) {
    
    // broadcast
    if (channel.substring(0, 6) == 'bcast-') {
      
      var bits = channel.split('-');
      var channel = bits[1];
      
      // remove from collection of api users for broadcasting
      redisData.get(user.redisApiUsers, function(err, obj) {
        
        if (obj == null) {
          obj = {};
        } else {
          obj = JSON.parse(obj);
        }
        
        if (typeof obj[channel] == 'object') {
          
          for (i in obj[channel]) {
            
            var c = obj[channel][i];
            
            if(io.sockets.sockets[c]) {
              io.sockets.sockets[c].volatile.emit('notification', JSON.parse(message));
              
              // increment usage counter for this apikey
              redisData.hincrby(user.redisApiUsage, channel, 1);    
            }
            
          }
          
        }
        
      });
      
    }
    
    // direct
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
       *  Verify the API key supplied
       */
      redisData.hget(user.redisApiHash, identity.auth.apiKey, function(err, obj) {
        
        //format the hostname
        identity.auth.hostname = identity.auth.hostname.replace("http://", "").replace("https://", "").replace("www.", "");
        
        var apiUser = JSON.parse(obj);
        
        // if no matching API key found, force error at client end
        if (apiUser == null) {
          socket.emit('api-fail', {"msg": "Invalid API key"});
        }
        
        // check we have the correct hostname for the key
        else if (apiUser.hostname != identity.auth.hostname && apiUser.development_hostname != identity.auth.hostname) {
          socket.emit('api-fail', {"msg": "Invalid API key for this host."});
        }
        
        // otherwise continue setup of client
        else {
          
          /*
           *  SETUP the newly connected user
           */
          
          socket.emit('connected', {"_type": "connected", _id: socket.id});
          
          // subscribe to this users pubsub channel in redis
          redisPubSub.subscribe(socket.id);
          
          // create a collection of api users for broadcasting
          redisData.get(user.redisApiUsers, function(err, obj) {
            
            if (obj == null) {
              obj = {};
            } else {
              obj = JSON.parse(obj);
            }
            
            if (typeof obj[identity.auth.apiKey] != 'object') {
              obj[identity.auth.apiKey] = [];
            }
            
            if (obj[identity.auth.apiKey].indexOf(socket.id) == -1) {
              obj[identity.auth.apiKey].push(socket.id);
            }
            
            redisData.set(user.redisApiUsers, JSON.stringify(obj), function(err, data) {
              
            });
            
          });

          // store user data in redis
          if (identity.userData) {
            
            // add API key to userData
            identity.userData._apiKey = identity.apiKey;
            identity.userData._id = socket.id;
            
            // add user to the user array
            if(user.addUser(identity.userData, socket.id)) {
              syslog.log("Insto: Received identity packet");
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
          
          
          // now check to see if this user matches any existing queries
          redisData.hgetall(user.redisQueryHash, function (err, obj) {
            
            // loop through the queries
            for (sessionId in obj) {
              
              // get our query object
              var q = JSON.parse(obj[sessionId]);
              
              if (sessionId != socket.id) {
                // check to see if it matches and send
                user.matchExistingQuery(q, identity.userData, function(success) {
                  if (success) {
                    io.sockets.sockets[sessionId].volatile.emit('instoconnect', identity.userData);
                  }
                });
              }
            
            }
          
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
            var sts = (data['_sendToSelf'])?true:socket.id;
            data['_msg']._id = socket.id;

            user.sendMessage(data['_query'], data['_msg'], sts, function() {});
          });
          
          
          // if we receive a websocket API-Broadcast call
          socket.on('api-broadcast', function(data) {
          
            /*
             *  data must be a JS object in this format
             *  data['_msg']  - a JS object to send to the matched user
             */
            syslog.log("Insto: Received broadcast request");
            
            data['_msg']._id = socket.id;
            user.sendBroadcast(data['_apiKey'], data['_msg'], function() {});
          });
          
          // if we receive a one off query request
          socket.on('api-query', function(query) {
            
            /*
             *  data must be a JS object in this format
             */
            syslog.log("Insto: Received query request");
            user.matchUserQuery(query, socket.id, function(matches) {
              // attempt to send message to specified user of group of users
              socket.volatile.emit('instoquery', matches);
            });
          });
          
          /*
           *  When a socket disconnects
           */
          socket.on('disconnect', function () {
            syslog.log('User disconnected');
            
            
            // remove from collection of api users for broadcasting
            redisData.get(user.redisApiUsers, function(err, obj) {
              
              if (obj == null) {
                obj = {};
              } else {
                obj = JSON.parse(obj);
              }
              
              // loop over all api key groups
              var found = false;
              for (i in obj) {
                
                if (typeof obj[i] == 'object' && obj[i].length) {

                  for (j in obj[i]) {
                    
                    if (obj[i][j] == socket.id) {
                      found = j;
                      break;
                    }
                    
                  }
                  
                  // once we've fund this socket, remove from the store
                  if (found) {
                    obj[i].splice(found, 1);
                    break;
                  }
                  
                }
                
              }
              
              // write it back to redis
              redisData.set(user.redisApiUsers, JSON.stringify(obj), function(err, data) {
                
              });
              
            });
            
            //get our userData and send out any matching disconnect messages
            user.getUserBySessionId(this.id, function(userData) {
              
              // now check to see if this user matches any existing queries
              redisData.hgetall(user.redisQueryHash, function (err, obj) {
                
                // loop through the queries
                for (sessionId in obj) {
                  
                  // get our query object
                  var q = JSON.parse(obj[sessionId]);
                  
                  if (sessionId != socket.id) {
                    // check to see if it matches and send
                    user.matchExistingQuery(q, userData, function(success) {
                      if (success) {
                      	io.sockets.sockets[sessionId].volatile.emit('instodisconnect', userData);
                      }
                    });
                  }
                
                }
              
              });
              
            });
            
            // remove this from our array of users
            user.removeUserBySessionId(this.id);

            // unsubscribe to this pubsub channel, because this socket has gone away
            redisPubSub.unsubscribe(socket.id);
            
            // remove user query
            user.deleteUserQuery(socket.id);
            
          });
        
        }
      });
      
      

    });

  });
  
    
  
  
  

}

module.exports = {
  startup: startup
}
