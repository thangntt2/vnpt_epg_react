// models/index.js
var bot = require('nodemw');

var client = new bot({
	server : 'vi.wikipedia.org',
	path:'/w',
	debug: false
});

params = {
	format	: 'xml',
	action 	: 'query',
	continue : '',
	prop 	: 'extracts|pageimages',
	exintro	: '',
	explaintext: '',
	rvprop	: 'timestamp|user|comment|content',
	titles	: 'Marco Reus',
	pithumbsize	: '400'
}

const getFirstItem = function(obj) {
	const key = Object.keys(obj).shift();
	return obj[key];
};

client.api.call(params, function(err, info, next, data) {
	console.log(getFirstItem(data.query.pages));
});


// var MediaWiki = require("mediawiki");
// var bot = new MediaWiki.Bot({
// 	endpoint : "https://vi.wikipedia.org/w/api.php",    
// 	rate: 60e3 / 10,
//     userAgent: "ExampleBot <https://en.wiktionary.org/wiki/User:Example>",
//     byeline: "(example bot edit)"
// });

// var request = bot.get({
// 	format	: 'json',
// 	action 	: 'query',
// 	continue : '',
// 	prop 	: 'extracts',
// 	exintro	: '',
// 	explaintext: '',
// 	rvprop	: 'timestamp|user|comment|content',
// 	titles	: 'Hồ Chí Minh',
// 	pithumbsize	: '400'
// 	// action: "query", 
// 	// meta	: "userinfo"
// }).complete(function(response){
// 	console.log(Object.keys(response.query.pages));
// });