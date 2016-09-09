// vnpt_epg/models/channel.js
var Sequelize = require('sequelize');
var sequelize = new Sequelize('database', 'username', 'password')

module.exports = function(sequelize, DataTypes) {
  var Channel = sequelize.define('Channel', {
    name        : Sequelize.STRING,
    icon        : Sequelize.STRING,
    channel     : Sequelize.STRING
  })
  return Channel
}