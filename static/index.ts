/// <reference path="./libs.d.ts" />

type Source = {
    name: string; // the unique name
    description: string; // the description part
    willSum: boolean; // if true, will sum the value up, or use `compute` to get the value displayed
    compute?: (array: number[]) => number;
    order: number; // the order displayed
    unit?: string; // the unit of the sumed value or computed value
}
type Colors = { [name: string]: string };
type NodeInfo = {
    time: number;
    nodes: {
        host: string;
        port: number;
        counts: number[];
    }[];
}
type VueChart = {
    title: string,
    id: string,
    order: number,
    unit: string,
    sum: number,
}

const socket = io("/");
const sources: Source[] = [
    { name: "http-requests", description: "HTTP请求数", order: 1.2, willSum: true },
    { name: "http-responses-time", description: "HTTP响应耗时", order: 1.3, willSum: true, unit: "ms" },
    { name: "http-average-responses-time", description: "HTTP响应平均耗时", order: 1.1, willSum: false, unit: "ms", compute: (array: number[]) => array[0] === 0 ? 0 : Math.round(array[1] / array[0]) },
];

Chart.defaults.global.responsive = false;
Chart.defaults.global.animation!.duration = 0;
Chart.defaults.global.elements!.line!.borderWidth = 0;
Chart.defaults.global.elements!.point!.radius = 0;

type VueData = {
    charts?: VueChart[],
    currentAreaIndexMouseOver?: number,
}

const vue: vuejs.Vue & VueData = new Vue({
    el: "#container",
    data: {
        charts: [] as VueChart[],
        currentAreaIndexMouseOver: -1,
    },
    computed: {
        /* tslint:disable:only-arrow-functions */
        orderedCharts: function orderedCharts(this: VueData) {
            return this.charts!.slice(0).sort((a, b) => a.order - b.order);
        },
        /* tslint:enable:only-arrow-functions */
    },
});
const chartDatas: LinearChartData[] = [];

for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    vue.charts!.push({
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
const colorsEachNode: Colors = {};
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
    let result = 0;
    for (const dataset of chartDatas[i].datasets!) {
        for (const data of dataset.data!) {
            result += (data as number);
        }
    }
    return result;
}

const maxCount = 300;
function trimHistory<T>(array: T[]) {
    array.splice(0, array.length - maxCount);
}

function appendChartData(nodeInfo: NodeInfo) {
    const time = moment(nodeInfo.time).format("HH:mm:ss");
    const isOverCount = chartDatas[0].labels!.length >= maxCount;

    for (let i = 0; i < sources.length; i++) {
        const willTrimHistory = isOverCount && vue.currentAreaIndexMouseOver !== i;
        chartDatas[i].labels!.push(time);
        if (willTrimHistory) {
            trimHistory(chartDatas[i].labels!);
        }

        for (const node of nodeInfo.nodes) {
            const nodeName = `${node.host}:${node.port}`;
            const count = sources[i].compute ? sources[i].compute!(node.counts) : node.counts[i];

            const dataset = find(chartDatas[i].datasets!, d => d.label === nodeName);
            if (dataset) {
                (dataset.data as number[]).push(count);
                if (willTrimHistory) {
                    trimHistory(dataset.data as number[]);
                }
            } else {
                let color = getColor(nodeName);

                const length = chartDatas[i].labels!.length - 1;
                const data: number[] = [];
                for (let j = 0; j < length; j++) {
                    data.push(0);
                }
                data.push(count);
                chartDatas[i].datasets!.push({
                    label: nodeName,
                    data,
                    borderColor: color,
                    backgroundColor: color,
                });
            }
        }

        for (const dataset of chartDatas[i].datasets!) {
            const node = find(nodeInfo.nodes, n => `${n.host}:${n.port}` === dataset.label);
            if (!node) {
                (dataset.data as number[]).push(0);
                trimHistory(dataset.data as number[]);
            }
        }

        vue.charts![i].sum = sum(i);
    }
}

const currentCharts: any[] = [];
const currentElements: HTMLCanvasElement[] = [];

socket.on("history_data", (data: string[]) => {
    for (const point of data) {
        appendChartData(JSON.parse(point));
    }

    for (let i = 0; i < sources.length; i++) {
        const element = document.getElementById("current-" + sources[i].name) as HTMLCanvasElement;
        const ctx = element.getContext("2d");
        currentCharts.push(new Chart(ctx!, {
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

socket.on("data", (point: string) => {
    appendChartData(JSON.parse(point));

    for (let i = 0; i < sources.length; i++) {
        const isInViewport = isElementInViewport(currentElements[i]);
        if (isInViewport && vue.currentAreaIndexMouseOver !== i) {
            currentCharts[i].update();
        }
    }
});
