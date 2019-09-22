
[aws-serverless-express](https://github.com/awslabs/aws-serverless-express) creates proxy server listening on unix socket so that implementors can leverage Express API. It creates request against server on lambda invoke, packing API Gateway event & context into headers and reconstituting server-side via middleware.

`express-serverless-aws` (this) is an attempt to bind API Gateway and Express in a minimally invasive manner, such that full Express API can be used without overhead of proxy server.

Logical steps:

+ `invoke(app, event, context): Promise<Object>` creates a Node HTTP request/response with a dummy socket that buffers writes
+ Node `IncomingMessage` instance is created from API Gateway request
+ Express router is invoked
+ `finish` event emitted
+ Node response is formatted for API Gateway

Things it supports

+ `multiValueHeaders` for requests and responses
+ `multiValueQueryStringParameters`
+ Automatic base64-encoding via negating [compressible](https://github.com/jshttp/compressible)

TODO

+ Should probably do something with `event.pathParameters`
+ Should probably find an unintrusive way to customize auto-base-64



