var config = require('config').database;

var knex = require('knex')({
  client: 'mysql',
  connection: {
    host     : config.host,
    port	 : config.port,
    user     : config.user,
    password : config.password,
    database : config.database
  }
});

var DB_NAME = "vi_wiki_title";

knex.schema.createTableIfNotExists(DB_NAME, function(table) {
	table.increments();
	table.string('title');
	table.charset('utf8');
	table.engine('InnoDB');
	table.collate('utf8_bin');
}).asCallback(function(err) {
	if (err) {
		console.err(err);
	} else {
		console.log("database created!!!");
	}
})

var inserted = 0;
knex(DB_NAME)
	.count()
	.asCallback(function(err, count) {
		var count = count[0]['count(*)'];
		if (count > 1000000) {
			console.log("database created, no need to re-create!");
		} else {
			var lineReader = require('line-reader');
			lineReader.eachLine('viwiki_titles', function(line, last) {
				if (!last) {
					knex(DB_NAME)
							.insert({title:line.replace("_"," ")})
							.catch(function(err) {
								console.error(err);
							})
							.then(function() {
								inserted++;
								if (inserted % 10000 == 0) {
									console.log("inserted " + inserted + " records");
								}
							});
				} else {
						knex.destroy(function() {
							console.log("done");
						})
				}
			});
		}
	});
