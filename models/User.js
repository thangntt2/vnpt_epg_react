var Sequelize = require('sequelize')

module.exports = function(sequelize) {
  var User = sequelize.define('User', {
    password: Sequelize.STRING,
    username: { type: Sequelize.STRING(50), primaryKey: true },
  }, {
    charset     :'utf8mb4',
    collate     :'utf8mb4_bin'
  })
  return User
}