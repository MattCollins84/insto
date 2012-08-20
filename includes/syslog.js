// aalow the execution of child processes
var exec = require('child_process').spawn;

// send log message to syslog and the console.
var log = function(message) {
  syslog = exec('logger',['insto: '+message]);
  console.log(message);
}

module.exports = {
  log: log
}
