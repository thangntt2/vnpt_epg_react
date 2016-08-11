//models/Keyword.js
var Sequelize = require('sequelize');
var sequelize = new Sequelize('database', 'username', 'password')

module.exports = function(sequelize, DataTypes) {
	var Keyword = sequelize.define('Keyword', {
		timestamps		: Sequelize.BIGINT,
		keyword		 	: Sequelize.STRING
	});
	return Keyword;
}
