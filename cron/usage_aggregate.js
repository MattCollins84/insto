// define redis keys and create redis connection for user class
var redisClient = require("redis").createClient();

// couch DB usage collection
var usage = require("../includes/cloudant.js").usage;

// users object
var user = require('../includes/user.js');

// syslog
var syslog = require('../includes/syslog.js');

// moment date library
var moment = require('moment');

var m = moment();

//async library
var async = require('async');

// setup the queue
var q = async.queue(function (task, callback) {
  
  // attempt to get existing usage doc
  usage.get(task.key, function(err, doc) {
    
    // error?
    if (err) {
      
      // missing doc?
      if (err.error == "not_found") {
        
        var saveDoc = {"usage": []};
        
      }
      
      // otherwise
      else {
        syslog.log('COUCH ERROR');
        console.log(err);
        process.exit(0);
      }
      
    }
    
    // no error
    else {
      
      var saveDoc = JSON.parse(JSON.stringify(doc));
      
    }
    
    // create stats object and push to doc
    var stats = {"year": m.year(), "month": (m.month()+1), "day": m.date(), "num": task.num};
    saveDoc.usage.push(stats);
    
    // save
    usage.save(task.key, saveDoc, function(err, doc) {
        
        console.log(doc, err);
        
    });
    
  });
  
  callback();
}, 1);


// get all usage counters
redisClient.hgetall(user.redisApiUsage, function(err, obj) {
  
  // error?
  if (err) {
    syslog.log('REDIS ERROR', err);
  }
  
  // no error
  else {
    
    // for each API key
    for (key in obj) {
      q.push({key: key, num: obj[key]});
    }
    
  }
  
});