require('babel-register')
var cors = require('cors')
var express = require('express')
var jwt = require('express-jwt')
var app = express()
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

var jwtCheck = jwt({
  secret: new Buffer('4IYD2lhR6f_WYpyptFktH2gBFduPsvyz5TeZMvWepFVXQlPFeu3IQn9PeIx2Xlwt', 'base64'),
  audience: 'OTYXYV8Eu0UZ139YKuPk94cX7UhP2pgH'
})

const MWBot = require('mwbot')

const bot = new MWBot()
bot.login({
  apiUrl: 'https://vi.wikipedia.org/w/api.php',
  username: 'vnptwikibot',
  password: 'nhuthienthu1',
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

router.route('/channels/:id/metacontents')
  .post(function(req, res) {
    Metacontent.create({
      name    : req.body.name,
      description : req.body.description,
      url     : req.body.url,
      category  : req.body.category,
      image   : req.body.image,
      channel   : {
        id    : req.params.id
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
      id : req.body.id,
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
    Metacontent.findAll({
      where: {
        timestamps: {
          gt: new Date().getTime() / 1000 - 24*3600,
        }
      },
      order: 'timestamps DESC',
    }).then(function(metacontens) {
      res.set('Content-Type', 'application/json charset=utf-8')
      res.end(JSON.stringify(metacontens))
    })
  })

router.route('/metacontents/search_wiki')
  .get((req, res) => {
    bot.request({
      action: 'opensearch',
      format: 'json',
      formatversion: 2,
      redirect: 1,
      namespace: 0,
      limit: 10,
      suggest: true,
      search: req.query.entity,
    }).then(response => {
      return response[1].map((entity, index) => {
        return ({
          title: entity,
          description: response[2][index],
          url: response[3][index],
        })
      })
    }).then(results => {
      const titles = results.reduce((pre,entity) => {
        pre = `${pre}|${entity.title}`
        return pre
      }, '')
      bot.request({
        action: 'query',
        format: 'json',
        prop: 'pageimages',
        titles: titles,
        redirects: 1,
        formatversion: 2,
        piprop: 'thumbnail',
        pithumbsize: 400,
        pilimit: 10,
      }).then(response => {
        return response.query.pages.reduce((pre, page) => {
          if (page.thumbnail)
            pre[page.title] = page.thumbnail.source
          return pre
        })
      }).then(images => {
        const value = results.map(result => {
          if (images[result.title])
            return ({
              name: result.title,
              description: result.description,
              url: result.url,
              image: images[result.title],
              source: 'vi.wikipedia.org',
            })
          return result
        })
        res.set('Content-Type', 'application/json charset=utf-8')
        res.end(JSON.stringify(value))
      })
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
      const results = body.hits.hits.map(hit => {
        const res = {
          name: hit.fields.title[0],
          description: hit.fields.description[0],
          image: hit.fields.image && hit.fields.image[0],
          url: hit.fields.url[0],
          source: hit.fields.source[0],
          time: hit._index.replace('news_index-','').replace('_','/').replace('_','/')
        }
        return res
      })
      res.set('Content-Type', 'application/json charset=utf-8')
      res.end(JSON.stringify(results))
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

app.use('/api', jwtCheck)

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Credentials',true)
  next()
})

app.listen(port)
console.log('Magic begin here on port ' + port)