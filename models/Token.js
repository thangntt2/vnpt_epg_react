var Sequelize = require('sequelize')

module.exports = function(sequelize, DataTypes) {
  var Token = sequelize.define('OAuthToken', {
    accessToken: Sequelize.STRING,
    accessTokenExpiresOn: Sequelize.TIME,
    clientId: Sequelize.STRING,
    refeshToken: Sequelize.STRING,
    refeshTokenExpiresOn: Sequelize.STRING,
    userId: Sequelize.STRING,
  }, {
    charset     : 'utf8mb4',
    collate     :'utf8mb4_bin'
  })
  return Token
}