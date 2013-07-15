var https = require('https');
var fs = require('fs');

var options = {
  key: fs.readFileSync('./includes/private.key').toString(),
  ca: [fs.readFileSync('./includes/additional.pem').toString()],
  cert: fs.readFileSync('./includes/public.pem').toString()
}

https.createServer(options, function (req, res) {
  res.writeHead(200);
  res.end("hello world\n");
}).listen(3001);