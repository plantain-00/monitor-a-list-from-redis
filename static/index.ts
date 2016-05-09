declare const io;
declare const Morris;
declare const $;
declare const moment;
declare const Vue;

const socket = io("/");

const sources = [
    { name: "http-requests", description: "HTTP请求数" },
    { name: "http-responses-time", description: "HTTP响应耗时（毫秒）" },
    { name: "ws-messages-received", description: "接收的WebSocket消息数" },
    { name: "ws-messages-sent", description: "发出的WebSocket消息数" },
    { name: "ws-connections", description: "WebSocket连接数" },
    { name: "redis-commands-sent", description: "发出的Redis命令数" },
    { name: "redis-messages-received", description: "订阅的Redis消息数" },
    { name: "api-requests-sent", description: "发出的API请求数" },
    { name: "api-requests-time", description: "API请求耗时（毫秒）" },
    { name: "errors", description: "出现的错误数" },
    { name: "cache-hit", description: "缓存命中数" },
    { name: "cache-miss", description: "缓存未命中数" },
];

interface Node {
    time: string;
    nodes: {
        host: string;
        port: number;
        counts: number[];
    }[];
}

interface Option {
    element: string;
    data: any[];
    xkey: string;
    ykeys: string[];
    labels: string[];
    smooth?: boolean;
    dateFormat?: Function;
    pointSize?: number;
}

const vue = new Vue({
    el: "#container",
    data: {
        charts: [],
    },
});

const historyOptions: Option[] = [];
const currentOptions: Option[] = [];
const historyAreas: any[] = [];
const currentAreas: any[] = [];
const currentElements: HTMLElement[] = [];
const historyUpdateSeconds: number[] = [];
for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const historyId = "history-" + source.name;
    const currentId = "current-" + source.name;
    historyOptions.push({
        element: historyId,
        data: [],
        xkey: "time",
        ykeys: [],
        labels: [],
        smooth: false,
        dateFormat: x => {
            return moment(x).format("YYYY-MM-DD HH:mm:ss");
        },
        pointSize: 1,
    });
    currentOptions.push({
        element: currentId,
        data: [],
        xkey: "time",
        ykeys: [],
        labels: [],
        smooth: false,
        dateFormat: x => {
            return moment(x).format("YYYY-MM-DD HH:mm:ss");
        },
        pointSize: 1,
    });
    vue.charts.push({
        title: `${i + 1}. ${source.description}`,
        id: source.name,
    });

    historyUpdateSeconds.push(0);

    Vue.nextTick(() => {
        currentElements.push(document.getElementById(currentId));
    });
}

function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();

    return rect.bottom > 0 &&
        rect.right > 0 &&
        rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
        rect.top < (window.innerHeight || document.documentElement.clientHeight);
}

socket.on("history_data", function (data: string[]) {
    for (const point of data) {
        const count: Node = JSON.parse(point);

        for (let i = 0; i < sources.length; i++) {
            const historyOption = historyOptions[i];
            const currentOption = currentOptions[i];
            const historyChartData = {
                time: count.time,
            };
            const currentChartData = {
                time: count.time,
            };
            historyOption.data.push(historyChartData);
            currentOption.data.push(currentChartData);

            for (const node of count.nodes) {
                const nodeName = `${node.host}:${node.port}`;
                if (historyOption.ykeys.every(key => key !== nodeName)) {
                    historyOption.ykeys.push(nodeName);
                    historyOption.labels.push(nodeName);
                    currentOption.ykeys.push(nodeName);
                    currentOption.labels.push(nodeName);
                }
                historyChartData[nodeName] = node.counts[i];
                currentChartData[nodeName] = node.counts[i];
            }
        }
    }

    for (let i = 0; i < sources.length; i++) {
        historyAreas.push(Morris.Area(historyOptions[i]));
        currentAreas.push(Morris.Area(currentOptions[i]));
    }
});

socket.on("data", function (point: string) {
    const count: Node = JSON.parse(point);

    const time = Date.now();

    for (let i = 0; i < sources.length; i++) {
        const historyOption = historyOptions[i];
        const currentOption = currentOptions[i];
        const historyChartData = {
            time: count.time,
        };
        const currentChartData = {
            time: count.time,
        };
        historyOption.data.push(historyChartData);
        currentOption.data.push(currentChartData);

        for (const node of count.nodes) {
            const nodeName = `${node.host}:${node.port}`;
            historyChartData[nodeName] = node.counts[i];
            currentChartData[nodeName] = node.counts[i];
        }

        if (currentOption.data.length > 60) {
            currentOption.data.shift();
        }
    }

    for (let i = 0; i < sources.length; i++) {
        const isInViewport = isElementInViewport(currentElements[i]);
        if (isInViewport) {
            currentAreas[i].setData(currentOptions[i].data);
        }

        if (isInViewport && historyUpdateSeconds[i] <= 0) {
            historyAreas[i].setData(historyOptions[i].data);
            historyUpdateSeconds[i] = 30;
        }
        historyUpdateSeconds[i]--;
    }
});
