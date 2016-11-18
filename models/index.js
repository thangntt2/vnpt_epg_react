// models/index.js
var Sequelize = require('sequelize')
var config = require('config').database
const host = process.env.MYSQL_HOST || config.host
const port = process.env.MYSQL_PORT || config.port

var sequelize = new Sequelize(
  config.database,
  config.user,
  config.password, {
    host: host,
    port: port
  },
  {define: {charset: 'utf8mb4', collate:'utf8mb4_bin'}})

var models = [
  'Channel',
  'Keyword',
  'Metacontent',
  'User',
  'Token',
]

models.forEach(function(model) {
  module.exports[model] = sequelize.import(__dirname + '/' + model)
});

(function(m) {
  m.Channel.hasMany(m.Keyword, {onDelete: 'CASCADE'})
  m.Keyword.belongsTo(m.Channel)
  m.Channel.hasMany(m.Metacontent, {onDelete: 'CASCADE'})
  m.Metacontent.belongsTo(m.Channel)
  //===========================
  m.User.hasMany(m.Token, { onDelete: 'CASCADE' })
  m.Token.belongsTo(m.User, { onDelete: 'CASCADE' })
})(module.exports)

models.forEach(function(model) {
  module.exports[model].sync()
})

module.exports.sequelize = sequelize