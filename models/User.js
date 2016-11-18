var Sequelize = require('sequelize')

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    password: Sequelize.STRING,
    level: DataTypes.ENUM('spector','editor','admin','god'),
    name: Sequelize.STRING,
    image: Sequelize.STRING,
    username: { type: Sequelize.STRING(50), primaryKey: true },
  }, {
    charset     :'utf8mb4',
    collate     :'utf8mb4_bin'
  })
  return User
}