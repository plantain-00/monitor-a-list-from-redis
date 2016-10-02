import * as express from "express";
import * as  socketio from "socket.io";
import * as  minimist from "minimist";

const app = express();

app.use(express.static("static"));

const argv = minimist(process.argv.slice(2));
const port: number = argv["p"] || 9998;
const host: string = argv["h"] || "localhost";

const httpServer = app.listen(port, host, () => {
    console.log(`monitor server is listening: ${port}`);
});
const server = socketio(httpServer);

export function randomInteger(min: number, range: number) {
    return Math.floor(Math.random() * range) + min;
}

setInterval(() => {
    const count = JSON.stringify({
        time: Date.now(),
        nodes: [
            {
                host: "#1",
                port: 9000,
                counts: [randomInteger(10, 20), randomInteger(100, 200)],
            },
            {
                host: "#1",
                port: 9001,
                counts: [randomInteger(10, 20), randomInteger(100, 200)],
            },
            {
                host: "#2",
                port: 9000,
                counts: [randomInteger(10, 20), randomInteger(100, 200)],
            },
            {
                host: "#2",
                port: 9001,
                counts: [randomInteger(10, 20), randomInteger(100, 200)],
            },
        ],
    });
    console.log(count);
    server.emit("data", count);
}, 1000);

server.on("connection", socket => {
    socket.emit("history_data", []);
});
