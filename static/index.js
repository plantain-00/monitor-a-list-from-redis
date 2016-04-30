var socket = io("http://localhost:9998");

var currentContext = document.getElementById("currentChart").getContext("2d");
var currentChart;
var historyContext = document.getElementById("historyChart").getContext("2d");
var historyChart;

Chart.defaults.global.responsive = false;

var sources = [
    { label: "http request" },
    { label: "ws message received" },
    { label: "ws message sent" },
    { label: "ws connection" },
    { label: "redis command sent" },
    { label: "redis message received" },
    { label: "api request sent" }
];

function format(digit) {
    if (digit < 10) {
        return "0" + digit;
    }
    return digit;
}

function getTime(seconds) {
    var time;
    if (seconds) {
        time = new Date(Date.now() - 1000 * seconds);
    } else {
        time = new Date();
    }
    return format(time.getHours()) + ":" + format(time.getMinutes()) + ":" + format(time.getSeconds());
}

socket.on("history_data", function (data) {
    var currentDatasets = [];
    var historyDatasets = [];

    var currentLabels = [];
    var historyLabels = [];

    for (var i = 0; i < sources.length; i++) {
        currentDatasets.push({
            label: sources[i].label,
            data: []
        });
        historyDatasets.push({
            label: sources[i].label,
            data: []
        });
    }

    for (var i = 0; i < data.length; i++) {
        var counts = JSON.parse(data[i]);

        for (var j = 0; j < sources.length; j++) {
            currentDatasets[j].data.push(counts[j]);
            historyDatasets[j].data.push(counts[j]);
        }

        var time = getTime(60 - i);
        currentLabels.push(time);
        historyLabels.push(time);
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

socket.on("data", function (data) {
    var time = getTime();

    currentChart.data.labels.push(time);
    if (currentChart.data.labels.length > 60) {
        currentChart.data.labels.shift();
    }

    historyChart.data.labels.push(time);

    var counts = JSON.parse(data);
    for (var i = 0; i < sources.length; i++) {
        currentChart.data.datasets[i].data.push(counts[i]);
        if (currentChart.data.datasets[i].data.length > 60) {
            currentChart.data.datasets[i].data.shift();
        }

        historyChart.data.datasets[i].data.push(counts[i]);
    }

    currentChart.update();

    if (historyUpdateSeconds <= 0) {
        historyChart.update();
        historyUpdateSeconds = 10;
    }
    historyUpdateSeconds--;
});
