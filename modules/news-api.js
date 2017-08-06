const async = require('async');
const feedReader = require('feed-read');
const request = require('request-promise');
const xml2js = require('xml2js').parseString;
const md5 = require('md5');
const Mongo = require('mongodb');

let news = {
    'demo': getDemoNews,
    'holidays': getTodayHolidays,
    'cars-auto': getAutoNews,
    'cars-motor': getMotorNews
};

function NewsApi() {

}

NewsApi.prototype.sendMessages = function (topic) {
    return new Promise((resolve, reject) => {
        this.connect().then(
            db => {
                this.getFeeds().then(
                    feeds =>
                        async.each(feeds.slice(0, topic.limit).reverse(), (feed, callback) => {
                            this.getMessage(db, feed, topic).then(message => callback(null, message)).catch(callback(err, null));
                        }, (err, result) => {
                            resolve(result);
                        })
                ).catch(reject);
                db.close();
            }).catch(reject);
    });
};

NewsApi.prototype.getMessage = function (db, feed, topic) {
    return new Promise((resolve, reject) => {
        const urlHash = md5(feed.link);
        this.findNewsInCache(db, {id: urlHash}).then(
            newsCache => {
                if (!newsCache.id) {
                    this.addNewsToCache(db, {id: urlHash, published: new Date().toString()}).catch(reject);
                    resolve({
                        to: {
                            id: topic.channel,
                            username: topic.channel
                        },
                        version: 2,
                        type: feed.image_url ? 'image_link' : 'link',
                        text: feed.title,
                        image: feed.image_url,
                        url: feed.link
                    });
                } else {
                    resolve(null);
                }
            }
        ).catch(reject);
    });
};


NewsApi.prototype.getFeeds = function (topic) {
    if (news.hasOwnProperty(topic.name)) {
        return news[topic.name](topic.url)
    } else {
        return new Promise((resolve, reject) => feedReader(topic.url, (err, feeds) => err ? reject(err) : resolve(feeds)));
    }
};

NewsApi.prototype.addNewsToCache = function (db, newsCache) {
    return new Promise((resolve, reject) => db.collection('news-cache').insertOne(newsCache, (err, res) => err ? reject(err) : resolve(res)));
};

NewsApi.prototype.findNewsInCache = function (db, criteria) {
    return new Promise((resolve, reject) => db.collection('news-cache').findOne(criteria, (err, res) => err ? reject(err) : resolve(!res ? {} : res)));
};

NewsApi.prototype.connect = function () {
    return new Promise((resolve, reject) => Mongo.connect(this.mongoUrl, (err, db) => err ? reject(err) : resolve(db)));
};

module.exports = NewsApi;

function getDemoNews(url) {
    return new Promise((resolve, reject) => feedReader(url, (err, feeds) => {
            if (err) {
                reject(err);
            }
            resolve(feeds.filter(feed => feed.content.match(/https:\/\/demotivators.to\/media.+\.thumbnail\.jpg/i)).map(feed => {
                feed.image_url = feed.content.match(/https:\/\/demotivators.to\/media.+\.thumbnail\.jpg/i)[0].replace('.thumbnail', '');
                feed.published = new Date().toString();
                return feed;
            }));
        })
    );
}

function getTodayHolidays(url) {
    return new Promise((resolve, reject) => {
        let today = new Date();
        request(url).then(
            body => xml2js(body, (err, result) => {
                err ? reject(err) : resolve([
                    {
                        title: result.rss.channel[0].item.map(event => {
                            return {
                                day: event['title'][0].split('-')[0].trim(),
                                title: event['title'][0].split('-')[1].trim(),
                                description: event['description'][0].replace(/(\r\n|\n|\r)/gm, "")
                            }
                        }).filter(item => isToday(item, today)).reduce((previousValue, currentValue, i) => {
                            return previousValue + '\n\n' + (i === 0 ? 'Поводы 🍻 именно сегодня, <i>' +
                                currentValue['day'] + '</i>\n\n' : '' ) + '<b>' + currentValue['title'] + '</b> - ' +
                                currentValue['description'];
                        }, ''),
                        published: today.toString(),
                        link: getEventURL('http://www.calend.ru/day/', today)
                    }
                ]);
            })
        ).catch(reject);
    });
}

function getAutoNews(url) {
    return new Promise((resolve, reject) => {
        request(url).then(
            body => xml2js(body, (err, result) => {
                err ? reject(err) : resolve(result.rss.channel[0].item.map(entry => ({
                    title: entry['title'][0],
                    link: entry['link'][0],
                    published: entry['pubDate'][0],
                    image_url: entry['enclosure'] ? entry['enclosure'][0]['$']['url'] : null
                })));
            })
        ).catch(reject);
    });
}

function getMotorNews(url) {
    return new Promise((resolve, reject) => {
        request(url).then(
            body => xml2js(body, (err, result) => {
                err ? reject(err) : resolve(result.feed.entry.filter(e => e['media:content']).map(entry => ({
                    title: entry['title'][0],
                    link: entry['link'][0]['$']['href'],
                    published: entry['updated'][0],
                    image_url: entry['media:content'][0]['$']['url']
                })));
            })
        ).catch(reject);
    });
}

function getEventURL(prefix, date) {
    return encodeURI(prefix + (date.getMonth() + 1) + '-' + date.getDate() + '-' + date.getFullYear() + '/');
}

function isToday(item, date) {
    return item['day'].indexOf(date.getDate()) === 0;
}