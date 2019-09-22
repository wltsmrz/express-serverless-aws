const {invoke} = require('./')
const express = require('express')
const bodyParser = require('body-parser')
const complexEvent = require('./events/complex')

test('invoke() complex', async () => {
  const app = express()
  app.use(bodyParser.json())
  app.disable('x-powered-by')
  app.disable('etag')

  app.post('/path/to/resource/:resource', (req, res) => {
    expect(req.body).toStrictEqual({
      first_name: 'joe',
      last_name: 'dirt'
    })

    expect(req.query.foo).toStrictEqual('bar')
    expect(req.query.baz).toStrictEqual('qux')
    expect(req.header('accept-encoding')).toStrictEqual('gzip, deflate, sdch')
    expect(req.params.resource).toStrictEqual('boof')

    res.status(200)
      .set('set-cookie', ['derf', 'gerp' ])
      .json({ a: 10 })
  })

  const res = await await invoke(app, complexEvent)

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
