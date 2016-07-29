/// <reference path="../node_modules/@types/moment/index.d.ts"/>
/// <reference path="../node_modules/@types/socket.io-client/index.d.ts"/>
/// <reference path="../node_modules/@types/vue/index.d.ts"/>
type Source = {
    name: string;
    description: string;
    willSum: boolean;
    compute?: (array: number[]) => number; order: number; unit?: string;
}
type ChartData = {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor?: any;
        backgroundColor?: any;
    }[];
}
type Find = <T>(array: T[], condition: (element: T) => boolean) => T;
type Colors = { [name: string]: string };
type TrimHistory = <T>(array: T[]) => void;
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
type VueModel = vuejs.Vue & {
    charts: VueChart[],
    currentAreaIndexMouseOver: number,
}
