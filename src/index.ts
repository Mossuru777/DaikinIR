/*
    Reference

    http://web.archive.org/web/20170107154250/http://rdlab.cdmt.vn/project-2013/daikin-ir-protocol
    https://github.com/blafois/Daikin-IR-Reverse
 */

import { sprintf } from "sprintf-js";

export class DaikinIR {
    readonly off_timer: number;
    readonly on_timer: number;

    // IR Timing private static constants
    private static readonly IR_INITIAL_FRAME_SEPARATE_SPACE = "25375";
    private static readonly IR_FRAME_START_END_PULSE = "3450";
    private static readonly IR_FRAME_START_SPACE = "1750";
    private static readonly IR_BIT_SEPARATOR_PULSE = "430";
    private static readonly IR_BIT_ZERO_SPACE = "420";
    private static readonly IR_BIT_ONE_SPACE = "1300";
    private static readonly IR_FRAME_SEPARATE_SPACE = "35000";

    // LIRC private static constants
    private static readonly LIRC_MAX_COMMANDS = 5;
    private static readonly LIRC_INDENT_SPACE = "    ";
    private static readonly LIRC_COMMAND_BEGINNING_SPACE = "  ";
    private static readonly LIRC_COMMAND_SPACE = "    ";
    private static readonly LIRC_INITIAL_FRAME = [
        // CHANGE_RATIO = 0.955
        // pulse[0] = 550
        // pulse[i] = Math.ceil(Math.ceil(pulse[i - 1] * CHANGE_RATIO, 0) / 5) * 5  ( 1 <= i <= 4 )
        // space[0] = 320
        // space[i] = Math.ceil(Math.ceil(space[i - 1] / CHANGE_RATIO, 0) / 5) * 5  ( 1 <= i <= 4 )

        // from the above, create a command below
        "550", "320", "525", "335", "505", "355", "485", "375", "465", "395", "445",
        DaikinIR.IR_INITIAL_FRAME_SEPARATE_SPACE
    ];
    private static readonly LIRC_FRAME_START = [
        DaikinIR.IR_FRAME_START_END_PULSE,
        DaikinIR.IR_FRAME_START_SPACE
    ];
    private static readonly LIRC_FRAME_END = [
        DaikinIR.IR_FRAME_START_END_PULSE
    ];
    private static readonly LIRC_FRAME_SEPARATE = [
        DaikinIR.IR_FRAME_SEPARATE_SPACE
    ];
    private static readonly LIRC_ZERO = [
        DaikinIR.IR_BIT_SEPARATOR_PULSE,
        DaikinIR.IR_BIT_ZERO_SPACE
    ];
    private static readonly LIRC_ONE = [
        DaikinIR.IR_BIT_SEPARATOR_PULSE,
        DaikinIR.IR_BIT_ONE_SPACE
    ];

    // LIRC row issued command counter
    private row_issued_count: number = -1;

    constructor(readonly power: DaikinIR.Enums.Power, readonly mode: DaikinIR.Enums.Mode,
                readonly temperature: number, readonly fan_speed: DaikinIR.Enums.FanSpeed,
                readonly swing: DaikinIR.Enums.Swing, readonly powerful: boolean,
                readonly timer_mode: DaikinIR.Enums.TimerMode, hour: number
    ) {
        this.off_timer = timer_mode === DaikinIR.Enums.TimerMode.Off ? hour : 0;
        this.on_timer = timer_mode === DaikinIR.Enums.TimerMode.On ? hour : 0;
    }

