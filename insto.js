// include the main application class
var main = require('./includes/main.js');

// include the user class
var user = require('./includes/user.js');

// create redis client 
var redisClient = require("redis").createClient();

// get command-line parameters (if supplied)
var argv = require('optimist').argv;

// set the default port
var port = 3000;
var protocol = 'http';
// define the starting number of connection attempts as a global variable
var conAttempt = 1;

// logo - for fun :)
console.log('_________ _        _______ _________ _______' );
console.log('\\__   __/( (    /|(  ____ \\\\__   __/(  ___  )');
console.log('   ) (   |  \\  ( || (    \\/   ) (   | (   ) |');
console.log('   | |   |   \\ | || (_____    | |   | |   | |');
console.log('   | |   | (\\ \\) |(_____  )   | |   | |   | |');
console.log('   | |   | | \\   |      ) |   | |   | |   | |');
console.log('___) (___| )  \\  |/\\____) |   | |   | (___) |');
console.log('\\_______/|/    )_)\\_______)   )_(   (_______)');
                                             
// if 'port' command-line parameter is present, parse it
if(argv.port) {
  port = argv.port;  
} else if( argv.p) {
  port = argv.p;
}

// protocol mode
if (argv.protocol) {
  protocol = argv.protocol;
}

// validation to check that the supplied port is a number
if(typeof port!= 'number' || port<1) {
  console.log("ERROR: The supplied port is not a number");
  console.log("See ./insto.js --help");
  process.exit(1);
}

// if 'help' command-line parameter is present, parse it
if(argv.help) {
  console.log("Insto - real-time message broker");
  console.log("Usage:");
  console.log("  ./insto.js")
  console.log("");
  console.log("Parameters:")
  console.log("  --port - optionally specify the port to listen on. Defaults to "+port+" e.g. --port 8080");
  console.log("  --help - list the this help page");
  console.log("");
  console.log("Insto requires Redis to be running locally.");
  process.exit(0);
}

// when a redis connection event occurs
redisClient.on("connect", function (err) {
  
  //if this is our first connection attempt, clear the redis user hash
  if (conAttempt == 1) {
    redisClient.del(user.redisUserHash);
    redisClient.del(user.redisQueryHash);
    redisClient.del(user.redisApiHash);
    redisClient.del(user.redisApiUsers);
    redisClient.del(user.redisApiUsage);
  }
  
  conAttempt++;

});

// start the main application, passing in the port
main.startup(port, protocol);
