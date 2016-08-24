const scrapeIt = require('scrape-it')
const URL = require('url')

var scrape_vne = function(url) {
	return scrapeIt(url, {
		title : 'h1',
		desc  : 'h3',
		image : {
			selector: '#left_calculator img',
			attr: 'src'
		},
	})
}

var search = function(term) {
	url = URL.format({
		host:'timkiem.vnexpress.net',
		protocol:'http:',
		query: {
			q:term,
			media_type:'text',
			fromdate:0,
			todate:0,
			cate_code:'',
			search_f: 'title,tag_list',
			date_format: 'week',
		}
	}) 

	return scrapeIt(url, {
		articles : {
			listItem: '.title_news a',
			data: {
				link : {
					attr:'href',
				},
				title : {
					attr: 'title',
				}
			}
		}
	}).then(ret => {
		return Promise.resolve(ret.articles.filter(function(article) {
			return article.link.indexOf('camera-ban-doc') === -1;
		}))
	})
}

module.exports.scrape_vne = scrape_vne;
module.exports.search_vne = search;