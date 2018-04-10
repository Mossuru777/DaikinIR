"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sprintf_js_1 = require("sprintf-js");
const src_1 = require("../src");
const fs = require("fs");
const outputPath = "sample/dist/lirc_output_sample.conf";
const command = new src_1.DaikinIR(1, 0, 20, 10, 15, false, 0, 0);
console.log("[Configuration]");
console.log(getCommandConf(command));
console.log("");
console.log("[Frames]");
console.log(getCommandBits(command));
console.log("");
console.log("[LIRC Configuration File Output]");
console.log("Path: " + outputPath);
fs.writeFileSync(outputPath, command.getLIRCConfig());
function getCommandConf(command) {
    let conf = "";
    conf += "Power: " + (command.power === 1 ? "On" : "Off") + "\n";
    conf += "Mode: ";
    switch (command.mode) {
        case 0:
            conf += "Auto";
            break;
        case 2:
            conf += "Dry";
            break;
        case 3:
            conf += "Cold";
            break;
        case 4:
            conf += "Warm";
            break;
        case 6:
            conf += "Fan";
    }
    conf += "\n";
    conf += "Temperature: " + command.temperature + "\n";
    conf += "FanSpeed: ";
    switch (command.fan_speed) {
        case 3:
            conf += "1/5";
            break;
        case 4:
            conf += "2/5";
            break;
        case 5:
            conf += "3/5";
            break;
        case 6:
            conf += "4/5";
            break;
        case 7:
            conf += "5/5";
            break;
        case 10:
            conf += "Auto";
            break;
        case 11:
            conf += "Silent";
            break;
    }
    conf += "\n";
    conf += "Swing: " + (command.swing === 15 ? "On" : "Off") + "\n";
    conf += "Powerful: " + (command.powerful ? "On" : "Off") + "\n";
    conf += "Timer: ";
    switch (command.timer_mode) {
        case 0:
            conf += "None";
            break;
        case 2:
            conf += "OnTimer - " + command.on_timer + "hour later";
            break;
        case 1:
            conf += "OffTimer - " + command.off_timer + "hour later";
            break;
    }
    return conf;
}
function getCommandBits(command) {
    let command_bits = "";
    const frames = command.getFrames();
    for (let i = 0; i < frames.length; i += 1) {
        command_bits += "Frame " + (i + 1).toString() + ": ";
        for (let j = 0; j < frames[i].length; j += 1) {
            const bits = sprintf_js_1.sprintf("%08b", frames[i][j]);
            for (let k = 7; k >= 0; k -= 1) {
                command_bits += bits[k];
            }
            if (j < frames[i].length - 1) {
                command_bits += " ";
            }
        }
        command_bits += " (" + frames[i].length * 8 + " bits / " + frames[i].length.toString() + " bytes)";
        if (i < frames.length - 1) {
            command_bits += "\n";
        }
    }
    return command_bits;
}
//# sourceMappingURL=sample.js.map