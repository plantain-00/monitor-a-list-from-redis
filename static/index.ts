declare const io;
declare const moment;
declare const Vue;
declare const Chart;

const socket = io("/");

const sources: { name: string; description: string; compute?: (array: number[]) => number; order: number; unit?: string; }[] = [
    { name: "http-requests", description: "HTTP请求数", order: 1.2 },
    { name: "http-responses-time", description: "HTTP响应耗时", order: 1.3, unit: "ms" },
    { name: "ws-messages-received", description: "WS消息接收数", order: 2.2 },
    { name: "ws-messages-sent", description: "WS消息发出数", order: 2.3 },
    { name: "ws-connections", description: "WS连接数", order: 2.1 },
    { name: "redis-commands-sent", description: "Redis发出命令数", order: 3.1 },
    { name: "redis-messages-received", description: "Redis订阅消息数", order: 3.2 },
    { name: "api-requests-sent", description: "API发出请求数", order: 4.2 },
    { name: "api-requests-time", description: "API请求耗时", order: 4.3, unit: "ms" },
    { name: "errors", description: "error数", order: 6.1 },
    { name: "cache-hit", description: "cache命中数", order: 5.3 },
    { name: "cache-miss", description: "cache未命中数", order: 5.2 },
    { name: "restart-affect", description: "重启影响的请求数", order: 7.1 },
    { name: "high-frequency-http-requests", description: "HTTP高频请求数", order: 1.4 },
    { name: "http-average-responses-time", description: "HTTP响应平均耗时", order: 1.1, unit: "ms", compute: (array: number[]) => array[0] === 0 ? 0 : Math.round(array[1] / array[0]) },
    { name: "api-average-requests-time", description: "API请求平均耗时", order: 4.1, unit: "ms", compute: (array: number[]) => array[7] === 0 ? 0 : Math.round(array[8] / array[7]) },
    { name: "cache-hit-rate", description: "cache命中率", order: 5.1, unit: "%", compute: (array: number[]) => array[11] === 0 ? 0 : Math.round(100.0 * array[12] / (array[11] + array[12])) },
];

Chart.defaults.global.responsive = false;
Chart.defaults.global.animation.duration = 0;
Chart.defaults.global.elements.line.borderWidth = 0.5;
Chart.defaults.global.elements.point.radius = 0.5;

interface NodeInfo {
    time: number;
    nodes: {
        host: string;
        port: number;
        counts: number[];
    }[];
}

const vue = new Vue({
    el: "#container",
    data: {
        charts: [],
    },
});

const chartDatas: ChartData[] = [];

console.log("the data is available as `chartDatas`");

const charts = [];
for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    charts.push({
        title: `${source.order}. ${source.description}`,
        id: source.name,
        order: source.order,
        unit: source.unit ? `(${source.unit})` : "",
    });
    chartDatas.push({
        labels: [],
        datasets: [],
    });
}
vue.charts = charts.sort((a, b) => a.order - b.order);

function isElementInViewport(element: HTMLElement) {
    const rect = element.getBoundingClientRect();

    return rect.bottom > 0
        && rect.right > 0
        && rect.left < (window.innerWidth || document.documentElement.clientWidth)
        && rect.top < (window.innerHeight || document.documentElement.clientHeight);
}

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor?: any;
    }[];
}

const currentCharts: any[] = [];
const currentElements: HTMLCanvasElement[] = [];

function find<T>(array: T[], condition: (element: T) => boolean): T {
    for (const element of array) {
        if (condition(element)) {
            return element;
        }
    }
    return null;
}

const colors = ["#4BC0C0", "#FFA6B8", "#36A2EB", "#FFCE56"];
const colorsEachNode: { [name: string]: string } = {};
let colorsUsed = 0;

function appendChartData(nodeInfo: NodeInfo) {
    const time = moment(nodeInfo.time).format("HH:mm:ss");
    const isOverCount = chartDatas[0].labels.length >= 300;

    for (let i = 0; i < sources.length; i++) {
        chartDatas[i].labels.push(time);
        if (isOverCount) {
            chartDatas[i].labels.shift();
        }

        for (const node of nodeInfo.nodes) {
            const nodeName = `${node.host}:${node.port}`;
            const count = sources[i].compute ? sources[i].compute(node.counts) : node.counts[i];

            const dataset = find(chartDatas[i].datasets, d => d.label === nodeName);
            if (dataset) {
                dataset.data.push(count);
                if (isOverCount) {
                    dataset.data.shift();
                }
            } else {
                let color = colorsEachNode[nodeName];
                if (!color && colorsUsed < colors.length) {
                    colorsEachNode[nodeName] = colors[colorsUsed];
                    colorsUsed++;
                    color = colorsEachNode[nodeName];
                }

                chartDatas[i].datasets.push({
                    label: nodeName,
                    data: [count],
                    borderColor: color,
                });
            }
        }
    }
}

socket.on("history_data", function (data: string[]) {
    for (const point of data) {
        appendChartData(JSON.parse(point));
    }

    for (let i = 0; i < sources.length; i++) {
        const element = document.getElementById("current-" + sources[i].name);
        const ctx = (element as any).getContext("2d");
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
        currentElements.push(element as HTMLCanvasElement);
    }
});

socket.on("data", function (point: string) {
    appendChartData(JSON.parse(point));

    const time = Date.now();

    for (let i = 0; i < sources.length; i++) {
        const isInViewport = isElementInViewport(currentElements[i]);
        if (isInViewport) {
            currentCharts[i].update();
        }
    }
});
