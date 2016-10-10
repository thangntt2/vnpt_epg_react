var Sequelize = require('sequelize')

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('OAuthUsers', {
    email: Sequelize.STRING,
    firstname: Sequelize.STRING,
    lastname: Sequelize.STRING,
    password: Sequelize.STRING,
    username: Sequelize.STRING,
  }, {
    charset     : 'utf8mb4',
    collate     :'utf8mb4_bin'
  })
  return User
}