declare var io;
declare var Chart;
declare var moment;

var socket = io("/");

var currentContext = (document.getElementById("currentChart") as any).getContext("2d");
var currentChart;
var historyContext = (document.getElementById("historyChart") as any).getContext("2d");
var historyChart;

Chart.defaults.global.responsive = false;
Chart.defaults.global.animation.duration = 0;

var sources = [
    { label: "http requests" },
    { label: "ws messages received" },
    { label: "ws messages sent" },
    { label: "ws connections" },
    { label: "redis commands sent" },
    { label: "redis messages received" },
    { label: "api requests sent" },
];

interface Node {
    time: string;
    nodes: {
        host: string;
        port: number;
        counts: { [key: string]: number };
    }[];
}

socket.on("history_data", function (data: string[]) {
    var currentDatasets: { label: string; data: number[]; }[] = [];
    var historyDatasets: { label: string; data: number[]; }[] = [];

    var currentLabels: string[] = [];
    var historyLabels: string[] = [];

    for (var i = 0; i < sources.length; i++) {
        currentDatasets.push({
            label: sources[i].label,
            data: [],
        });
        historyDatasets.push({
            label: sources[i].label,
            data: [],
        });
    }

    for (var i = 0; i < data.length; i++) {
        var count: Node = JSON.parse(data[i]);

        for (var j = 0; j < sources.length; j++) {
            var c = 0;
            for (var k = 0; k < count.nodes.length; k++) {
                c += count.nodes[k].counts[sources[j].label];
            }
            currentDatasets[j].data.push(c);
            historyDatasets[j].data.push(c);
        }

        currentLabels.push(count.time);
        historyLabels.push(count.time);
    }

    currentChart = new Chart(currentContext, {
        type: "line",
        data: {
            labels: currentLabels,
            datasets: currentDatasets
        },
        options: {}
    });
    historyChart = new Chart(historyContext, {
        type: "line",
        data: {
            labels: historyLabels,
            datasets: historyDatasets
        },
        options: {}
    });
});

var historyUpdateSeconds = 0;

socket.on("data", function (data: string) {
    var time = moment().format("HH:mm:ss");

    currentChart.data.labels.push(time);
    if (currentChart.data.labels.length > 60) {
        currentChart.data.labels.shift();
    }

    historyChart.data.labels.push(time);

    var count: Node = JSON.parse(data);
    for (var i = 0; i < sources.length; i++) {
        var c = 0;
        for (var k = 0; k < count.nodes.length; k++) {
            c += count.nodes[k].counts[sources[i].label];
        }
        currentChart.data.datasets[i].data.push(c);
        if (currentChart.data.datasets[i].data.length > 60) {
            currentChart.data.datasets[i].data.shift();
        }

        historyChart.data.datasets[i].data.push(c);
    }

    currentChart.update();

    if (historyUpdateSeconds <= 0) {
        historyChart.update();
        historyUpdateSeconds = 10;
    }
    historyUpdateSeconds--;
});
