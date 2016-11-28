/// <reference types="socket.io-client"/>
/// <reference types="chart.js"/>

import * as Moment from "moment";
import * as Vue from "vue";

declare global {
    var moment: typeof Moment
    var Vue: typeof Vue;
}