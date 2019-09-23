const http = require('http')
const url = require('url')
const stream = require('stream')
const compressible = require('compressible')
const kResponseBodySink = Symbol('kResponseBodySink')

const defaultBinaryMimeTypes = [
  'application/octet-stream',
  'application/x-bzip',
  'application/x-bzip2',
  'application/gzip',
  'application/zip',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/pdf',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  'font/otf',
  'font/ttf',
  'font/woff',
  'font/woff2',
]

function keysToLowerCase(obj) {
  const ret = {}
  Object.entries(obj).forEach(([key, val]) =>
    ret[key.toLowerCase()] = val)
  return ret
}

function shouldEncodeResponseBody(response, options) {
  const contentType = response.headers['content-type']
  if (Array.isArray(options.binaryMimeTypes)) {
    return options.binaryMimeTypes.includes(contentType)
  }
  return defaultBinaryMimeTypes.includes(contentType)
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


function mapApiGatewayResponse(response, options) {
  const result = {
    statusCode: response.statusCode
  }
  const responseBody = response.socket[kResponseBodySink]
  Object.assign(result, mapApiGatewayResponseHeaders(response.getHeaders()))
  const body = Buffer.concat(responseBody).slice(response._header.length)
  return Object.assign(result, 
    shouldEncodeResponseBody(result, options)
    ? { isBase64Encoded: true, body: body.toString('base64') }
    : { body: body.toString() }
  )
}

function mapApiGatewayRequestHeaders(event) {
  const headers = Object.assign({}, event.multiValueHeaders, event.headers)
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

function makeRequest(socket, event, context) {
  const request = new http.IncomingMessage(socket)
  Object.assign(request, mapApiGatewayRequest(event))
  Object.assign(request, { apigateway: { event: event, context: context } })
  if (event.body) {
    const body = event.isBase64Encoded ?  Buffer.from(event.body, 'base64') : event.body
    request.headers['content-length'] = Buffer.byteLength(body)
    request.push(body)
  }
  request.push(null)
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

function invoke_(handler, event, context = {}, options = {}) {
  const socket = makeSocket()
  const request = makeRequest(socket, event, context)
  const response = makeResponse(socket, request)

  return new Promise((resolve, reject) => {
    socket.on('drain', () => response.emit('drain'))

    request.on('error', (error) =>
      resolve(mapApiGatewayErrorResponse(error)))
    response.on('error', (error) =>
      resolve(mapApiGatewayErrorResponse(error)))
    response.on('finish', () =>
      resolve(mapApiGatewayResponse(response, options)))

    if (handler.handle) {
      handler.handle(request, response)
    } else {
      handler(request, response)
    }
  })
}

async function invoke(handler, event, context, options) {
  try {
    return await invoke_(handler, event, context, options)
  } catch (exception) {
    return mapApiGatewayErrorResponse(exception)
  }
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

