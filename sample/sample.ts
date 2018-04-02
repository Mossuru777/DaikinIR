import { sprintf } from "sprintf-js";
import { DaikinIRCommand } from "../src";
import { FanSpeed, Mode, Power, Swing, TimerMode } from "../src/conf_enums";
import * as fs from "fs";

const outputPath = "sample/dist/lirc_output_sample.conf";

const command = new DaikinIRCommand(
    Power.On, Mode.Auto, 20, FanSpeed.Auto, Swing.On, false, TimerMode.None, 0);

console.log("[Configuration]");
console.log(getCommandConf(command));

console.log("");

console.log("[Frames]");
console.log(getCommandBits(command));

console.log("");
console.log("[LIRC Configuration File Output]");
console.log("Path: " + outputPath);
fs.writeFileSync(outputPath, command.getLIRCConfig());

function getCommandConf(command: DaikinIRCommand): string {
    let conf = "";

    conf += "Power: " + (command.power === Power.On ? "On" : "Off") + "\n";

    conf += "Mode: ";
    switch (command.mode) {
    case Mode.Auto:
        conf += "Auto";
        break;
    case Mode.Dry:
        conf += "Dry";
        break;
    case Mode.Cold:
        conf += "Cold";
        break;
    case Mode.Warm:
        conf += "Warm";
        break;
    case Mode.Fan:
        conf += "Fan";
    }
    conf += "\n";

    conf += "Temperature: " + command.temperature + "\n";

    conf += "FanSpeed: ";
    switch (command.fan_speed) {
    case FanSpeed.Level1:
        conf += "1/5";
        break;
    case FanSpeed.Level2:
        conf += "2/5";
        break;
    case FanSpeed.Level3:
        conf += "3/5";
        break;
    case FanSpeed.Level4:
        conf += "4/5";
        break;
    case FanSpeed.Level5:
        conf += "5/5";
        break;
    case FanSpeed.Auto:
        conf += "Auto";
        break;
    case FanSpeed.Silent:
        conf += "Silent";
        break;
    }
    conf += "\n";

    conf += "Swing: " + (command.swing === Swing.On ? "On" : "Off") + "\n";

    conf += "Powerful: " + (command.powerful ? "On" : "Off") + "\n";

    conf += "Timer: ";
    switch (command.timer_mode) {
    case TimerMode.None:
        conf += "None";
        break;
    case TimerMode.On:
        conf += "OnTimer - " + command.on_timer + "hour later";
        break;
    case TimerMode.Off:
        conf += "OffTimer - " + command.off_timer + "hour later";
        break;
    }

    return conf;
}

function getCommandBits(command: DaikinIRCommand): string {
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


