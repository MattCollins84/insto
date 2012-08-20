// variable to be used for socket.io, defined here as a global variable
var io;

// include the user class
var user = require('./user.js');

// include the syslog class
var syslog = require('./syslog.js');

// redis client for publist/subscribe communication
var redisClient;

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
 *  protocol - the prototcol to use (http/https)
 */
var startup = function(port, protocol) {

  console.log('started');

}

module.exports = {
  startup: startup
}
