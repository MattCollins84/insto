  var cradle = require('cradle');

  var connection = new cradle.Connection( "https://h8851143.cloudant.com",
                                          443, 
                                          {
                                            cache: false,
                                            secure: true,
                                            auth: { 
                                              username: "h8851143", 
                                              password: "r3darmy84" 
                                            }
                                          }
                                        );
                                 
  var users = connection.database('users');
  
  module.exports = {
    users: users
  }
