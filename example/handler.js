const expressInvoke = require('express-serverless-aws')
const app = require('./app')

module.exports = function(event, context) {
  return expressInvoke(app, event, context)
}
