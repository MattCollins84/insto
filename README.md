# Insto

Insto is a prototype application designed to provide real-time functionality to existing IT systems.

## 1) Real-time Message Broker 

Insto listens on port 3000 for WebSocket connections. When a user connects, it is sent an "identify" request. The user should reply with an "identity" message which is a JSON object that defines the connector's identity e.g. 

```
{"userId":104,"firstname":"Laura","lastName":"Smith","userType":"user"}
```
or 

```
{"userType":"wallboard"}
```
or anything you like.

This action is handled internally by Insto.

The key/value pairs supplied in the identity object can be used in the Rest API (below) to send messages to individual connected users or groups of users. e.g. "send a message to all users whose userType=user".

## 2) Rest API

An [Express](http://expressjs.com/)-powered, RESTful API is set up to listen on port 3000 by default. The API allows other apps to send messages to Insto. Insto then dispatches the messages to the individual users, groups of users or all connected users in near real-time.

## 3) Websocket API

A Websocket API is also available for performing more complex selections of users using multiple parameters, as well as broadcasting to all users. The Websocket API is currently available via a Javascript library.

## 4) Redis data store

The list of connected users is stored in Redis. Also, outgoing messages are coordinated using Redis pub/sub channels. This allows multiple instances of the Insto worker to be operated together to allow scalability on multi-core processors or even multi-server installations.

Here is how everything is connected:

![Schematic diagram](https://github.com/MattCollins84/insto/blob/master/schematic.png?raw=true "Insto - Schematic Diagram")

*  Web browser clients make permanent WebSocket connections (using socket.io)
*  Other applications make transient connections to the API to post messages for distribution
*  The Insto  worker processes subscribe to Redis pubsub channels to receive notifications that individual or broadcast messages are to be dispatched
*  Redis stores the array of connected users and their attributes
*  Redis optionally stores an index of a nominated field, for speed

### 5) Web interface

If you visit 'http://localhost:3000', you will see Insto 's simple web interface which allows you to see a list of the clients that are connected and how they identified themselves.

## RESTful API documentation

### Send a notification to all users.

```
  curl -i 'http://localhost:3000/message/all?param1=a&param2=b'
```

The parameters after the '?' are expressed as a JSON object and broadcast to all connected clients.

### Send a notification to a sub-set of users

```
 curl -i 'http://localhost:3000/message/to/userType/user?param1=a&param2=b'
```

Sends the query parameters to connected clients that have userType='user'. The final two parameters in the URL can be anything you like; they should match the key/values supplied in the identity packet from the connecting WebSocket user e.g.

```
curl 'http://localhost:3000/message/to/userType/wallboard?dog=1'
curl 'http://localhost:3000/message/to/firstname/Laura?foo=bar'
curl 'http://localhost:3000/message/to/adn/104?foo=bar'
```

### Query connected users
It is possible to query the connected users and detect who is connected that match a subset provided.

```
curl 'localhost:3000/query?userType=web&businessId=501642881088'

{
  "msg":[
    {
      "businessId":"501642881088",
      "url":"http://goat-scoot/England/Cleveland/Stockton-on-Tees/Scoot-Business-DirectoryPOPOP-10108141.html",
      "uniqueId":294996373,
      "userType":"web"
    },
    {
      "businessId":"501642881088",
      "url":"http://goat-scoot/England/Cleveland/Stockton-on-Tees/Scoot-Business-DirectoryPOPOP-10108141.html",
      "uniqueId":294996373,
      "userType":"web"
    }
  ],
  "success":true
}
```

### See who's connected

```
  curl -i 'http://localhost:3000/stats'
```

This returns a list of the attached users and the identity of each connected user.

## Websocket API documentation

### The Insto Client object
The Insto Client object takes up to 5 different parameters:

#### userData (required)
This is a Javascript object that describes the user making the connection

```
var userData = {"name": "Matt", "userId": 5, "userType": "admin"};
```

#### userQuery (optional - defaults to false)
This is a Javascript object that describes the type of users that this user wants to receive connect/disconnect notifications for

```
var userQuery = {"userType": "sales"};
```

#### callback (optional - default does nothing)
This is the function that is called when ANY notification is received

```
var callback = function(data) {
  console.log(data);
}
```

#### host (optional - defaults to http://graffiti.touchlocal.com:3000)
The graffiti server to connect to

```
var host = "http://some.graffiti.server.com:3030";
```


#### protocol (optional - defaults to http)

To connect via https, pass "https".


#### Object creation
And the object is created like so:

```
var g = new Insto Client(userData, userQuery, callback, host);
```

### What are notifications
Any Insto Client can receive realtime notifications via the Insto Client object. Each time one of these notifications are received, they are passed to the callback function (if it has been supplied).

There are five types of notification:

* connect - received when another Insto Client connects to the server and matches the supplied userQuery. Provides this clients userData object.
* disconnect - received when another Insto Client disconnects from the server and matches the supplied userQuery. Provides this clients userData object.
* connectedusers - received after connection if any currently connected Insto Clients match the supplied userQuery. Provides an array of matching clients userData objects.
* notification - received when this Insto Client matches the parameters specified by another client when sending a message. Provides the sent message.
* query - received as a response from the query Insto Client method (g.query()). Provides an array of other connected users that match the supplied query.

All notifications return a Javascript object with a notification type stored in the _type property. For example:

```
{"message":"this is a message","_type":"notification"}
```

All Insto  notifications of type 'notification' are schema-less, and as such can be in any format as defined by the sender, as long as they are valid Javascript objects. However they will always contain the _type property.

#### connect / disconnect
These types of notification are sent when a Insto Client changes it's connection state. The connect/disconnect notification provides the userData of the Insto Client that has changed state as long as that client matches the userQuery supplied.

```
{"userId":10,"firstname":"James","lastName":"Robinson","userType":"test","_type":"connect"}
{"userId":10,"firstname":"James","lastName":"Robinson","userType":"test","_type":"disconnect"}
```

#### connectedusers
If a userQuery is supplied then a connectedusers notification is automatically returned after a connection to the server is made. There will be a 'users' property which contains an array of userData objects for all of the currently connected Insto Clients that match the supplied userQuery.

```
{
  "_type":"connectedusers",
  "users":[
    { "userId":1,
      "firstname":"James",
      "lastName":"Robinson",
      "userType":"sales"
    },
    { "userId":2,
      "firstname":"Gregg",
      "lastName":"House",
      "userType":"sales"
    },
    { "userId":3,
      "firstname":"Dave",
      "lastName":"Johnson",
      "userType":"sales"
    }
  ]
}
```

#### query
This notification type is returned to the same Insto Client that calls the query method. It returns with an array of users that match the supplied query, very much like the 'connectedusers' notification

```
{
  "_type":"query",
  "users":[
    { "userId":1,
      "firstname":"James",
      "lastName":"Robinson",
      "userType":"sales"
    },
    { "userId":2,
      "firstname":"Gregg",
      "lastName":"House",
      "userType":"sales"
    },
    { "userId":3,
      "firstname":"Dave",
      "lastName":"Johnson",
      "userType":"sales"
    }
  ]
}
```

### Register for connections/disconnections from a user who matches a specified query

Supplying a valid userQuery object when creating the Insto Client will allow this client to receive a connect or disconnect notification when any other Insto Client connects or disconnects from the server. The example below shows a Insto Client that is listening for connections/disconnections for all Insto  users with a 'userType' of 'sales'.

```
<script type="text/javascript" src="http://graffiti.touchlocal.com:3000/socket.io/socket.io.js"></script>
<script type="text/javascript" src="http://graffiti.touchlocal.com:3000/lib/client.js"></script>
<script type="text/javascript">

  //callback function for handling messages received from graffiti
  var callback = function(data) {
    console.log(data);
  }
  
  var userQuery = {
    "userType": "sales"
  };
  
  //sample user object
  var userData = {  'userId': 5, 
                    'firstname': 'Bob', 
                    'lastName': 'Smith',
                    'userType': 'user'
                  };
  
  //create new graffiti object, passing in userData and callback function
  var g = new Insto Client(userData, userQuery, callback);
  
</script>
```

### Insto Client.send() - Send a notification to a subset of users
The Insto Client can send a message to any other connected Insto Client by providing a userQuery. All users who match this query will receive the message.

A userQuery must be a valid Javascript object, as must the message. If a message is required to go to all connected users, please use the Insto Client.broadcast() method.

Example of a valid userQuery:

```
var query = {
              "userType": "sales",
              "branch": "middlesbrough"
            }
```

Messages sent via Insto  are schema-less, and although they must be a valid Javascript object, they can have any structure as required by the calling application.

A simple message object:

```
var message = {
                "text": "This is an example message"
              }
```

A more complicated message object, still perfectly allowed:

```
var message = {
                "type": "error",
                "detail": {
                            "codes": [101, 202, 123],
                            "text": "There was an error"
                          }
              }
```

The below example shows a simple message being sent to all users that have a 'userType' of 'sales':

```
<script type="text/javascript" src="http://graffiti.touchlocal.com:3000/socket.io/socket.io.js"></script>
<script type="text/javascript" src="http://graffiti.touchlocal.com:3000/lib/client.js"></script>
<script type="text/javascript">

  //callback function for handling messages received from graffiti
  var callback = function(data) {
    console.log(data);
  }
  
  //sample user object
  var userData = {  'userId': 5, 
                    'firstname': 'Bob', 
                    'lastName': 'Smith',
                    'userType': 'user'
                  };
  
  //create new graffiti object, passing in userData and callback function
  var g = new Insto Client(userData, false, callback);
        
  //message query
  var query = {"userType": "sales"};
  
  //create a message object to be sent to all matching users
  var msg = { "message": "This is an example message" };
  
  
  //send!
  g.send(query, msg);
  
</script>
```

### Insto Client.broadcast() - Send a notification to all users

Use this method to send a message to all connected Insto Clients. The message object obeys the same rules as the Insto Client.send() method.

```
<script type="text/javascript" src="http://graffiti.touchlocal.com:3000/socket.io/socket.io.js"></script>
<script type="text/javascript" src="http://graffiti.touchlocal.com:3000/lib/client.js"></script>
<script type="text/javascript">

  //callback function for handling messages received from graffiti
  var callback = function(data) {
    console.log(data);
  }
  
  //sample user object
  var userData = {  'userId': 5, 
                    'firstname': 'Bob', 
                    'lastName': 'Smith',
                    'userType': 'user'
                  };
  
  //create new graffiti object, passing in userData and callback function
  var g = new Insto Client(userData, false, callback);
  
  //create a message object to be sent to all users
  var msg = { "message": "This is an example message" };
  
  //broadcast message to all
  g.broadcast(msg);
</script>
```

This would send a message to all users.

### Insto Client.query() - Find out if there are any available users
It is possible to search the connected Insto Clients to see if there are any that match the required subset.

This method requires a userQuery object to be passed in.

Example of a valid userQuery:

```
var query = {
              "userType": "sales",
              "branch": "middlesbrough"
            }
```

All matching users are returned in a notification of type 'query'.

An example of using Insto Client.query();

```
<script type="text/javascript" src="http://graffiti.touchlocal.com:3000/socket.io/socket.io.js"></script>
<script type="text/javascript" src="http://graffiti.touchlocal.com:3000/lib/client.js"></script>
<script type="text/javascript">

  //callback function for handling messages received from graffiti
  var callback = function(data) {
    console.log(data);
  }
  
  //sample user object
  var userData = {  'userId': 5, 
                    'firstname': 'Bob', 
                    'lastName': 'Smith',
                    'userType': 'user'
                  };
  
  //create new graffiti object, passing in userData and callback function
  var g = new Insto Client(userData, false, callback);
  
  //create a message object to be sent to all users
  var query = {
                "userType": "sales",
                "branch": "middlesbrough"
              }
  
  //send query
  g.query(query);
</script>
```

## What is Insto  for?

Insto  doesn't care what you use it for; it is the means for sending real-time messages to groups of connected users. Insto  doesn't know anything about the application it is working with, it is merely the messenger. It stores nothing permanently as the Redis keys are removed on startup.

## Installation

Insto  requires Node.js v_0.6 or above. Once the repository is cloned simply run:

```
  npm install
```

to install the Node modules that are required (listed in package.json).

## Running

Insto  requires Redis to be running. Then simply run the Insto  executable:

```
  ./graffiti.js
```

or if you want to run Insto  on a port other than the default, you can supply the port at the command-line:

```
  ./graffiti.js --port 8080
```

or if you want to run Insto  with a index on a specific user-supplied field. If you know you are going to be sending lots of Insto  messages by userId (e.g. curl 'http://localhost:3000/message/to/userId/6?foo=bar'), and you have lots of connected users, it is more efficient to create an index on 'userId' which means the user's socket can be found with one Redis query. Ad-hoc requests require the entire user list to be traversed in order to identify the matching users which gets more inefficient with each added user. N.B. indexes should only be used for fields that are unique in the user space, as only one entry is made in the index per value. In other words, indexes are good for ids, not so good for surnames etc.

```
  ./graffiti.js --port 8080 --index userId
```

Insto  can be started using HTTPS using (http is the default)
```
  ./graffiti.js --protocol https
```

N.B. if using curl to call a Insto  operating in https mode with a self-signed secure certificate, then you will need to use curl with the "-k" option to stop it complaining about an invalid certificate. e.g.

```
  curl -ik 'https://localhost:3000/message/all?a=1&b=2'
```

Insto  can be started as a daemon with:

```
  ./graffifi.js --daemon
```

