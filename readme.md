
`express-serverless-aws` (this) is an attempt to bind API Gateway and Express in a minimally invasive manner, such that full Express API can be used without overhead of proxy server.

[Prevailing solution](https://github.com/awslabs/aws-serverless-express) creates proxy server listening on unix socket so that implementors can leverage Express API. It creates request against server on lambda invoke, packing API Gateway event & context into headers and reconstituting server-side via middleware.

Supports

+ `multiValueHeaders` for requests and responses
+ `multiValueQueryStringParameters`


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



