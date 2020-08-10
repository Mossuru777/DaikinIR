"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DaikinIR = void 0;
const sprintf_js_1 = require("sprintf-js");
class DaikinIR {
    constructor(power, mode, temperature, fan_speed, swing, powerful, timer_mode, hour) {
        this.power = power;
        this.mode = mode;
        this.temperature = temperature;
        this.fan_speed = fan_speed;
        this.swing = swing;
        this.powerful = powerful;
        this.timer_mode = timer_mode;
        this.row_issued_count = -1;
        this.off_timer = timer_mode === 1 ? hour : 0;
        this.on_timer = timer_mode === 2 ? hour : 0;
    }
    getLIRCConfig() {
        const frames = this.getFrames();
        this.row_issued_count = -1;
        const initial_commands = this.buildLIRCCommandFromIssueCommands([
            DaikinIR.LIRC_INITIAL_FRAME
        ]);
        const frames_commands = this.buildLIRCCommandsFromFrames(frames);
        return `begin remote
${DaikinIR.LIRC_INDENT_SPACE}name  AirCon
${DaikinIR.LIRC_INDENT_SPACE}flags RAW_CODES
${DaikinIR.LIRC_INDENT_SPACE}eps 30
${DaikinIR.LIRC_INDENT_SPACE}aeps 100
${DaikinIR.LIRC_INDENT_SPACE}gap 1
${DaikinIR.LIRC_INDENT_SPACE}begin raw_codes
${DaikinIR.LIRC_INDENT_SPACE}${DaikinIR.LIRC_INDENT_SPACE}name Control
${initial_commands}${frames_commands}
${DaikinIR.LIRC_INDENT_SPACE}end raw_codes
end remote`;
    }
    buildLIRCCommandFromIssueCommands(issue_commands) {
        let command = "";
        for (let i = 0; i < issue_commands.length; i += 1) {
            for (let j = 0; j < issue_commands[i].length; j += 1) {
                let space = DaikinIR.LIRC_COMMAND_SPACE;
                if (this.row_issued_count === -1 || this.row_issued_count === DaikinIR.LIRC_MAX_COMMANDS) {
                    if (this.row_issued_count === DaikinIR.LIRC_MAX_COMMANDS) {
                        command += "\n";
                    }
                    space = DaikinIR.LIRC_INDENT_SPACE + DaikinIR.LIRC_INDENT_SPACE
                        + DaikinIR.LIRC_COMMAND_BEGINNING_SPACE;
                    this.row_issued_count = 0;
                }
                command += space + sprintf_js_1.sprintf("%5s", issue_commands[i][j]);
                this.row_issued_count += 1;
            }
        }
        return command;
    }
    buildLIRCCommandsFromFrames(frames) {
        let commands = "";
        for (let i = 0; i < 3; i += 1) {
            commands += this.buildLIRCCommandFromIssueCommands([
                DaikinIR.LIRC_FRAME_START
            ]);
            for (let j = 0; j < frames[i].length - 1; j += 1) {
                const bits = sprintf_js_1.sprintf("%08b", frames[i][j]);
                for (let k = 7; k >= 0; k -= 1) {
                    commands += this.buildLIRCCommandFromIssueCommands([
                        bits[k] === "1" ? DaikinIR.LIRC_ONE : DaikinIR.LIRC_ZERO
                    ]);
                }
            }
            const cs_bits = sprintf_js_1.sprintf("%08b", DaikinIR.calcChecksum(frames[i]));
            for (let j = 7; j >= 0; j -= 1) {
                commands += this.buildLIRCCommandFromIssueCommands([
                    cs_bits[j] === "1" ? DaikinIR.LIRC_ONE : DaikinIR.LIRC_ZERO
                ]);
            }
            commands += this.buildLIRCCommandFromIssueCommands([
                DaikinIR.LIRC_FRAME_END
            ]);
            if (i < 2) {
                commands += this.buildLIRCCommandFromIssueCommands([
                    DaikinIR.LIRC_FRAME_SEPARATE
                ]);
            }
        }
        return commands;
    }
    getFrames() {
        const frameOne = [
            0x11, 0xDA, 0x27, 0x00,
            0xC5,
            0x00,
            0x00,
            0xD7
        ];
        const frameTwo = [
            0x11, 0xDA, 0x27, 0x00,
            0x42,
            0x00,
            0x00,
            0x54
        ];
        const frameThree = [
            0x11, 0xDA, 0x27, 0x00,
            0x00,
            0x08,
            0x19,
            0x00,
            0xAF,
            0x00,
            0x00,
            0x06,
            0x60,
            0x00,
            0x00,
            0xC0,
            0x00,
            0x00,
            0x26
        ];
        frameThree[5] = this.power | frameThree[5];
        frameThree[5] = (this.mode << 4) | (0x0F & frameThree[5]);
        switch (this.mode) {
            case 3:
            case 4:
                frameThree[6] = (0x1F & this.temperature) << 1;
                break;
            case 0:
            case 2:
                let temperature_offset = this.temperature;
                if (temperature_offset < 0) {
                    temperature_offset *= -1;
                    temperature_offset = ~temperature_offset;
                }
                frameThree[6] = (1 << 5) | (0x03 & temperature_offset);
                break;
            case 6:
                frameThree[6] = 25 << 1;
                break;
        }
        frameThree[8] = (this.fan_speed << 4) | (0x0F & frameThree[8]);
        frameThree[8] = this.swing | (0xF0 & frameThree[8]);
        if (this.on_timer > 0) {
            frameThree[5] |= 1 << 1;
            [frameThree[10], frameThree[11]] = DaikinIR.timeToBytes(this.on_timer, 3);
            frameThree[12] = 0;
        }
        if (this.off_timer > 0) {
            frameThree[5] |= 1 << 2;
            [frameThree[11], frameThree[12]] = DaikinIR.timeToBytes(this.off_timer, 7);
        }
        frameThree[13] = this.powerful ? 1 : 0;
        frameThree[frameThree.length - 1] = DaikinIR.calcChecksum(frameThree);
        return [frameOne, frameTwo, frameThree];
    }
    static calcChecksum(frame) {
        let checksum = 0;
        for (let i = 0; i < frame.length - 1; i += 1) {
            checksum += frame[i];
        }
        return (0xFF & checksum);
    }
    static timeToBytes(hour, split_bits) {
        const minutes = Math.round(hour) * 60;
        const little_endian_minutes = (0xFF & minutes) | (minutes >> 8);
        return [(2 ** split_bits - 1) & little_endian_minutes, little_endian_minutes >> split_bits];
    }
}
exports.DaikinIR = DaikinIR;
DaikinIR.IR_INITIAL_FRAME_SEPARATE_SPACE = "25375";
DaikinIR.IR_FRAME_START_END_PULSE = "3450";
DaikinIR.IR_FRAME_START_SPACE = "1750";
DaikinIR.IR_BIT_SEPARATOR_PULSE = "430";
DaikinIR.IR_BIT_ZERO_SPACE = "420";
DaikinIR.IR_BIT_ONE_SPACE = "1300";
DaikinIR.IR_FRAME_SEPARATE_SPACE = "35000";
DaikinIR.LIRC_MAX_COMMANDS = 5;
DaikinIR.LIRC_INDENT_SPACE = "    ";
DaikinIR.LIRC_COMMAND_BEGINNING_SPACE = "  ";
DaikinIR.LIRC_COMMAND_SPACE = "    ";
DaikinIR.LIRC_INITIAL_FRAME = [
    "550", "320", "525", "335", "505", "355", "485", "375", "465", "395", "445",
    DaikinIR.IR_INITIAL_FRAME_SEPARATE_SPACE
];
DaikinIR.LIRC_FRAME_START = [
    DaikinIR.IR_FRAME_START_END_PULSE,
    DaikinIR.IR_FRAME_START_SPACE
];
DaikinIR.LIRC_FRAME_END = [
    DaikinIR.IR_FRAME_START_END_PULSE
];
DaikinIR.LIRC_FRAME_SEPARATE = [
    DaikinIR.IR_FRAME_SEPARATE_SPACE
];
DaikinIR.LIRC_ZERO = [
    DaikinIR.IR_BIT_SEPARATOR_PULSE,
    DaikinIR.IR_BIT_ZERO_SPACE
];
DaikinIR.LIRC_ONE = [
    DaikinIR.IR_BIT_SEPARATOR_PULSE,
    DaikinIR.IR_BIT_ONE_SPACE
];
(function (DaikinIR) {
    var Enums;
    (function (Enums) {
        let Power;
        (function (Power) {
            Power[Power["Off"] = 0] = "Off";
            Power[Power["On"] = 1] = "On";
        })(Power = Enums.Power || (Enums.Power = {}));
        let Mode;
        (function (Mode) {
            Mode[Mode["Auto"] = 0] = "Auto";
            Mode[Mode["Dry"] = 2] = "Dry";
            Mode[Mode["Cold"] = 3] = "Cold";
            Mode[Mode["Warm"] = 4] = "Warm";
            Mode[Mode["Fan"] = 6] = "Fan";
        })(Mode = Enums.Mode || (Enums.Mode = {}));
        let FanSpeed;
        (function (FanSpeed) {
            FanSpeed[FanSpeed["Level1"] = 3] = "Level1";
            FanSpeed[FanSpeed["Level2"] = 4] = "Level2";
            FanSpeed[FanSpeed["Level3"] = 5] = "Level3";
            FanSpeed[FanSpeed["Level4"] = 6] = "Level4";
            FanSpeed[FanSpeed["Level5"] = 7] = "Level5";
            FanSpeed[FanSpeed["Auto"] = 10] = "Auto";
            FanSpeed[FanSpeed["Silent"] = 11] = "Silent";
        })(FanSpeed = Enums.FanSpeed || (Enums.FanSpeed = {}));
        let Swing;
        (function (Swing) {
            Swing[Swing["Off"] = 0] = "Off";
            Swing[Swing["On"] = 15] = "On";
        })(Swing = Enums.Swing || (Enums.Swing = {}));
        let TimerMode;
        (function (TimerMode) {
            TimerMode[TimerMode["None"] = 0] = "None";
            TimerMode[TimerMode["Off"] = 1] = "Off";
            TimerMode[TimerMode["On"] = 2] = "On";
        })(TimerMode = Enums.TimerMode || (Enums.TimerMode = {}));
    })(Enums = DaikinIR.Enums || (DaikinIR.Enums = {}));
})(DaikinIR = exports.DaikinIR || (exports.DaikinIR = {}));
//# sourceMappingURL=index.js.map