const config = require('./config.js');
const newsWatcher = require('./news-watcher.js');

newsWatcher.getFeed({
    name: 'holidays',
    channel: '168739439',
    holidays: 'http://www.calend.ru/img/export/calend.rss',
    cronTime: '0 * * * * *',
    period: 86400000,
    limit: 10
});
