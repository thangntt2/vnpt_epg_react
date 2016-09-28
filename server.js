require('babel-register')
var cors = require('cors')
var vne_scrape = require('./vnexpress_scrape')
var express = require('express')
var app = express()
var fs = require('fs')
var bodyParser = require('body-parser')
var JSON = require('JSON2')
const moment = require('moment')
moment.locale('vi')

app.use(cors())
app.set('models', require('./models'))
var Channel = app.get('models').Channel
var Keyword = app.get('models').Keyword
var Metacontent = app.get('models').Metacontent
var sequelize = app.get('models').sequelize

var config = require('config').database
var scrapy_dir = require('config').crawler_dir

var port = process.env.PORT || 8089
var router = express.Router({
  mergeParams : true,
})
const AuthURL = 'https://thangntt.au.auth0.com/oauth/ro'
var request = require('request')
var wikibot = require('nodemw')

var client = new wikibot({
  server : 'vi.wikipedia.org',
  path:'/w',
  debug: false
})

var elasticsearch = require('elasticsearch')
var esclient = new elasticsearch.Client({
  host: 'localhost:8889'
})

//run spiders
const exec = require('child_process').exec
const cron = require('node-cron')
cron.schedule('0 0 7,9,12,14,16,18,22 * * *', () => {
  console.log('Schedule spiders to crawl at ' + moment().format())
  exec('curl http://localhost:6800/schedule.json -d project=scrape_vne -d spider=dantri' 
      + '&& curl http://localhost:6800/schedule.json -d project=scrape_vne -d spider=vne'
      + '&& curl http://localhost:6800/schedule.json -d project=scrape_vne -d spider=xahoithongtin'
      + '&& curl http://localhost:6800/schedule.json -d project=scrape_vne -d spider=vnmedia')
})

app.use(bodyParser.urlencoded({ extended: true}))
app.use(bodyParser.json())

router.get('/channels', function (req, res) {
  Channel.findAll()
    .then(function(listChannels) {
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Content-Type', 'application/json charset=utf-8')
      res.end(JSON.stringify(listChannels))
    })
})

router.route('/channels/:channel_id/')
  .delete((req, res) => {
    Channel.destroy({
      where: {
        id : req.params.channel_id
      }
    }).then(channel => {
      if (channel)
        res.sendStatus(204)
    })
  })

router.route('/channels/:channel_id/keywords')
  .delete(function(req, res) {
    Keyword.destroy({
      where: {
        id      : req.body.id,
        ChannelId   : req.params.channel_id
      }
    })
    .then(function(keyword){
      if (keyword)
        res.sendStatus(204)
    })  
  })


router.route('/channels/:id/keywords')
  .post(function(req, res) {
    Keyword.create({
      keyword   : req.body.keyword,
      channel   : {
        id    : req.params.id
      },
      timestamps  : new Date().getTime() / 1000
    }, {
      include   : [Channel]
    }).then(function(keyword){
      // console.log('req = ' + req.params.id)
      Channel.findById(req.params.id)
      .then(function(channel) {
        channel.addKeywords(keyword)
      })
      res.sendStatus(201)
    })
  })

router.route('/channels/:channel_id/keywords')
  .put(function(req, res) {
    Keyword.findById(req.body.id).then(function(keyword) {
      keyword.update({
        keyword   : req.body.keyword,
        channel   : {
          id    : req.params.channel_id
        },
        timestamps  : new Date().getTime() / 1000
      })
    })
    res.sendStatus(201)
  })

router.route('/channels/:id/keywords')
  .get(function(req, res) {
    Keyword.findAll({
      where: {
        timestamps  : {
          gt    : req.query.start_time,
          lte   : req.query.end_time
        },
        ChannelId   : req.params.id
      }, 
      order: 'timestamps DESC'
    })
    .then(function(listKeywords){
      res.set('Content-Type', 'application/json charset=utf-8')
      res.end(JSON.stringify(listKeywords))  
    })
  })

const getFirstItem = function(obj) {
  const key = Object.keys(obj).shift()
  return obj[key]
}

var replaceAll = function(string, omit, place, prevstring) {
  if (prevstring && string === prevstring)
    return string
  prevstring = string.replace(omit, place)
  return replaceAll(prevstring, omit, place, string)
}

router.route('/metacontents/query_wiki')
  .get(function(req, res) {
    var entity = req.query.entity
    res.set('Content-Type', 'application/json charset=utf-8')
    let params = {
      format  : 'xml',
      action  : 'query',
      continue : '',
      prop  : 'extracts|pageimages',
      exintro : '',
      explaintext: '',
      rvprop  : 'timestamp|user|comment|content',
      titles  : entity,
      pithumbsize : '400'
    }
    client.api.call(params, function(err, info, next, data) {
      var wikiPage = getFirstItem(data.query.pages)
      var ret = {}
      ret.name = wikiPage.title
      ret.url = 'https://vi.wikipedia.org/wiki/' + replaceAll(entity, ' ', '_')
      if (wikiPage.thumbnail) {
        ret.image = wikiPage.thumbnail.source
      }
      ret.description = wikiPage.extract
      res.end(JSON.stringify(ret))
    })
  })

