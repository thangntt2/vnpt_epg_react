var express = require('express');
var app = express();
var fs = require("fs");
var bodyParser = require('body-parser');
var JSON = require('JSON2');

app.set('models', require('./models'));
var Channel = app.get('models').Channel;
var Keyword = app.get('models').Keyword;
var Metacontent = app.get('models').Metacontent;


var port = process.env.PORT || 8081;
var router = express.Router({
	mergeParams : true
});


app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());


router.get('/channels', function (req, res) {
   	Channel.findAll()
   	.then(function(listChannels) {
   		res.set('Content-Type', 'application/json');
   		res.end(JSON.stringify(listChannels));
   	});
});

router.route('/channels/:channel_id/keywords')
	.delete(function(req, res) {
		Keyword.destroy({
			where: {
				id 			: req.body.id,
				ChannelId 	: req.params.channel_id
			}
		})
		.then(function(metacontent){
			res.sendStatus(204);
		})	
	})


router.route('/channels/:id/keywords')
	.post(function(req, res) {
		Keyword.create({
			keyword 	: req.body.keyword,
			channel 	: {
				id  	: req.params.id
			},
			timestamps 	: new Date().getTime() / 1000
		}, {
			include 	: [Channel]
		}).then(function(keyword){
			// console.log("req = " + req.params.id);
			Channel.findById(req.params.id)
			.then(function(channel) {
		   		channel.addKeywords(keyword);
		   	});
			res.sendStatus(201);
		})
	})

router.route('/channels/:channel_id/keywords')
	.put(function(req, res) {
		Keyword.findById(req.body.id).then(function(keyword) {
		   		keyword.update({
					keyword 	: req.body.keyword,
					channel 	: {
						id  	: req.params.channel_id
					},
					timestamps 	: new Date().getTime() / 1000
		   		})
		   	});
			res.sendStatus(201);
		})

router.route('/channels/:id/keywords')
	.get(function(req, res) {
		Keyword.findAll({
			where: {
				timestamps 	: {
					gt 		: req.query.start_time,
					lte 	: req.query.end_time
				},
				ChannelId 	: req.params.id
			}
		})
		.then(function(listKeywords){
			res.set('Content-Type', 'application/json');
   			res.end(JSON.stringify(listKeywords));	
		})
	})

router.route('/metacontents/search')
	.get(function(req, res) {
		console.log("wtf: " + req.query.entity);
		var request = require('request');
		request({	
			url:'http://127.0.0.1:8080/wiki_search',
			method:'GET',
			qs:{
				entity:req.query.entity
			},
			json: true}
			, function(err, response, body) {
				body.category = req.query.category;
				res.end(JSON.stringify(body));
			})
	})

router.route('/channels/:id/metacontents')
	.post(function(req, res) {
		Metacontent.create({
			name		: req.body.name,
			description	: req.body.description,
			url 		: req.body.url,
			category	: req.body.category,
			image		: req.body.image,
			channel 	: {
				id  	: req.body.id
			},
			timestamps 	: new Date().getTime() / 1000
		}, {
			include 	: [Channel]
		}).then(function(metacontents){
			Channel.findById(req.params.id)
			.then(function(channel) {
		   		channel.addMetacontents(metacontents);
		   	});
			res.sendStatus(201);
		})
	})

router.route('/channels/:id/metacontents')
	.get(function(req, res) {
		Metacontent.findAll({
			where: {
				timestamps 	: {
					gt 		: req.query.start_time,
					lte 	: req.query.end_time
				},
				ChannelId 	: req.params.id
			}
		})
		.then(function(listMetacontents){
			res.set('Content-Type', 'application/json');
   			res.end(JSON.stringify(listMetacontents));	
		})	
	})

router.route('/channels/:channel_id/metacontents')
	.delete(function(req, res) {
		Metacontent.destroy({
			where: {
				id 			: req.query.id,
				ChannelId 	: req.params.channel_id
			}
		})
		.then(function(metacontent){
			res.sendStatus(204);
		})	
	})

router.route('/channels/:channel_id/metacontens')
	.put(function(req, res) {
		Metacontent.findById(req.body.id).then(function(metacontent) {
		   		metacontent.update({
					name		: req.body.name,
					description	: req.body.description,
					url 		: req.body.url,
					category	: req.body.category,
					image		: req.body.image,
					channel 	: {
						id  	: req.params.channel_id
					},
					timestamps 	: new Date().getTime() / 1000
		   		},{
		   			include		: [Channel]
		   		}).then(function(res) {
		   			res.sendStatus(201);
		   		})
		   	});
		})

router.get('/channels/:id', function(req, res) {
	Channel.findById(req.params.id)
	.then(function(channel) {
   		res.set('Content-Type', 'application/json');
   		res.end(JSON.stringify(channel));
   	});
});

router.get('/channels/number/:number', function(req, res) {
	Channel.findOne({
		where: {
			channel : req.params.number
		}
	})
	.then(function(channel) {
   		res.set('Content-Type', 'application/json');
   		res.end(JSON.stringify(channel));
   	});
});

router.route('/channels')
	.post(function(req, res) {
		var channel = Channel.create({
			name	: req.body.name,
			icon	: req.body.icon,
			channel : req.body.channel
		}).then(function(channel) {
			res.sendStatus(201);
			res.end("Channel created with id = " + channel.id);
		});
	})

app.use('/api', router);

app.listen(port);
console.log('Magic begin here on port ' + port);