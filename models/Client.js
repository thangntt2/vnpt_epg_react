var Sequelize = require('sequelize')

module.exports = function(sequelize, DataTypes) {
  var Client = sequelize.define('OAuthClient', {
    clientId: Sequelize.STRING,
    clientSecret: Sequelize.STRING,
  }, {
    charset     : 'utf8mb4',
    collate     :'utf8mb4_bin'
  })
  return Client
}