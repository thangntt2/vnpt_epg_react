var Sequelize = require('sequelize')

module.exports = function(sequelize, DataTypes) {
  var Token = sequelize.define('AccessToken', {
    accessToken: Sequelize.STRING,
    accessTokenExpiresOn: Sequelize.BIGINT,
  }, {
    charset     : 'utf8mb4',
    collate     :'utf8mb4_bin'
  })
  return Token
}