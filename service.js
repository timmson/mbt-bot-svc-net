const config = require('./config.js');
const netWatcher = require('./net-watcher.js');
const newsWatcher = require('./news-watcher.js');

const CronJob = require('cron').CronJob;
const log = require('log4js').getLogger('service');

log.info('Service started');

new CronJob({cronTime: config.cron, onTick: netWatcher.getNetworkState, start: true});


/**
 * Temp block
 */
let topics = [
    {
        name: 'demo',
        channel: '@tmsnDemotivators',
        url: 'http://demotivators.to/feeds/recent/',
        cronTime: '0 0 13 * * *',
        period: 3600000,
        limit: 10
    },
    {
        name: 'cars-auto',
        channel: '@tmsnAutoNews',
        url: 'https://auto.mail.ru/rss/',
        cronTime: '0 0 10-20 * * *',
        period: 3600000,
        limit: 10
    },
    {
        name: 'cars-motor',
        channel: '@tmsnAutoNews',
        url: 'http://motor.ru/export/atom',
        cronTime: '0 0 10-20 * * *',
        period: 3600000,
        limit: 10
    }
    /*{name: 'gadgets', channel: '@tmsnDemotivators', url: 'http://4pda.ru/feed/'}
     {name: 'movies', channel: '@tmsnDemotivators', url: 'http://kinozal.me/rss.xml'}
     {name: 'linux', channel: '@tmsnDemotivators', url: 'http://www.linux.org.ru/section-rss.jsp?section=1'}
     {name: 'devLife', channel: '@tmsnDemotivators', url: 'http://developerslife.ru/rss.xml'}*/
];

topics.forEach(topic => {
    log.info('Topic ' + topic.name + ' started at ' + topic.cronTime);
    new CronJob(
        {
            cronTime: topic.cronTime,
            onTick: () => {
                newsWatcher.getFeed(topic);
            },
            start: true
        }
    );
});