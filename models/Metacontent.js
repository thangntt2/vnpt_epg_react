//models/Metacontent.js
var Sequelize = require('sequelize');
var sequelize = new Sequelize('database', 'username', 'password')

module.exports = function(sequelize, DataTypes) {
	var Metacontent = sequelize.define('Metacontent', {
		name			: Sequelize.STRING,
		timestamps		: Sequelize.BIGINT,
		description		: Sequelize.STRING,
		url				: Sequelize.STRING,
		image			: Sequelize.STRING,
		category		: DataTypes.ENUM('person','location','article','organization')
	});
	return Metacontent;
}
