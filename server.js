//=========import========================
require('babel-register')
var cors = require('cors')
var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var JSON = require('JSON2')
const moment = require('moment')
moment.locale('vi')

app.set('models', require('./models'))
var Channel = app.get('models').Channel
var Keyword = app.get('models').Keyword
var Metacontent = app.get('models').Metacontent
var Token = app.get('models').Token
var User = app.get('models').User
const config = require('config').constant

//==========seed user================
const sequelize_fixtures = require('sequelize-fixtures')
const models = app.get('models')
sequelize_fixtures.loadFile('config/seed_users.json', models).then(function() {
  console.log('seeded new users')
})

//========constant=======================
const ELASTICHSEARCH_URL = process.env.ELASTICHSEARCH_URL || config.ELASTICHSEARCH_URL
const ELASTICHSEARCH_PORT = process.env.ELASTICHSEARCH_PORT || config.ELASTICHSEARCH_PORT
const SCRAPYD_URL = process.env.SCRAPYD_URL || config.SCRAPYD_URL
const SCRAPYD_PORT = process.env.SCRAPYD_PORT || config.SCRAPYD_PORT
const PORT = process.env.PORT || config.PORT

//=========setup server===============
app.use(cors())
var port = PORT
var router = express.Router({
  mergeParams : true,
})
app.use(bodyParser.urlencoded({ extended: true}))
app.use(bodyParser.json())

//============wikibot=================
const MWBot = require('mwbot')
const bot = new MWBot()
bot.login({
  apiUrl: 'https://vi.wikipedia.org/w/api.php',
  username: 'vnptwikibot',
  password: 'nhuthienthu1',
})

//===========Elastisearch==============
var elasticsearch = require('elasticsearch')
var esclient = new elasticsearch.Client({
  host: `${ELASTICHSEARCH_URL}:${ELASTICHSEARCH_PORT}`
})

//==========run spiders=================
const exec = require('child_process').exec
const cron = require('node-cron')
cron.schedule('0 43 * * * *', () => {
  console.log('Schedule spiders to crawl at ' + moment().format())
  exec(`curl http://${SCRAPYD_URL}:${SCRAPYD_PORT}/schedule.json -d project=scrape_vne -d spider=dantri` 
      + `&& curl http://${SCRAPYD_URL}:${SCRAPYD_PORT}/schedule.json -d project=scrape_vne -d spider=vne`
      + `&& curl http://${SCRAPYD_URL}:${SCRAPYD_PORT}/schedule.json -d project=scrape_vne -d spider=xahoithongtin`
      + `&& curl http://${SCRAPYD_URL}:${SCRAPYD_PORT}/schedule.json -d project=scrape_vne -d spider=vnmedia`)
})

//========authentication=================
const TOKEN_TTL = 1000*3600*4
var crypto = require('crypto')

function randomString(length, chars) {
  if (!chars) {
    throw new Error('Argument \'chars\' is undefined')
  }

  var charsLength = chars.length
  if (charsLength > 256) {
    throw new Error('Argument \'chars\' should not have more than 256 characters'
      + ', otherwise unpredictability will be broken')
  }

  var randomBytes = crypto.randomBytes(length)
  var result = new Array(length)

  var cursor = 0
  for (var i = 0; i < length; i++) {
    cursor += randomBytes[i]
    result[i] = chars[cursor % charsLength]
  }

  return result.join('')
}

/** Sync */
function randomAsciiString(length) {
  return randomString(length,
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
}

const authentication = require('express-authentication')
const bcrypt = require('bcrypt-nodejs')

app.get('/login', function(req, res) {
  const username = req.query.username
  const password = req.query.password
  User.findOne({ where : { username: username } })
  .then(function(user) {
    if (user && user.dataValues && bcrypt.compareSync(password, user.dataValues.password)) {
      Token.create({
        accessToken: randomAsciiString(40),
        accessTokenExpiresOn: (new Date().getTime() + TOKEN_TTL),
        user: {
          username: username,
        }
      }, {
        include   : [User]
      }).then(function(token){
        user.addAccessTokens(token)
        res.set('Access-Control-Allow-Origin', '*')
        res.set('Content-Type', 'application/json charset=utf-8')
        res.end(JSON.stringify(token))
      })
    } else {
      res.status(401).end('Invalid user name or password')
    }
  })
})

app.use(function auth(req, res, next) {
  const authentication = req.get('Authorization')
  if (!authentication) {
    req.authenticated = false
    res.status(401).end('Invalid api key')
    return
  }
  //Seespace lifetime token key
  if (authentication === 'S33spac3') {
    req.authenticated = true
    next()
    return
  }
  Token.findOne({ where: { accessToken: authentication } })
    .then(function(token) {
      if (token && token.dataValues.accessTokenExpiresOn > new Date().getTime()) {
        req.authenticated = true
        next()
      }
      if (!req.authenticated) {
        req.authenticated = false
        res.status(401).end('Invalid api key')
      }
    })
})

app.all('/api*', authentication.required())
//=======================================
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
      .get('http://scrapyd:6800/listjobs.json?project=scrape_vne')
      .end((err, result) => {
        if (result) {
          res.end(JSON.stringify(result.body))
        } else {
          res.end(JSON.stringify({}))
        }
      }) 
  })

router.route('/users')
  .get(function(req, res) {
    User.findAll()
      .then(function(users) {
        res.set('Content-Type', 'application/json charset=utf-8')
        res.end(JSON.stringify(users))
      })
  })

router.route('/users')
  .post(function(req, res) {
    User.create({
      username: res.body.username,
      password: bcrypt.hashSync(res.body.password),
    })
    .then(function() {
      res.sendStatus(201)
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