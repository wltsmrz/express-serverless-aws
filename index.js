const http = require('http')
const url = require('url')
const stream = require('stream')
const compressible = require('compressible')
const kResponseBodySink = Symbol()

function keysToLowerCase(obj) {
  const ret = {}
  Object.entries(obj).forEach(([key, val]) =>
    ret[key.toLowerCase()] = val)
  return ret
}

function shouldEncodeResponseBody(response) {
  const contentType = response.headers['content-type']
  return contentType && !compressible(contentType.split(';')[0])
}

function mapApiGatewayErrorResponse(error) {
  return { statusCode: 500, body: 'Internal error' }
}

function mapApiGatewayResponseHeaders(headers) {
  const ret = {
    headers: {},
    multiValueHeaders:  {}
  }
  Object.entries(headers).forEach(([header, value]) => {
    if (Array.isArray(value)) {
      ret.multiValueHeaders[header] = value
    } else if (!(header === 'transfer-encoding' && value === 'chunked')) {
      ret.headers[header] = value
    }
  })
  return ret
}

function mapApiGatewayResponse(response, responseBody) {
  const result = {
    statusCode: response.statusCode
  }
  Object.assign(result, mapApiGatewayResponseHeaders(response.getHeaders()))
  const body = Buffer.concat(responseBody).slice(response._header.length)
  return Object.assign(result, 
    shouldEncodeResponseBody(result)
    ? { isBase64Encoded: true, body: body.toString('base64') }
    : { body: body.toString() }
  )
}

function mapApiGatewayRequestHeaders(event) {
  const headers = Object.assign({}, event.multiValueHeaders, event.headers)
  if (event.body && !headers['content-length']) {
    headers['content-length'] = Buffer.byteLength(event.body).toString()
  }
  return keysToLowerCase(headers)
}

function mapApiGatewayRequestUrl(event) {
  const query = Object.assign({}, event.queryStringParameters, event.multiValueQueryStringParameters)
  return url.format({ pathname: event.path, query })
}

function mapApiGatewayRequest(event) {
  return {
    method: event.httpMethod,
    url: mapApiGatewayRequestUrl(event),
    headers: mapApiGatewayRequestHeaders(event)
  }
}

function makeRequest(socket, apiGatewayEvent, apiGatewayContext) {
  const request = new http.IncomingMessage(socket)
  Object.assign(request, mapApiGatewayRequest(apiGatewayEvent))
  Object.assign(request, { apigateway: { event: apiGatewayEvent, context: apiGatewayContext } })
  if (apiGatewayEvent.body) {
    request.push(apiGatewayEvent.body)
    request.push(null)
  }
  return request
}

function makeResponse(socket, request) {
  const response = new http.ServerResponse(request)
  response.assignSocket(socket)
  return response
}

function makeSocket() {
  const socket = new stream.PassThrough()
  socket[kResponseBodySink] = []
  socket.on('data', (data) => socket[kResponseBodySink].push(data))
  return socket
}

function invoke(handler, apigEvent, apigContext) {
  const socket = makeSocket()
  const request = makeRequest(socket, apigEvent, apigContext)
  const response = makeResponse(socket, request)

  return new Promise((resolve, reject) => {
    function errorHandler(err, req, res, next) {
      if (err) {
        return resolve(mapApiGatewayErrorResponse(err))
      }
      resolve({ statusCode: 404, message: 'Not found' })
    }

    request.on('error', (err) =>
      resolve(mapApiGatewayErrorResponse(err)))
    response.on('error', (err) =>
      resolve(mapApiGatewayErrorResponse(err)))
    response.on('finish', () =>
      resolve(mapApiGatewayResponse(response, socket[kResponseBodySink])))

    handler(request, response, errorHandler)
  })
}

if (process.env.NODE_ENV === 'test') {
  exports.keysToLowerCase = keysToLowerCase
  exports.shouldEncodeResponseBody = shouldEncodeResponseBody

  exports.makeRequest = makeRequest
  exports.makeResponse = makeResponse
  exports.makeSocket = makeSocket

  exports.mapApiGatewayErrorResponse = mapApiGatewayErrorResponse
  exports.mapApiGatewayResponseHeaders = mapApiGatewayResponseHeaders
  exports.mapApiGatewayResponse = mapApiGatewayResponse

  exports.mapApiGatewayRequestHeaders = mapApiGatewayRequestHeaders
  exports.mapApiGatewayRequestUrl = mapApiGatewayRequestUrl
  exports.mapApiGatewayRequest = mapApiGatewayRequest
}

exports.invoke = invoke

