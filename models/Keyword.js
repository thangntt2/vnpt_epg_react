//models/Keyword.js
var Sequelize = require('sequelize')

module.exports = function(sequelize) {
  return sequelize.define('Keyword', {
    timestamps		: Sequelize.BIGINT,
    keyword		 	: Sequelize.STRING
  }, {
    charset     : 'utf8mb4',
    collate     :'utf8mb4_bin'
  })
}
