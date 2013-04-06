# Insto

Insto is a Node.JS based application designed to provide real-time websocket functionality to websites via a Websocket API; exposed via a Javascript library, or a RESTful API.

Insto was created as part of a final year project at Teesside University.

Throughout this documentation the assumption is made that the Insto server is running on the hostname 'http://api.insto.co.uk' using port '3000'.

You must be registered to use Insto, and can do so here: [www.insto.co.uk](http://www.insto.co.uk/). Full documentation can also be found on the website, along with some code examples.

## What is Insto for?

Insto is not designed for any particular use case; it is the means for sending real-time messages to groups of connected users. Insto doesn't know anything about the application it is working with, it is merely the messenger. It stores nothing permanently.

## Websocket API documentation

### The InstoClient object
The InstoClient object is used to interact with Insto, create a new instance as shown below:
```
<script type="text/javascript" src="http://api.insto.co.uk:3000/lib/client.js"></script>
<script type="text/javascript">
  var insto = new InstoClient(API_KEY, userData, userQuery, function(data) {
    console.log(data);
  });
</script>
```

#### API_KEY (required)
The API key required to access Insto

#### userData (required)
This is a Javascript object that describes the user making the connection, for example:

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

### What are notifications
Any InstoClient can receive realtime notifications via the InstoClient object. Each time one of these notifications are received, they are passed to the callback function (if it has been supplied).

There are six types of notification:

* connected - received when you have successully connected to the Insto server
* connect - received when another Insto client connects to the server and matches the supplied userQuery. Provides this clients userData object.
* disconnect - received when another Insto client disconnects from the server and matches the supplied userQuery. Provides this clients userData object.
* connectedusers - received after connection if any currently connected Insto clients match the supplied userQuery. Provides an array of matching clients userData objects.
* notification - received when this Insto client matches the parameters specified by another client when sending a message. Provides the sent message.
* query - received as a response from the query method (insto.query()). Provides an array of other connected users that match the supplied query.

All notifications return a Javascript object with a notification type stored in the _type property, along with the unique ID of the sending client in the _id property. For example:

```
{"message":"this is a message","_type":"notification","_id": "sdkjfhgsdf-e45"}
```

It is important to remember that all Insto notifications of type 'notification' are schema-less, and as such can be in any format as defined by the sender, as long as they are valid Javascript objects. However they will always contain the _type and _id properties.

#### connected notifications
This notification is received when the InstoClient has successully connected to the server. It simply returns the unique _id of this connected InstoClient.

```
{
  "_type":"connect",
  "_id": "sdkjfhgsdf-e45"
}
```

#### connect / disconnect notifications
These types of notification are sent when a InstoClient changes it's connection state. If this client matches a supplied userQuery of another Insto client they will receive a connect/disconnect notification, altering them to this change of state.

```
{"userId":10,"firstname":"James","lastName":"Robinson","userType":"test","_type":"connect","_id": "sdkjfhgsdf-e45"}
{"userId":10,"firstname":"James","lastName":"Robinson","userType":"test","_type":"disconnect","_id": "sdkjfhgsdf-e45"}
```

#### connectedusers
If a userQuery is supplied on connection, a connectedusers notification is automatically returned after a connection to the server is made. There will be a 'users' property which contains an array of userData objects for all of the currently connected Insto Clients that match the supplied userQuery.

```
{
  "_type":"connectedusers",
  "users":[
    { "userId":1,
      "firstname":"James",
      "lastName":"Robinson",
      "userType":"sales",
      "_id":"sdfjkgsdf-3435"
    },
    { "userId":2,
      "firstname":"Gregg",
      "lastName":"House",
      "userType":"sales",
      "_id":"wesdfsdfsdf-234"
    },
    { "userId":3,
      "firstname":"Dave",
      "lastName":"Johnson",
      "userType":"sales",
      "_id":"cbnmbnmcb9udfg-4569"
    }
  ]
}
```

#### query
This notification type is returned to the same Insto Client that calls the query method. It returns with an array of users that match the supplied query, very much like the 'connectedusers' notification.

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

#### Register for connections/disconnections from a user who matches a specified query

Supplying a valid userQuery object when creating the Insto Client will allow this client to receive a connect or disconnect notification when any other Insto Client connects or disconnects from the server. The example below shows a Insto Client that is listening for connections/disconnections for all Insto users with a 'userType' of 'sales'.

```
<script type="text/javascript" src="http://api.insto.co.uk:3000/lib/client.js"></script>
<script type="text/javascript">

  // get notifications of userType 'sales'
  var userQuery = {
    "userType": "sales"
  };
  
  //sample user object
  var userData = {  'userId': 5, 
                    'firstname': 'Bob', 
                    'lastName': 'Smith',
                    'userType': 'user'
                  };
  
  //create new insto object, passing in userData and callback function
  var i = new InstoClient(API_KEY, userData, userQuery, function(data) {
    console.log(data);
  });
  
</script>
```
## Methods
These are the methods used to interact with the service

### InstoClient.send( userQuery, message, [sendToSelf] ) - Send a notification to a subset of users

**Parameters**

userQuery   - [required] define the user(s) that this notification should be sent to

message     - [required] define the message that should be sent

sendToSelf  - [optional - default: false] should this message be sent to the message sender (only if they match the userQuery)

The Insto Client can send a notification to any other connected Insto Client by providing a userQuery. All users who match this query will receive the message. If the sending user matches the userQuery they will not receive the message unless the sendToSelf parameter is defined as true.

A userQuery must be a valid Javascript object, as must the message. If a message is required to go to all connected users, please use the Insto Client.broadcast() method.

Example of a valid userQuery:

```
var query = {
              "userType": "sales",
              "branch": "middlesbrough"
            }
```

Messages sent via Insto are schema-less, and although they must be a valid Javascript object, they can have any structure as required by the calling application.

A simple message object:

```
var message = {
                "text": "This is an example message"
              }
```

A more complicated message object, still perfectly valid:

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
<script type="text/javascript" src="http://api.insto.co.uk:3000/lib/client.js"></script>
<script type="text/javascript">

  //callback function for handling messages received from insto
  var callback = function(data) {
    console.log(data);
  }
  
  //sample user object
  var userData = {  'userId': 5, 
                    'firstname': 'Bob', 
                    'lastName': 'Smith',
                    'userType': 'user'
                  };
  
  //create new insto object, passing in userData and callback function
  var i = new InstoClient(API_KEY, userData, false, callback);
        
  //message query
  var query = {"userType": "sales"};
  
  //create a message object to be sent to all matching users
  var msg = { "message": "This is an example message" };
  
  
  //send!
  i.send(query, msg);
  
</script>
```

### InstoClient.broadcast( message ) - Send a notification to all users

**Parameters**

message     - [required] define the message that should be sent

Use this method to send a message to all connected Insto Clients. The message object obeys the same rules as the Insto Client.send() method.

```
<script type="text/javascript" src="http://api.insto.co.uk:3000/lib/client.js"></script>
<script type="text/javascript">

  //callback function for handling messages received from insto
  var callback = function(data) {
    console.log(data);
  }
  
  //sample user object
  var userData = {  'userId': 5, 
                    'firstname': 'Bob', 
                    'lastName': 'Smith',
                    'userType': 'user'
                  };
  
  //create new insto object, passing in userData and callback function
  var i = new InstoClient(API_KEY, userData, false, callback);
  
  //create a message object to be sent to all users
  var msg = { "message": "This is an example message" };
  
  //broadcast message to all
  i.broadcast(msg);
</script>
```

This would send a message to all users.

### Insto Client.query( userQuery ) - Find all connected users that match a userQuery

**Parameters**

userQuery   - [required] define the user(s) that this query should return

It is possible to search the connected InstoClients to see if there are any that match the required subset.

This method requires a userQuery object to be passed in.

Example of a valid userQuery:

```
var query = {
              "userType": "sales",
              "branch": "middlesbrough"
            }
```

All matching users are returned in a notification of type 'query'.

An example of using InstoClient.query();

```
<script type="text/javascript" src="http://insto:3000/lib/client.js"></script>
<script type="text/javascript">

  //callback function for handling messages received from insto
  var callback = function(data) {
    console.log(data);
  }
  
  //sample user object
  var userData = {  'userId': 5, 
                    'firstname': 'Bob', 
                    'lastName': 'Smith',
                    'userType': 'user'
                  };
  
  //create new insto object, passing in userData and callback function
  var i = new InstoClient(API_KEY, userData, false, callback);
  
  //create a message object to be sent to all users
  var query = {
                "userType": "sales",
                "branch": "middlesbrough"
              }
  
  //send query
  i.query(query);
</script>
```

## RESTful API documentation

### Send a notification to all users.

```
  curl -i 'http://api.insto.co.uk:3000/API_KEY/message/all?param1=foo&param2=bar'
```

The parameters after the '?' are expressed as a JSON object (shown below) and broadcast to all connected clients.

```
  {
    "param1": "foo",
    "param2": "bar"
  }
```

### Send a notification to a sub-set of users

```
 curl -i 'http://api.insto.co.uk:3000/API_KEY/message/to/userType/user?param1=foo&param2=bar'
```

Sends the query parameters to connected clients that have userType='user'. The final two parameters in the URL can be anything you like; they should match the key/values supplied in the identity packet from the connecting WebSocket user e.g.

```
curl 'http://api.insto.co.uk:3000/API_KEY/message/to/userType/wallboard?dog=1' // finds where userType = wallboard
curl 'http://api.insto.co.uk:3000/API_KEY/message/to/firstname/Laura?foo=bar' // finds where firstname = Laura
curl 'http://api.insto.co.uk:3000/API_KEY/message/to/user_id/104?foo=bar' // finds where user_id = 104
```

### Query connected users
It is possible to query the connected users and detect who is connected that match a provided query.

```
curl 'http://api.insto.co.uk:3000/API_KEY/query?userType=web&businessId=501642881088'

{
  "data":[
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
