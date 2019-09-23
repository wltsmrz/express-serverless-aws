
[aws-serverless-express](https://github.com/awslabs/aws-serverless-express) creates proxy server listening on unix socket so that implementors can leverage Express API. It creates request against server on lambda invoke, packing API Gateway event & context into headers and reconstituting server-side via middleware.

`express-serverless-aws` (this) is an attempt to bind API Gateway and Express in a minimally invasive manner, such that full Express API can be used without overhead of proxy server.

Supports

+ `multiValueHeaders` for requests and responses
+ `multiValueQueryStringParameters`

# API

## `invoke(app, event, context, options): Promise<Object>`

**Arguments**

+ `app` *Object* express application
+ `event` *Object* API Gateway event
+ `context` *Object* API Gateway context
+ `options` *Object* (optional) options
+ `options.binaryMimeTypes` *Array* list of mime types to automatically base64-encode


**Returns**

+ *Promise<Object>* API Gateway response object

TODO

+ Should probably do something with `event.pathParameters`