router.route('/channels/:id/metacontents')
  .post(function(req, res) {
    Metacontent.create({
      name    : req.body.name,
      description : req.body.description,
      url     : req.body.url,
      category  : req.body.category,
      image   : req.body.image,
      channel   : {
        id    : req.body.id
      },
      timestamps  : new Date().getTime() / 1000
    }, {
      include   : [Channel]
    }).then(function(metacontents){
      Channel.findById(req.params.id)
      .then(function(channel) {
        channel.addMetacontents(metacontents)
      })
      res.sendStatus(201)
    })
  })

router.route('/channels/:id/metacontents')
  .get(function(req, res) {
    Metacontent.findAll({
      where: {
        timestamps  : {
          gt    : req.query.start_time,
          lte   : req.query.end_time
        },
        ChannelId   : req.params.id
      },
      order: 'timestamps DESC',
    })
    .then(function(listMetacontents){
      res.set('Content-Type', 'application/json charset=utf-8')
      res.end(JSON.stringify(listMetacontents))  
    })  
  })

router.route('/channels/:channel_id/metacontents')
  .delete(function(req, res) {
    Metacontent.destroy({
      where: {
        id      : req.body.id,
        ChannelId   : req.params.channel_id
      }
    })
    .then(function(metacontent){
      if (metacontent)
        res.sendStatus(204)
    })  
  })

router.route('/channels/:channel_id/metacontents')
  .put(function(req, res) {
    Metacontent.findById(req.body.id).then(function(metacontent) {
      metacontent.update({
        name    : req.body.name,
        description : req.body.description,
        url     : req.body.url,
        category  : req.body.category,
        image   : req.body.image,
        channel   : {
          id    : req.params.channel_id
        },
        timestamps  : new Date().getTime() / 1000
      },{
        include   : [Channel]
      }).then(result => {
        if (result)
          res.sendStatus(201)
        else 
          res.sendStatus(400)
      })
    })
  })

router.get('/channels/:id', function(req, res) {
  Channel.findById(req.params.id)
  .then(function(channel) {
    res.set('Content-Type', 'application/json charset=utf-8')
    res.end(JSON.stringify(channel))
  })
})

router.get('/channels/number/:number', function(req, res) {
  Channel.findOne({
    where: {
      channel : req.params.number
    }
  })
  .then(function(channel) {
    res.set('Content-Type', 'application/json charset=utf-8')
    res.end(JSON.stringify(channel))
  })
})

router.route('/channels')
  .post(function(req, res) {
    Channel.create({
      name  : req.body.name,
      icon  : req.body.icon,
      channel : req.body.channel
    }).then(function(channel) {
      res.sendStatus(201)
      res.end('Channel created with id = ' + channel.id)
    })
  })

router.route('/metacontent/:metacontent_id')
  .get(function(req, res) {
    Metacontent.findById(req.params.metacontent_id)
      .then(function(metacontent) {
        res.set('Content-Type', 'application/json charset=utf-8')
        res.end(JSON.stringify(metacontent))  
      })
  })

router.route('/keywords/:keyword_id')
  .get(function(req, res) {
    Keyword.findById(req.params.keyword_id)
      .then(function(keyword) {
        res.set('Content-Type', 'application/json charset=utf-8')
        res.end(JSON.stringify(keyword))    
      })
  })
  
router.route('/metacontents')
  .get(function(req, res) {
    Metacontent.findAll()
    .then(function(metacontens) {
      res.set('Content-Type', 'application/json charset=utf-8')
      res.end(JSON.stringify(metacontens))
    })
  })
router.route('/metacontents/query_news')
  .get(function(req,res) {
    let url = req.query.url
    if (url.indexOf('vnexpress') > -1) {
      res.set('Content-Type', 'application/json charset=utf-8')
      vne_scrape.scrape_vne(url)
        .then(function(article) {
          res.end(JSON.stringify(article))
        })
    }
  })

router.route('/metacontents/search_wiki')
  .get((req, res) => {
    let params = {
      action: 'opensearch',
      format: 'json',
      formatversion: 2,
      namespace: 0,
      limit: 10,
      suggest: true,
      search: req.query.entity
    }

    client.api.call(params, function(err, info, next, data) {
      res.set('Content-Type', 'application/json charset=utf-8')
      res.end(JSON.stringify(data))
    })
  })

router.route('/metacontents/search_news')
  .get(function(req, res) {
    esclient.search({
      body: {
        query: {
          bool: {
            must: {
              multi_match: {
                query: req.query.entity,
                fields: ['title', 'description']
              }
            },
            filter: {
              terms: {
                source: JSON.parse(req.query.sites)
              }
            }
          }
        },
        fields: ['title', 'description', 'image', 'url', 'source']
      }
    }).then(body => {
      res.set('Content-Type', 'application/json charset=utf-8')
      res.end(JSON.stringify(body.hits.hits))
    })
  })
  
router.route('/keywords')
  .get(function(req, res) {
    Keyword.findAll()
      .then(function(keywords) {
        res.set('Content-Type', 'application/json charset=utf-8')
        res.end(JSON.stringify(keywords))
      })
  })

var superagent = require('superagent')
router.route('/scrapy/schedule')
  .get((req, res) => {
    res.set('Content-Type', 'application/json charset=utf-8')
    superagent
      .get('http://localhost:6800/listjobs.json?project=scrape_vne')
      .end((err, result) => {
        res.end(JSON.stringify(result.body))
      }) 
  })

app.use('/api', router)

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Credentials',true)
  next()
})

app.listen(port)
console.log('Magic begin here on port ' + port)