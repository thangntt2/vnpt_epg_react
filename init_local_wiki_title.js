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

knex.schema.createTableIfNotExists('vi_wiki_title', function(table) {
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
knex('vi_wiki_title')
	.count()
	.asCallback(function(err, count) {
		var count = count[0]['count(*)'];
		if (count > 1000000) {
			console.log("database created, no need to re-create!");
		} else {
			var lineReader = require('line-reader');
			lineReader.eachLine('viwiki_titles', function(line, last) {
				if (!last) {
					knex('vi_wiki_title')
							.insert({title:line.replace("_"," ")})
							.asCallback(function(err) {
								if (err) {
									console.error(err);
									} else {
										inserted++;
										if (inserted % 100000 == 0) {
											console.log("inserted " + inserted + " records");
										}
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
