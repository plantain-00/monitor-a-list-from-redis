/// <reference path="../node_modules/@types/moment/index.d.ts"/>

declare const io: any;
declare const Vue: any;
declare const Chart: any;

const socket = io("/");

const sources: { name: string; description: string; willSum: boolean; compute?: (array: number[]) => number; order: number; unit?: string; }[] = [
    { name: "http-requests", description: "HTTP请求数", order: 1.2, willSum: true },
    { name: "http-responses-time", description: "HTTP响应耗时", order: 1.3, willSum: true, unit: "ms" },
    { name: "ws-messages-received", description: "WS消息接收数", order: 2.2, willSum: true },
    { name: "ws-messages-sent", description: "WS消息发出数", order: 2.3, willSum: true },
    { name: "ws-connections", description: "WS连接数", order: 2.1, willSum: false },
    { name: "redis-commands-sent", description: "Redis发出命令数", order: 3.1, willSum: true },
    { name: "redis-messages-received", description: "Redis订阅消息数", order: 3.2, willSum: true },
    { name: "api-requests-sent", description: "API发出请求数", order: 4.2, willSum: true },
    { name: "api-requests-time", description: "API请求耗时", order: 4.3, unit: "ms", willSum: true },
    { name: "errors", description: "error数", order: 6.1, willSum: true },
    { name: "cache-hit", description: "cache命中数", order: 5.3, willSum: true },
    { name: "cache-miss", description: "cache未命中数", order: 5.2, willSum: true },
    { name: "restart-affect", description: "重启影响的请求数", order: 7.1, willSum: true },
    { name: "high-frequency-http-requests", description: "HTTP高频请求数", order: 1.4, willSum: true },
    { name: "short-messages", description: "短信数", order: 8.1, willSum: true },
    { name: "http-average-responses-time", description: "HTTP响应平均耗时", order: 1.1, willSum: false, unit: "ms", compute: (array: number[]) => array[0] === 0 ? 0 : Math.round(array[1] / array[0]) },
    { name: "api-average-requests-time", description: "API请求平均耗时", order: 4.1, willSum: false, unit: "ms", compute: (array: number[]) => array[7] === 0 ? 0 : Math.round(array[8] / array[7]) },
    { name: "cache-hit-rate", description: "cache命中率", order: 5.1, willSum: false, unit: "%", compute: (array: number[]) => array[10] === 0 ? 0 : Math.round(100.0 * array[10] / (array[10] + array[11])) },
];

Chart.defaults.global.responsive = false;
Chart.defaults.global.animation.duration = 0;
Chart.defaults.global.elements.line.borderWidth = 0;
Chart.defaults.global.elements.point.radius = 0;

const vue = new Vue({
    el: "#container",
    data: {
        charts: [],
        currentAreaIndexMouseOver: -1,
    },
});

const chartDatas: {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor?: any;
        backgroundColor?: any;
    }[];
}[] = [];

for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    vue.charts.push({
        title: `${source.order}. ${source.description}`,
        id: source.name,
        order: source.order,
        unit: source.unit ? `(${source.unit})` : "",
        sum: -1,
    });
    chartDatas.push({
        labels: [],
        datasets: [],
    });
}

function find<T>(array: T[], condition: (element: T) => boolean): T | undefined {
    for (const element of array) {
        if (condition(element)) {
            return element;
        }
    }
    return undefined;
}

const colors = ["#4BC0C0", "#FFA6B8", "#36A2EB", "#FFCE56", "#979D91", "#A71D1D", "#714096", "#8CCB2A", "#ED8618", "#6B720C"];
const colorsEachNode: { [name: string]: string } = {};
function getColor(nodeName: string) {
    let color = colorsEachNode[nodeName];
    if (color) {
        return color;
    }
    const index = Object.keys(colorsEachNode).length % colors.length;
    colorsEachNode[nodeName] = colors[index];
    return colors[index];
}

function sum(i: number) {
    if (!sources[i].willSum) {
        return -1;
    }
    const chartData = chartDatas[i];
    let result = 0;
    for (const dataset of chartData.datasets) {
        for (const data of dataset.data) {
            result += data;
        }
    }
    return result;
}

const maxCount = 300;
function trimHistory<T>(array: T[]) {
    array.splice(0, array.length - maxCount);
}

function appendChartData(nodeInfo: {
    time: number;
    nodes: {
        host: string;
        port: number;
        counts: number[];
    }[];
}) {
    const time = moment(nodeInfo.time).format("HH:mm:ss");
    const isOverCount = chartDatas[0].labels.length >= maxCount;

    for (let i = 0; i < sources.length; i++) {
        const willTrimHistory = isOverCount && vue.currentAreaIndexMouseOver !== i;
        chartDatas[i].labels.push(time);
        if (willTrimHistory) {
            trimHistory(chartDatas[i].labels);
        }

        for (const node of nodeInfo.nodes) {
            const nodeName = `${node.host}:${node.port}`;
            const count = sources[i].compute ? sources[i].compute!(node.counts) : node.counts[i];

            const dataset = find(chartDatas[i].datasets, d => d.label === nodeName);
            if (dataset) {
                dataset.data.push(count);
                if (willTrimHistory) {
                    trimHistory(dataset.data);
                }
            } else {
                let color = getColor(nodeName);

                const length = chartDatas[i].labels.length - 1;
                let data: number[] = [];
                for (let j = 0; j < length; j++) {
                    data.push(0);
                }
                data.push(count);
                chartDatas[i].datasets.push({
                    label: nodeName,
                    data,
                    borderColor: color,
                    backgroundColor: color,
                });
            }
        }

        for (const dataset of chartDatas[i].datasets) {
            const node = find(nodeInfo.nodes, n => `${n.host}:${n.port}` === dataset.label);
            if (!node) {
                dataset.data.push(0);
                trimHistory(dataset.data);
            }
        }

        vue.charts[i].sum = sum(i);
    }
}

const currentCharts: any[] = [];
const currentElements: HTMLCanvasElement[] = [];

socket.on("history_data", function (data: string[]) {
    for (const point of data) {
        appendChartData(JSON.parse(point));
    }

    for (let i = 0; i < sources.length; i++) {
        const element = document.getElementById("current-" + sources[i].name) as HTMLCanvasElement;
        const ctx = element.getContext("2d");
        currentCharts.push(new Chart(ctx, {
            type: "line",
            data: chartDatas[i],
            options: {
                scales: {
                    xAxes: [{
                        type: "time",
                        time: {
                            format: "HH:mm:ss",
                            tooltipFormat: "HH:mm:ss",
                        },
                        scaleLabel: {
                            display: true,
                            labelString: "Date",
                        },
                    }],
                    yAxes: [{
                        stacked: true,
                        scaleLabel: {
                            display: true,
                        },
                    }],
                },
            },
        }));
        currentElements.push(element);
        element.onmouseover = () => {
            vue.currentAreaIndexMouseOver = i;
        };
        element.onmouseout = () => {
            vue.currentAreaIndexMouseOver = -1;
        };
    }
});

function isElementInViewport(element: HTMLElement) {
    const rect = element.getBoundingClientRect();

    return rect.bottom > 0
        && rect.right > 0
        && rect.left < (window.innerWidth || document.documentElement.clientWidth)
        && rect.top < (window.innerHeight || document.documentElement.clientHeight);
}

socket.on("data", function (point: string) {
    appendChartData(JSON.parse(point));

    for (let i = 0; i < sources.length; i++) {
        const isInViewport = isElementInViewport(currentElements[i]);
        if (isInViewport && vue.currentAreaIndexMouseOver !== i) {
            currentCharts[i].update();
        }
    }
});
