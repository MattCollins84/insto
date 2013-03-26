var config = require('./config.js').config;

var cradle = require('cradle');

var connection = new cradle.Connection( config.couchDB.host,
																				config.couchDB.port, 
																				{
																					cache: false,
																					secure: true,
																					auth: { 
																						username: config.couchDB.username, 
																						password: config.couchDB.password 
																					}
																				}
																			);
															 
var users = connection.database('users');
var usage = connection.database('usage');

module.exports = {
	users: users,
	usage: usage
}