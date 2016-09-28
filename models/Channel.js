// vnpt_epg/models/channel.js
var Sequelize = require('sequelize')

module.exports = function(sequelize) {
  var Channel = sequelize.define('Channel', {
    id          : {type: Sequelize.STRING(20), primaryKey: true},
    name        : Sequelize.STRING,
    icon        : Sequelize.STRING,
    channel     : Sequelize.STRING
  }, {
    charset     : 'utf8mb4',
    collate     : 'utf8mb4_bin'
  })
  return Channel
}