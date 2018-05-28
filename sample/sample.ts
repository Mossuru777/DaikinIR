import { sprintf } from "sprintf-js";
import { DaikinIR } from "../src";
import * as fs from "fs";

const outputPath = "sample/dist/lirc_output_sample.conf";

const command = new DaikinIR(
    DaikinIR.Enums.Power.On, DaikinIR.Enums.Mode.Auto, 20,
    DaikinIR.Enums.FanSpeed.Auto, DaikinIR.Enums.Swing.On, false,
    DaikinIR.Enums.TimerMode.None, 0
);

console.log("[Configuration]");
console.log(getCommandConf(command));

console.log("");

console.log("[Frames]");
console.log(getCommandBits(command));

console.log("");
console.log("[LIRC Configuration File Output]");
console.log("Path: " + outputPath);
fs.writeFileSync(outputPath, command.getLIRCConfig());

function getCommandConf(command: DaikinIR): string {
    let conf = "";

    conf += "Power: " + (command.power === DaikinIR.Enums.Power.On ? "On" : "Off") + "\n";

    conf += "Mode: ";
    switch (command.mode) {
    case DaikinIR.Enums.Mode.Auto:
        conf += "Auto";
        break;
    case DaikinIR.Enums.Mode.Dry:
        conf += "Dry";
        break;
    case DaikinIR.Enums.Mode.Cold:
        conf += "Cold";
        break;
    case DaikinIR.Enums.Mode.Warm:
        conf += "Warm";
        break;
    case DaikinIR.Enums.Mode.Fan:
        conf += "Fan";
    }
    conf += "\n";

    conf += "Temperature: " + command.temperature + "\n";

    conf += "FanSpeed: ";
    switch (command.fan_speed) {
    case DaikinIR.Enums.FanSpeed.Level1:
        conf += "1/5";
        break;
    case DaikinIR.Enums.FanSpeed.Level2:
        conf += "2/5";
        break;
    case DaikinIR.Enums.FanSpeed.Level3:
        conf += "3/5";
        break;
    case DaikinIR.Enums.FanSpeed.Level4:
        conf += "4/5";
        break;
    case DaikinIR.Enums.FanSpeed.Level5:
        conf += "5/5";
        break;
    case DaikinIR.Enums.FanSpeed.Auto:
        conf += "Auto";
        break;
    case DaikinIR.Enums.FanSpeed.Silent:
        conf += "Silent";
        break;
    }
    conf += "\n";

    conf += "Swing: " + (command.swing === DaikinIR.Enums.Swing.On ? "On" : "Off") + "\n";

    conf += "Powerful: " + (command.powerful ? "On" : "Off") + "\n";

    conf += "Timer: ";
    switch (command.timer_mode) {
    case DaikinIR.Enums.TimerMode.None:
        conf += "None";
        break;
    case DaikinIR.Enums.TimerMode.On:
        conf += "OnTimer - " + command.on_timer + "hour later";
        break;
    case DaikinIR.Enums.TimerMode.Off:
        conf += "OffTimer - " + command.off_timer + "hour later";
        break;
    }

    return conf;
}

function getCommandBits(command: DaikinIR): string {
    let command_bits = "";
    const frames = command.getFrames();
    for (let i = 0; i < frames.length; i += 1) {
        command_bits += "Frame " + (i + 1).toString() + ": ";
        for (let j = 0; j < frames[i].length; j += 1) {
            const bits = sprintf("%08b", frames[i][j]);
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
