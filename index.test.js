const path = require('path')
const fs = require('fs')
const express = require('express')
const bodyParser = require('body-parser')
const complexEvent = require('./events/complex')
const {invoke} = require('./')

test('handler error', async () => {
  const app = express()
  app.get('/', (req, res) => {
    throw new Error('greeting')
  })
  const res = await invoke(app, {
    httpMethod: 'GET',
    path: '/',
    headers: {}
  })
  expect(res.statusCode).toStrictEqual(500)
  expect(res.headers).toBeDefined()
})

test('not found', async () => {
  const app = express()
  app.get('/a', (req, res) => {
    res.send('ok')
  })
  const res = await invoke(app, {
    httpMethod: 'GET',
    path: '/a/b',
    headers: {}
  })
  expect(res.statusCode).toStrictEqual(404)
  expect(res.headers).toBeDefined()
})

test('middleware', async () => {
  const app = express()
  function middleware(req, res, next) {
    req.middlewareProp = 10
    next()
  }
  function middleware2(req, res, next) {
    req.middlewareProp2 = 20
    next()
  }
  app.use(middleware2)
  app.get('/a', middleware, (req, res) => {
    expect(req.middlewareProp).toEqual(10)
    expect(req.middlewareProp2).toEqual(20)
    res.send('ok')
  })
  const res = await invoke(app, {
    httpMethod: 'GET',
    path: '/a',
    headers: {}
  })
  expect(res.statusCode).toStrictEqual(200)
  expect(res.headers).toBeDefined()
  expect(res.body).toEqual('ok')
})

test('base64 request', async () => {
  const app = express()
  app.use(bodyParser.json())
  const body = { a: 10 }
  app.post('/', (req, res) => {
    expect(req.body).toStrictEqual(body)
    res.send('ok')
  })
  const res = await invoke(app, {
    httpMethod: 'POST',
    path: '/',
    isBase64Encoded: true,
    body: Buffer.from(JSON.stringify(body), 'utf8').toString('base64'),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  expect(res.statusCode).toStrictEqual(200)
  expect(res.headers).toBeDefined()
  expect(res.body).toEqual('ok')
})
test('base64 response', async () => {
  const app = express()
  app.use(bodyParser.json())
  const filePath = path.join(__dirname, 'files/image.jpg')
  const file = fs.readFileSync(filePath)
  app.get('/', (req, res, next) => {
    res.sendFile(filePath, {acceptRanges: false})
  })
  const res = await invoke(app, {
    httpMethod: 'GET',
    path: '/',
    headers: { }
  })
  expect(res.statusCode).toStrictEqual(200)
  expect(res.headers).toHaveProperty('content-length', 1105612)
  expect(res.headers).toHaveProperty('content-type', 'image/jpeg')
  expect(Buffer.from(res.body, 'base64').equals(file)).toBe(true)
})

test('complex', async () => {
  const app = express()
  app.use(bodyParser.json())
  app.disable('x-powered-by')
  app.disable('etag')

  app.post('/path/to/resource/:resource', (req, res) => {
    expect(req.query).toBeDefined()
    expect(req.query.foo).toStrictEqual('bar')
    expect(req.query.baz).toStrictEqual('qux')
    expect(req.header).toBeDefined()
    expect(req.header).toBeInstanceOf(Function)
    expect(req.header('accept-encoding')).toStrictEqual('gzip, deflate, sdch')
    expect(req.params).toBeDefined()
    expect(req.params.resource).toStrictEqual('boof')
    expect(req.body).toBeDefined()
    expect(req.body).toStrictEqual({
      first_name: 'joe',
      last_name: 'dirt'
    })
    expect(req.apigateway).toBeDefined()
    expect(req.apigateway).toHaveProperty('event')
    expect(req.apigateway).toHaveProperty('context')

    res.status(200)
      .set('set-cookie', ['derf', 'gerp' ])
      .json({ a: 10 })
  })

  const res = await invoke(app, complexEvent)

  expect(res.statusCode).toStrictEqual(200)
  expect(res.headers).toStrictEqual({
    'content-type': 'application/json; charset=utf-8',
    'content-length': '8',
  })
  expect(res.multiValueHeaders).toStrictEqual({
    'set-cookie': [ 'derf', 'gerp' ]
  })
  expect(res.body).toStrictEqual('{"a":10}')
})
