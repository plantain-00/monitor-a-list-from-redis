/// <reference path="typings/tsd.d.ts" />
import * as express from "express";
import * as Redis from "ioredis";
import * as socketio from "socket.io";
const minimist: ((args: string[]) => any) = require("minimist");

const app = express();

app.use(express.static("static"));

const redisHost = process.env.REDIS_HOST || "localhost";
console.log(`redis host: ${redisHost}`);
const client = new Redis(6379, redisHost, {});

const argv = minimist(process.argv.slice(2));
const port: number = argv.p || 9998;
const host: string = argv.h || "localhost";

const httpServer = app.listen(port, host, () => {
    console.log(`monitor server is listening: ${port}`);
});
const server = socketio(httpServer);

const key = "counts";

setInterval(async () => {
    const count = await client.lindex(key, 0);
    console.log(count);
    server.emit("data", count);
}, 1000);

server.on("connection", async (socket) => {
    const count: string[] = await client.lrange(key, 0, 60);
    socket.emit("history_data", count.reverse());
});
