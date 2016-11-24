//models/Metacontent.js
var Sequelize = require('sequelize')

module.exports = function(sequelize) {
  var NewsProvider = sequelize.define('News', {
    name: Sequelize.STRING,
    baseurl: Sequelize.STRING,
  }, {
    charset     : 'utf8mb4',
    collate     :'utf8mb4_bin'
  })
  return NewsProvider
}
