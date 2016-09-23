//models/Metacontent.js
var Sequelize = require('sequelize')

module.exports = function(sequelize, DataTypes) {
  var Metacontent = sequelize.define('Metacontent', {
    name: Sequelize.STRING,
    timestamps: Sequelize.BIGINT,
    description: Sequelize.STRING,
    url: Sequelize.STRING,
    image: Sequelize.STRING,
    category: DataTypes.ENUM('person','location','article','organization')
  }, {
    charset     : 'utf8mb4',
    collate     :'utf8mb4_bin'
  })
  return Metacontent
}
