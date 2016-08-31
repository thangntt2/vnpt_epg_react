// models/index.js
var Sequelize = require('sequelize');
var config = require('config').database;

var sequelize = new Sequelize(
	config.database,
	config.user,
	config.password, {
		host : config.host,
		port : config.port
	},
	define: {charset: 'utf8mb4', collate:'utf8mb4_bin'});

var models = [
	'Channel',
	'Keyword',
	'Metacontent'
];

models.forEach(function(model) {
	console.log("dirname = " + __dirname + "/" + model);
	module.exports[model] = sequelize.import(__dirname + '/' + model);
});

(function(m) {
  m.Channel.hasMany(m.Keyword);
  m.Keyword.belongsTo(m.Channel);
  m.Channel.hasMany(m.Metacontent);
  m.Metacontent.belongsTo(m.Channel);
})(module.exports);

models.forEach(function(model) {
	module.exports[model].sync();
});

module.exports.sequelize = sequelize;