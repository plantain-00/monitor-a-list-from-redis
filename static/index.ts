declare const io;
declare const Morris;
declare const $;
declare const moment;

const socket = io("/");

const sources = [
    { name: "http requests", description: "http requests count" },
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
}

const historyOptions: Option[] = [];
const currentOptions: Option[] = [];
const historyAreas: any[] = [];
const currentAreas: any[] = [];
for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    historyOptions.push({
        element: "history " + source.name,
        data: [],
        xkey: "time",
        ykeys: [],
        labels: [],
        smooth: false,
        dateFormat: x => {
            return moment(x).format("YYYY-MM-DD HH:mm:ss");
        },
    });
    currentOptions.push({
        element: "current " + source.name,
        data: [],
        xkey: "time",
        ykeys: [],
        labels: [],
        smooth: false,
        dateFormat: x => {
            return moment(x).format("YYYY-MM-DD HH:mm:ss");
        },
    });
    $("#container").append(`<div><h4>${i + 1} ${source.description}</h4><div id="current ${source.name}" class="graph"></div><div id="history ${source.name}" class="graph"></div></div>`);
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

    for (const option of historyOptions) {
        historyAreas.push(Morris.Area(option));
    }
    for (const option of currentOptions) {
        currentAreas.push(Morris.Area(option));
    }
});

let historyUpdateSeconds = 0;

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
        currentAreas[i].setData(currentOptions[i].data);
    }

    if (historyUpdateSeconds <= 0) {
        for (let i = 0; i < sources.length; i++) {
            historyAreas[i].setData(historyOptions[i].data);
        }
        historyUpdateSeconds = 30;
    }
    historyUpdateSeconds--;
});
