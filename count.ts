/// <reference path="typings/tsd.d.ts" />

import * as express from "express";
import * as Redis from "ioredis";
import * as socketio from "socket.io";

const app = express();
app.use(express.static("static"));

const client = new Redis(6379, process.env.REDIS_HOST, {});

const port = 9998;
const httpServer = app.listen(port, "localhost", () => {
    console.log(`server is listening: ${port}`);
});
const wsServer = socketio(httpServer);

const theListName = "counts";

setInterval(async () => {
    const count = await client.lindex(theListName, 0);
    wsServer.emit("data", count);
}, 1000);

wsServer.on("connection", async (socket) => {
    const count: string[] = await client.lrange(theListName, 0, 60);
    socket.emit("history_data", count.reverse());
});
