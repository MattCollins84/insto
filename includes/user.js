// define redis keys and create redis connection for user class
var redisClient = require("redis").createClient();
var redisUserHash = 'instoUsers';
var redisBroadcastChannel = 'instobroadcast';
var redisIndexHash = 'instoIndexHash';
var redisQueryHash = 'instoQueryHash';

/*
 *  ADD user 
 *  userData  - json object describing user
 *  sessionId - unique ID for this socket
 */ 
var addUser = function(userData, sessionId) {
  // add this user to redis
  redisClient.hset(redisUserHash, sessionId, JSON.stringify(userData) );
  return true;
}

/*
 *  GET a user based on unique ID
 */
var getUserBySessionId = function(sessionId, callback) {
  
  redisClient.hget(redisUserHash, sessionId, function(err, obj) {
    
    //if we don't have a callback
    if (typeof callback != "function") {
      syslog.log('Insto: getUserBySessionId - no callback');
      return JSON.parse(obj);
    }
    
    //otherwise
    else {
      syslog.log('Insto: getUserBySessionId - callback done');
      callback(JSON.parse(obj));
    }
    
  });
}

/*
 *  REMOVE a user by unique ID
 */
var removeUserBySessionId = function(sessionId) {
  redisClient.hdel(redisUserHash, sessionId);
  return true;
}


/*
 *  Send message to matching users
 */
var sendMessage = function(query, msg, callback) {
  var retval=false;
  var sessionId=false;
  
  // jsonify the msg
  msg = JSON.stringify(msg);
  
  //get the keys passed in
  var keys = Object.keys(query);
  
  // get the whole user hash from redis
  redisClient.hgetall(redisUserHash, function (err, obj) {
  
    // iterate through the hash
    for(sessionId in obj) {
    
      // parse the JSON
      var u = JSON.parse(obj[sessionId]);
      
      matches = calculateUserQueryMatch(query, u);
      
      if (matches) {
        // send them a private message by publishing to a pubsub channel on redis
        redisClient.publish(sessionId, msg);
        retval = true;
      }

    }
  
    // call the callback
    callback(retval);
  });
}

/*
 *  BROADCAST
 *  Send a message to all connected clients
 */
var sendBroadcast = function(msg,callback) {

  // send them a private message by publishing to a redis pubsub channel
  redisClient.publish(redisBroadcastChannel, JSON.stringify(msg), function(err) {
    // call the callback
    callback(true);
  });
  
}

/*
 *  compare a supplied query and a supplied user, and see if they match
 */
var calculateUserQueryMatch = function(query, user) {

  // make sure we recieve 2 valid objects
  if (typeof query != "object" || typeof user != "object" || query == null || user == null) {
    return false;
  }
  
  var match = true;
  
  for (key in query) {
    
    // if this user doesn't have a specified key, or the specified key doesn't match - then return no match
    if (typeof user[key] == "undefined" ||  user[key] != query[key]) {
      
      // return a false match
      match = false;
      break;
      
    }
    
  }
  
  return match;
  
}

module.exports = {
  redisUserHash: redisUserHash,
  redisBroadcastChannel: redisBroadcastChannel,
  redisIndexHash: redisIndexHash,
  redisQueryHash: redisQueryHash,
  addUser: addUser,
  getUserBySessionId: getUserBySessionId,
  sendMessage: sendMessage,
  sendBroadcast: sendBroadcast
}
