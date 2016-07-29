const express = require("express");
const Redis = require("ioredis");
const socketio = require("socket.io");
const minimist = require("minimist");

const app = express();

app.use(express.static("static"));

/**
 * @type {string}
 */
const redisHost = process.env.REDIS_HOST || "localhost";
console.log(`redis host: ${redisHost}`);
const client = new Redis(6379, redisHost, {});

const argv = minimist(process.argv.slice(2));
/**
 * @type {number}
 */
const port = argv["p"] || 9998;
/**
 * @type {string}
 */
const host = argv["h"] || "localhost";

const httpServer = app.listen(port, host, () => {
    console.log(`monitor server is listening: ${port}`);
});
const server = socketio(httpServer);

const key = "counts";

setInterval(() => {
    client.lindex(key, 0).then(count => {
        console.log(count);
        server.emit("data", count);
    });
}, 1000);

server.on("connection", socket => {
    client.lrange(key, 0, 300).then((
        /**
         * @type {string[]}
         */ count) => {
        socket.emit("history_data", count.reverse());
    });
});
>>>>>>> master
