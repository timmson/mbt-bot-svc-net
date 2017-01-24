const config = require('./config.js');
const main = require('./main.js');

log.info("Service started");

main.getHosts((err, message) => {
    err ? log.error(err.stack) : postState(message);
});


function getNetworkState(topic) {
    log.info("Update network state");
    main.getHosts((err, message) => {
        err ? log.error(err.stack) : postState(message);
    });

}

function postState(message) {
    log.info(config.to + " <- " + message);
    const connection = AMQP.createConnection(config.mq.connection);

    connection.on('error', err => log.error("Error from amqp: " + err.stack));

    connection.on('ready', () => {
        connection.exchange(config.mq.exchange, {type: 'fanout', durable: true, autoDelete: false}, exchange =>
            exchange.publish('', message, {}, (isSend, err) => err ? log.error(err.stack) : 0)
        );
    });
}