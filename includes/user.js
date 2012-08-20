// define redis keys and create redis connection for user class
var redisClient = require("redis").createClient();
var redisUserHash = 'instoUsers';
var redisBroadcastChannel = 'instobroadcast';
var redisIndexHash = 'instoIndexHash';
var redisQueryHash = 'instoQueryHash';

module.exports = {
  redisUserHash: redisUserHash,
  redisBroadcastChannel: redisBroadcastChannel,
  redisIndexHash: redisIndexHash,
  redisQueryHash: redisQueryHash
}
