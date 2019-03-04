const config = require("./config.js");
const log = require("log4js").getLogger("main");

const MessageApi = require("./modules/message-api.js");
const newsApi = require("./modules/news-api.js");
const weatherApi = require("./modules/weather-api.js");
const InstaApi = require("./modules/insta-api.js");

const CronJob = require("cron").CronJob;
const TelegramBotApi = require("node-telegram-bot-api");
const telegramBot = new TelegramBotApi(config.telegram.token, config.telegram.params);

const messageApi = new MessageApi(telegramBot);
const instaApi = new InstaApi(config.instagram);


log.info("Topic Weather started at " + config.cron.weather);
new CronJob({
    cronTime: config.cron.weather,
    onTick: async () => {
        try {
            let text = await weatherApi(new Date());
            config.to.forEach(async to =>
                await messageApi.sendMessage(
                    {
                        to: to,
                        type: "link",
                        version: "2",
                        text
                    }
                )
            )
        } catch (err) {
            log.error(err);
        }
    },
    start: true
});

log.info("Topic Insta started at " + config.instagram.cronTime);
new CronJob({
    cronTime: config.instagram.cronTime,
    onTick: async () => {
        try {
            let messages = await instaApi.notifyAboutMemes();
            for (let i = 0; i < messages.length; i++) {
                await messageApi.sendMessage(messages[i], getLikeButton(getRandomInt(0, 15)));
            }
        } catch (err) {
            log.error(err);
        }
    },
    start: true
});

config.topics.forEach(topic => {
    log.info("Topic " + topic.name + " started at " + topic.cronTime);
    new CronJob(
        {
            cronTime: topic.cronTime,
            onTick: async () => {
                try {
                    let messages = await newsApi(topic.url, new Date());
                    messages.forEach(async message =>
                        await messageApi.sendMessage({
                            to: {
                                id: topic.channel,
                                username: topic.channel
                            },
                            version: "2",
                            type: "link",
                            text: message.title,
                            url: message.link
                        })
                    )
                } catch (err) {
                    log.error(err);
                }
            },
            start: true
        }
    );
});

telegramBot.on("callback_query", async message => {
    try {
        await telegramBot.editMessageReplyMarkup(getLikeButton(parseInt(message.data)), {
            message_id: message.message.message_id,
            chat_id: message.message.chat.id
        });
    } catch (err) {
        log.error(err);
    }
});

messageApi.sendMessage({
    to: config.to[0],
    text: "Started at " + new Date(),
    type: "text"
}).catch(log.error);

log.info("Service has started");
log.info("Please press [CTRL + C] to stop");

process.on("SIGINT", () => {
    log.info("Service has stopped");
    process.exit(0);
});

process.on("SIGTERM", () => {
    log.info("Service has stopped");
    process.exit(0);
});

function getLikeButton(cnt) {
    return JSON.stringify({inline_keyboard: [[{text: "👍" + cnt, callback_data: "" + (cnt + 1)}]]});
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}