    getLIRCConfig(): string {
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
${DaikinIR.LIRC_INDENT_SPACE}gap 0
${DaikinIR.LIRC_INDENT_SPACE}begin raw_codes
${DaikinIR.LIRC_INDENT_SPACE}${DaikinIR.LIRC_INDENT_SPACE}name Control
${initial_commands}${frames_commands}
${DaikinIR.LIRC_INDENT_SPACE}end raw_codes
end remote`;
    }

    private buildLIRCCommandFromIssueCommands(issue_commands: string[][]): string {
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

                command += space + sprintf("%5s", issue_commands[i][j]);
                this.row_issued_count += 1;
            }
        }

        return command;
    }

    private buildLIRCCommandsFromFrames(frames: number[][]): string {
        let commands = "";

        for (let i = 0; i < 3; i += 1) {
            // issue frame header
            commands += this.buildLIRCCommandFromIssueCommands([
                DaikinIR.LIRC_FRAME_START
            ]);

            // issue commands
            for (let j = 0; j < frames[i].length - 1; j += 1) {
                // output reverse bits per byte
                const bits = sprintf("%08b", frames[i][j]);
                for (let k = 7; k >= 0; k -= 1) {
                    commands += this.buildLIRCCommandFromIssueCommands([
                        bits[k] === "1" ? DaikinIR.LIRC_ONE : DaikinIR.LIRC_ZERO
                    ]);
                }
            }

            // issue checksum (output as reverse bits)
            const cs_bits = sprintf("%08b", DaikinIR.calcChecksum(frames[i]));
            for (let j = 7; j >= 0; j -= 1) {
                commands += this.buildLIRCCommandFromIssueCommands([
                    cs_bits[j] === "1" ? DaikinIR.LIRC_ONE : DaikinIR.LIRC_ZERO
                ]);
            }

            // issue frame footer
            commands += this.buildLIRCCommandFromIssueCommands([
                DaikinIR.LIRC_FRAME_END
            ]);

            // issue space between frame
            if (i < 2) {
                commands += this.buildLIRCCommandFromIssueCommands([
                    DaikinIR.LIRC_FRAME_SEPARATE
                ]);
            }
        }

        return commands;
    }

    getFrames(): number[][] {
        // *** Frame1 ***
/*
Offset  Description            Length     Example        Decoding
========================================================================================================
0-3     Header                 4          11 da 27 00
6       Comfort mode           1          10 (Enabled) or 00 (Disabled)
7       Checksum               1          e7 (Comfort Enabled) / d7 (Comfort Disabled)
 */
        const frameOne: number[] = [
            0x11, 0xDA, 0x27, 0x00, // header
            0xC5,
            0x00,
            0x00,
            0xD7  // checksum
        ];
        // CheckSum
        // frameOne[frameOne.length - 1] = DaikinIRCommand.calcChecksum(frameOne);

        // *** Frame2 ***
        // fixed header? //
        const frameTwo: number[] = [
            0x11, 0xDA, 0x27, 0x00,  // header
            0x42,
            0x00,
            0x00,
            0x54  // checksum
        ];
        // // CheckSum
        // frameTwo[frameTwo.length - 1] = DaikinIRCommand.calcChecksum(frameTwo);

        // *** Frame3 ***
/*
        Offset  Description   Length     Example        Decoding
========================================================================================================
00-03   Header                 4          11 da 27 00
04      Message Identifier     1          00
05      Mode, On/Off, Timer    1          49             49 = Heat, On, No Timer
06      Temperature            1          30             It is temperature x2. 0x30 = 48 / 2 = 24°C
08      Fan / Swing            1          30             30 = Fan 1/5 No Swing. 3F = Fan 1/5 + Swing.
0a-0c   Timer delay            3          3c 00 60
0d      Powerful               1          01             Powerful enabled
10      Econo                  1          84             4 last bits  84 (Enabled) / 80 (Disabled)
12      Checksum               1          8e             Add all previous bytes and do a OR with mask 0xff
 */
        const frameThree: number[] = [
            0x11, 0xDA, 0x27, 0x00,  // Header
            0x00,  // Message Identifier
            0x08,  // Mode, Power On/Off, Timer (Default Mode: Auto, Power: Off, Timer: Off)
            0x19,  // Temperature (Default 25)
            0x00,
            0xAF,  // Fan / Swing (Default Fan: Auto, Swing: On)
            0x00,
            0x00,  // On Timer delay
            0x06,  // On Timer delay / Off Timer delay
            0x60,  // Off Timer delay
            0x00,  // Powerful (Default Disabled)
            0x00,
            0xC0, // 0xC1,
            0x00, // 0x80,  // Econo (Default Disabled)
            0x00,
            0x26   // Checksum
        ];

        // Power
        frameThree[5] = this.power | frameThree[5];
        // Mode
        frameThree[5] = (this.mode << 4) | (0x0F & frameThree[5]);
        // Temperature
        switch (this.mode) {
        case DaikinIR.Enums.Mode.Cold:
        case DaikinIR.Enums.Mode.Warm:
            // top sign bit(0) and 5bit use integer
            frameThree[6] = (0x1F & this.temperature) << 1;
            break;
        case DaikinIR.Enums.Mode.Auto:
        case DaikinIR.Enums.Mode.Dry:
            // top sign bit(0 or 1) and 3bit 0padded and 2bit use integer
            let temperature_offset = this.temperature;
            if (temperature_offset < 0) {
                temperature_offset *= -1;
                temperature_offset = ~temperature_offset;
            }
            frameThree[6] = (1 << 5) | (0x03 & temperature_offset);
            break;
        case DaikinIR.Enums.Mode.Fan:
            // top sign bit(0) and 5bit use integer
            frameThree[6] = 25 << 1;
            break;
        }
        // FanSpeed
        frameThree[8] = (this.fan_speed << 4) | (0x0F & frameThree[8]);
        // Swing
        frameThree[8] = this.swing | (0xF0 & frameThree[8]);
        // On Timer
        if (this.on_timer > 0) {
            frameThree[5] |= 1 << 1;  // Flag bit
            [frameThree[10], frameThree[11]] = DaikinIR.timeToBytes(this.on_timer, 3);
            frameThree[12] = 0; // [11],[12]にOn/OffTimer両Off時FlagBitsがあるが、[10],[11]は上書きするので[12]のみ0set
        }
        // Off Timer
        if (this.off_timer > 0) {
            frameThree[5] |= 1 << 2;  // Flag bit
            [frameThree[11], frameThree[12]] = DaikinIR.timeToBytes(this.off_timer, 7);
        }
        // Powerful
        frameThree[13] = this.powerful ? 1 : 0;
        // CheckSum
        frameThree[frameThree.length - 1] = DaikinIR.calcChecksum(frameThree);

        return [frameOne, frameTwo, frameThree];
    }

    private static calcChecksum(frame: number[]): number {
        let checksum = 0;
        for (let i = 0; i < frame.length - 1; i += 1) {
            checksum += frame[i];
        }
        return (0xFF & checksum);
    }

    private static timeToBytes(hour: number, split_bits: number): number[] {
        // convert to minutes
        const minutes = Math.round(hour) * 60;

        // convert to 11bit use little endian bits
        const little_endian_minutes = (0xFF & minutes) | (minutes >> 8);

        // return split bits
        // [(split_bits), (11-split_bits)]
        return [(2 ** split_bits - 1) & little_endian_minutes, little_endian_minutes >> split_bits];
    }
}

export namespace DaikinIR.Enums {
    export const enum Power {
        // 1bit use
        Off = 0b0000,
        On = 0b0001
    }

    export const enum Mode {
        // 3bit use
        Auto = 0b0000,
        Dry = 0b0010,
        Cold = 0b0011,
        Warm = 0b0100,
        Fan = 0b0110
    }

    export const enum FanSpeed {
        // 4bit use
        Level1 = 0b0011,
        Level2 = 0b0100,
        Level3 = 0b0101,
        Level4 = 0b0110,
        Level5 = 0b0111,
        Auto = 0b1010,
        Silent = 0b1011,

    }

    export const enum Swing {
        // 4bit use
        Off = 0b0000,
        On = 0b1111
    }

    export const enum TimerMode {
        None,
        Off,
        On
    }
}
