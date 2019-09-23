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

