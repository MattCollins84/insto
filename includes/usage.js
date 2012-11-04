/*
 *  Module to handle usage API requests
 */

// user module
var user = require('./user.js');

// redis
var redisClient = require("redis").createClient();

// find number of connections for a certain API key
var numberOfConnections = function(key, callback) {
  
  redisData.get(user.redisApiUsers, function(err, obj) {
    
    // if we have an error
    if (err) {
      callback(err, null);
    }     
    
    // no error
    else {
      
      if (obj == null) {
        obj = {};
      } else {
        obj = JSON.parse(obj);
      }
      
      // if we have any connections
      if (typeof obj[key] == 'object' && typeof obj[key].length == 'number') {
        callback(null, {"connections": obj[key].length});
      }
      
      // no connections
      else {
        callback(null, {"connections": 0});
      }
    }
  });
  
}


// export
module.exports = {
  numberOfConnections: numberOfConnections
}
