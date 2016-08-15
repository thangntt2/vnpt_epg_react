var config = require('config').database;

var knex = require('knex')({
  client: 'mysql',
  connection: {
    host     : config.host,
    port	 : config.port,
    user     : config.user,
    password : config.password,
    database : config.database,
    charset  : "utf8mb4"
  }
});

var DB_NAME = "vi_wiki_title";

knex.schema.createTableIfNotExists(DB_NAME, function(table) {
	table.increments();
	table.string('title');
	table.charset('utf8mb4');
	table.engine('InnoDB');
	table.collate('utf8mb4_bin');
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
			var lineByLine = require('n-readlines');
			var liner = new lineByLine('./viwiki_titles');

			loop = function(line) {
			    num = batch_line.push({title: line.toString().replace("_"," ")});
			    if (num == 1000) {
			    	knex.batchInsert(DB_NAME, batch_line, 1000)
			    		.then(function() {
			    			inserted += 1000;
			    			console.log("inserted " + inserted + " records");
			    			batch_line = [];
			    			line = liner.next();
			    			if (line)
			    				loop(line);
			    			else {
			    				console.log("done");
			    				knex.destroy(function() {
									console.log("done");
								})
			    			}
			    		})
			    		.catch(function(err){
			    			console.log(err);
			    		});
			    } else {
			    	line = liner.next();
			    	if (line)
	    				loop(line);
	    			else {
	    				knex.batchInsert(DB_NAME, batch_line, 1000)
			    			.then(function() {
			    				knex.destroy(function() {
									console.log("done");
								});
	    					});
	    			}
			    }
			}

			var line;
			var batch_line = [];
			line = liner.next();
			loop(line);
		}
	});
