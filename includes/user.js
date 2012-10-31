// define redis keys and create redis connection for user class
var redisClient = require("redis").createClient();
var redisUserHash = 'instoUsers';
var redisBroadcastChannel = 'instobroadcast';
var redisIndexHash = 'instoIndexHash';
var redisQueryHash = 'instoQueryHash';
var redisApiHash = 'instoApiHash';
var redisApiUsers = 'instoApiUsers';

var syslog = require('./includes/syslog.js');

var db =require("./cloudant.js").users;

var crypto = require('crypto');

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
      syslog.log('Insto: getUserBySessionId - callback done', obj);
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
var sendMessage = function(query, msg, sendToSelf, callback) {
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
      
      // attempt a match if required and send the message
      var matches = false;
      
      if (sendToSelf === true || (sessionId != sendToSelf) ) {
        matches = calculateUserQueryMatch(query, u);
      }
      
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
var sendBroadcast = function(channel,msg,callback) {
  
  // send them a private message by publishing to a redis pubsub channel
  redisClient.publish('bcast-'+channel, JSON.stringify(msg), function(err) {
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
    
    if (key.substring(0, 1) == "_") {
      continue;
    }
    
    // if this user doesn't have a specified key, or the specified key doesn't match - then return no match
    if (typeof user[key] == "undefined" ||  user[key] != query[key]) {
      
      // return a false match
      match = false;
      break;
      
    }
    
  }
  
  return match;
  
}

/*
 * store user query in redis hash
 */
var saveUserQuery = function(query, sessionId) {
  
  // add this query to redis
  redisClient.hset(redisQueryHash, sessionId, JSON.stringify(query) );
  return true;
  
}

/*
 * remove user query from redis (by session ID)
 */
var deleteUserQuery = function(sessionId) {
  
  redisClient.hdel(redisQueryHash, sessionId);
  return true;

}

/*
 * match and return users that match a user query
 */
var matchUserQuery = function(query, socketId, callback) {

  // get the whole user hash from redis
  redisClient.hgetall(redisUserHash, function (err, obj) {
    // create users array
    var users = new Array;

    // iterate through the hash
    for(sessionId in obj) {

      // parse the JSON
      var u = JSON.parse(obj[sessionId]);
    
      // if we have a query and a sessionId, attempt to match to this
      if (typeof query == "object" && typeof socketId != "undefined") {

        var match = true;

        // if the users sessionId does not equal the passed in sessionId, attempt a match
        if (sessionId != socketId) {
          
          match = calculateUserQueryMatch(query, u);
          
        }
        
        // otherwise, this means we are trying to match the same users, so no match
        else {
          match = false;
        }
        
        // if we have a match, add this user the returned array
        if (match) {
          delete u._apiKey;
          users.push(u);
          
        }
        
      }
      
    }
    
    // return any matched users
    callback(users);    
    
  });
   
}

/*
 *  Match an existing user query
 */
var matchExistingQuery = function(query, user, callback) {
  
  // does this user match the query
  var match = calculateUserQueryMatch(query, user);
  
  // if we have a match, do the callback
  if (match) {

    callback(true);
    
  } else {
    
    callback(false);
    
  }
  
}

/*
 *  Get user stats
 */
var stats = function stats(callback) {
  redisClient.hgetall(redisUserHash,function (err, obj) {
    // iterate through the hash
    for(var sessionId in obj) {
      // parse the JSON
      var u = JSON.parse(obj[sessionId]);
      obj[sessionId] = JSON.parse(obj[sessionId]);
    }
    callback(obj);
    
  });
}

var createApiUser = function(user, callback) {
  
  var messages = [];
  
  if (typeof user.email != 'string' || !user.email) {
    messages.push("You must supply an email address");
  }
  
  if (typeof user.name != 'string' || !user.name) {
    messages.push("You must supply a name");
  }
  
  if (typeof user.password != 'string' || !user.password) {
    messages.push("You must supply a password");
  }
  
  if (typeof user.hostname != 'string' || !user.hostname) {
    messages.push("You must supply a hostname");
  }
  
  //remove un-needed prefixes from hostname
  user.hostname = user.hostname.replace("http://", "").replace("https://", "").replace("www.", "");
  
  if (messages.length == 0) {
        
    // generate api key
    var d = new Date;
    var t = d.getTime();
    
    var md5 = crypto.createHash('md5');
    md5.update(t.toString());
    apikey = md5.digest('hex');
    
    db.view('api/byEmail', {key: user.email, include_docs: true}, function(err, docs) {
      
      //if we have an error
      if (err) {
        callback(err, null);
      }
      
      // no errors!
      else {
        
        // do we have 5 docs for this email already?
        if (docs.length == 5) {
          callback(["Maximum number of API keys already registered"], null);
        }
        
        // not hit maximum yet
        else {
          var warnings = [];
          
          // if we have existing docs, force password to be the same as those passwords
          if (docs.length > 0) {
            user.password = docs[0].doc.password;
            warnings.push("Password changed to match previous entries for this email address");
          }
          
          db.save(apikey, user, function() {
            callback(null, {"apikey": apikey, "warnings": warnings});
          });
          
        }
        
      }
      
    });
    
  }
  
  else {
    callback(messages, null);
  }
}

module.exports = {
  redisUserHash: redisUserHash,
  redisBroadcastChannel: redisBroadcastChannel,
  redisIndexHash: redisIndexHash,
  redisQueryHash: redisQueryHash,
  addUser: addUser,
  removeUserBySessionId: removeUserBySessionId,
  getUserBySessionId: getUserBySessionId,
  sendMessage: sendMessage,
  sendBroadcast: sendBroadcast,
  saveUserQuery: saveUserQuery,
  deleteUserQuery: deleteUserQuery,
  matchUserQuery: matchUserQuery,
  matchExistingQuery: matchExistingQuery,
  stats: stats,
  redisApiHash: redisApiHash,
  createApiUser: createApiUser,
  redisApiUsers: redisApiUsers
}
