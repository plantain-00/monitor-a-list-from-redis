/// <reference path="typings/tsd.d.ts" />
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const express = require("express");
const Redis = require("ioredis");
const socketio = require("socket.io");
const app = express();
app.use(express.static("static"));
const client = new Redis(6379, process.env.REDIS_HOST, {});
const port = 9998;
const httpServer = app.listen(port, "localhost", () => {
    console.log(`server is listening: ${port}`);
});
const wsServer = socketio(httpServer);
const theListName = "counts";
setInterval(() => __awaiter(this, void 0, void 0, function* () {
    const count = yield client.lindex(theListName, 0);
    wsServer.emit("data", count);
}), 1000);
wsServer.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
    const count = yield client.lrange(theListName, 0, 60);
    socket.emit("history_data", count.reverse());
}));
