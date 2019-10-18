# express-serverless-aws

`express-serverless-aws` (this) is an attempt to bind API Gateway and Express in a minimally invasive manner, such that full Express API can be used without overhead of proxy server.

## Options for running Express-style app on API Gateway+Lambda

There are a few ways to integrate API Gateway and Express.

### A. The Proxy

On lambda invoke, create proxy server listening on unix socket (if one isn't already listening). Pack request context into request header, and unpack on the receiving proxy server. This adds some overhead to the incoming request. Also, recent releases of Node have quite a smaller request header limit than API Gateway, which means a client could overwhelm the server unintionally and errors would be ambiguous.

This is the solution employed by official [aws-serverless-express](https://github.com/awslabs/aws-serverless-express)

### B. The Express Mock

This technique eschews proxy servers, and instead mocks the Express API. One advantage of this is that dependency on express can be eliminated. Often the Express API is not fully/correctly implemented--this method should raise hairs.

### C. The Node.js HTTP mock

Rather than mocking Express API, a mock of Node's HTTP request. This is relatively commong, e.g. with [Restify's](https://github.com/dinesh-rawat/lambda-restify) API Gateway+Lambda.

### D. L'instance De Classe

No mocking of behavior. Create instance of HTTP.IncomingMessage and HTTP.ServerResponse. Create a dummy Socket that caches streamed data. Pass request and response to Express so it don't know no better. This is the attempt made here (express-serverless-aws).

## Example

app.js

```js
const express = require('express')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.json())
app.disable('x-powered-by')
app.disable('etag')

app.post('/path/to/resource', (req, res) => {
  res.status(200).json({ status: 'success' })
})

module.exports = app
```

handler.js

```js
const expressInvoke = require('express-serverless-aws')
const app = require('./app')

module.exports = function(event, context) {
  return expressInvoke(app, event)
}
```

## API

### `invoke(app, event, context, options): Promise<Object>`

**Arguments**

+ `app` *Object* express application
+ `event` *Object* API Gateway event
+ `context` *Object* API Gateway context
+ `options` *Object* (optional) options
+ `options.binaryMimeTypes` *Array* list of mime types to automatically base64-encode


**Returns**

+ `APIGatewayResponse:Promise<Object>` API Gateway response object

**Supports**

+ `multiValueHeaders` for requests and responses
+ `multiValueQueryStringParameters`

