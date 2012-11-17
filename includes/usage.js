/*
 *  Module to handle usage API requests
 */

// user module
var user = require('./user.js');

// couch DB usage collection
var usage = require("./cloudant.js").usage;

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

// number of messages
var numberOfMessages = function(query, callback) {
  
  var from = query.from.split("-");
  var to = query.to.split("-");
  
  console.log(from, to);
  
  usage.view('usage/byDate', {startkey: [query.apiKey, parseInt(from[0]), parseInt(from[1]), parseInt(from[2])], endkey: [query.apiKey, parseInt(to[0]), parseInt(to[1]), parseInt(to[2])]}, function (err, res) {
      
    // error?
    if (err) {
      syslog.log(err);
      callback(err, null);
    }
    
    // no error
    else {
      callback(null, res);
    }
      
  });
  
}


// export
module.exports = {
  numberOfConnections: numberOfConnections,
  numberOfMessages: numberOfMessages
}
