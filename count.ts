import * as express from "express";
import * as  Redis from "ioredis";
import * as  socketio from "socket.io";
import * as  minimist from "minimist";

const app = express();

app.use(express.static("static"));

const redisHost: string = process.env.REDIS_HOST || "localhost";
console.log(`redis host: ${redisHost}`);
const client = new Redis(6379, redisHost, {});

const argv = minimist(process.argv.slice(2));
const port: number = argv["p"] || 9998;
const host: string = argv["h"] || "localhost";

const httpServer = app.listen(port, host, () => {
    console.log(`monitor server is listening: ${port}`);
});
const server = socketio(httpServer);

const key = "counts";

setInterval(() => {
    client.lindex(key, 0).then((count: any) => {
        console.log(count);
        server.emit("data", count);
    });
}, 1000);

server.on("connection", socket => {
    client.lrange(key, 0, 300).then((count: string[]) => {
        socket.emit("history_data", count.reverse());
    });
});
