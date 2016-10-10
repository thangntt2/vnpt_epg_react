// models/index.js
var Sequelize = require('sequelize')
var config = require('config').database

var sequelize = new Sequelize(
  config.database,
  config.user,
  config.password, {
    host: config.host,
    port: config.port
  },
  {define: {charset: 'utf8mb4', collate:'utf8mb4_bin'}})

var models = [
  'Channel',
  'Keyword',
  'Metacontent',
  'Client',
  'User',
  'Token',
]

models.forEach(function(model) {
  module.exports[model] = sequelize.import(__dirname + '/' + model)
});

(function(m) {
  m.Channel.hasMany(m.Keyword, {onDelete: 'CASCADE'})
  m.Keyword.belongsTo(m.Channel)
  m.Channel.hasMany(m.Metacontent, {onDelete: 'CASCADE'})
  m.Metacontent.belongsTo(m.Channel)
})(module.exports)

models.forEach(function(model) {
  module.exports[model].sync()
})

module.exports.sequelize = sequelize

//=========================================================================
var Token = require('./Token')
var User = require('./User')
var Client = require('./Client')
module.exports.getAccessToken = function(bearerToken) {
  console.log('in getAccessToken (bearerToken: ' + bearerToken + ')')

  return Token.findOne({ accessToken: bearerToken })
}

/**
 * Get client.
 */

module.exports.getClient = function(clientId, clientSecret) {
  console.log('in getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')')

  return Client.findOne({ clientId: clientId, clientSecret: clientSecret })
}

/**
 * Get refresh token.
 */

module.exports.getRefreshToken = function(refreshToken) {
  console.log('in getRefreshToken (refreshToken: ' + refreshToken + ')')

  return Token.findOne({ refreshToken: refreshToken })
}

/*
 * Get user.
 */

module.exports.getUser = function(username, password) {
  console.log('in getUser (username: ' + username + ', password: ' + password + ')')

  return User.findOne({ username: username, password: password })
}

/**
 * Save token.
 */

module.exports.saveToken = function(token, client, user) {
  console.log('in saveToken (token: ' + token + ')')

  var accessToken = new Token({
    accessToken: token.accessToken,
    accessTokenExpiresOn: token.accessTokenExpiresOn,
    clientId: client.id,
    refreshToken: token.refreshToken,
    refreshTokenExpiresOn: token.refreshTokenExpiresOn,
    userId: user.id
  })

  return accessToken.save()
}