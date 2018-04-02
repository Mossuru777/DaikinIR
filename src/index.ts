/*
    Reference

    http://web.archive.org/web/20170107154250/http://rdlab.cdmt.vn/project-2013/daikin-ir-protocol
    https://github.com/blafois/Daikin-IR-Reverse
 */

import { sprintf } from "sprintf-js";
import { Power, Mode, FanSpeed, Swing, TimerMode } from "./conf_enums";

export class DaikinIRCommand {
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
        DaikinIRCommand.IR_INITIAL_FRAME_SEPARATE_SPACE
    ];
    private static readonly LIRC_FRAME_START = [
        DaikinIRCommand.IR_FRAME_START_END_PULSE,
        DaikinIRCommand.IR_FRAME_START_SPACE
    ];
    private static readonly LIRC_FRAME_END = [
        DaikinIRCommand.IR_FRAME_START_END_PULSE
    ];
    private static readonly LIRC_FRAME_SEPARATE = [
        DaikinIRCommand.IR_FRAME_SEPARATE_SPACE
    ];
    private static readonly LIRC_ZERO = [
        DaikinIRCommand.IR_BIT_SEPARATOR_PULSE,
        DaikinIRCommand.IR_BIT_ZERO_SPACE
    ];
    private static readonly LIRC_ONE = [
        DaikinIRCommand.IR_BIT_SEPARATOR_PULSE,
        DaikinIRCommand.IR_BIT_ONE_SPACE
    ];

    constructor(readonly power: Power, readonly mode: Mode, readonly temperature: number,
                readonly fan_speed: FanSpeed, readonly swing: Swing, readonly powerful: boolean,
                readonly timer_mode: TimerMode, hour: number) {
        this.off_timer = timer_mode === TimerMode.Off ? hour : 0;
        this.on_timer = timer_mode === TimerMode.On ? hour : 0;
    }

    getLIRCConfig(): string {
        const frames = this.getFrames();

        let row_issued_count = -1;
        let begin_command: string;
        [begin_command, row_issued_count] = DaikinIRCommand.buildLIRCCommandFromIssueCommands([
            DaikinIRCommand.LIRC_INITIAL_FRAME
        ], row_issued_count);

        let command1: string;
        let command2: string;
        let command3: string;
        [command1, row_issued_count] = DaikinIRCommand.buildLIRCCommandFromFrames(frames[0], row_issued_count, false);
        [command2, row_issued_count] = DaikinIRCommand.buildLIRCCommandFromFrames(frames[1], row_issued_count, false);
        [command3, row_issued_count] = DaikinIRCommand.buildLIRCCommandFromFrames(frames[2], row_issued_count, true);

        return `begin remote
${DaikinIRCommand.LIRC_INDENT_SPACE}name  AirCon
${DaikinIRCommand.LIRC_INDENT_SPACE}flags RAW_CODES
${DaikinIRCommand.LIRC_INDENT_SPACE}eps 30
${DaikinIRCommand.LIRC_INDENT_SPACE}aeps 100
${DaikinIRCommand.LIRC_INDENT_SPACE}gap 0
${DaikinIRCommand.LIRC_INDENT_SPACE}begin raw_codes
${DaikinIRCommand.LIRC_INDENT_SPACE}${DaikinIRCommand.LIRC_INDENT_SPACE}name Control
${begin_command}${command1}${command2}${command3}
${DaikinIRCommand.LIRC_INDENT_SPACE}end raw_codes
end remote`;
    }

    private static buildLIRCCommandFromIssueCommands(issue_commands: string[][],
                                                     row_issued_count: number): [string, number] {
        let command = "";
        let current_row_issued_count = row_issued_count;
        for (let i = 0; i < issue_commands.length; i += 1) {
            for (let j = 0; j < issue_commands[i].length; j += 1) {
                let space = DaikinIRCommand.LIRC_COMMAND_SPACE;
                if (current_row_issued_count === -1 || current_row_issued_count === DaikinIRCommand.LIRC_MAX_COMMANDS) {
                    if (current_row_issued_count === DaikinIRCommand.LIRC_MAX_COMMANDS) {
                        command += "\n";
                    }
                    space = DaikinIRCommand.LIRC_INDENT_SPACE + DaikinIRCommand.LIRC_INDENT_SPACE
                        + DaikinIRCommand.LIRC_COMMAND_BEGINNING_SPACE;
                    current_row_issued_count = 0;
                }

                command += space + sprintf("%5s", issue_commands[i][j]);
                current_row_issued_count += 1;
            }
        }

        return [command, current_row_issued_count];
    }

    private static buildLIRCCommandFromFrames(frame: number[], row_issued_count: number,
                                              is_last_frame: boolean): [string, number] {
        let command = "";
        let current_row_issued_count = row_issued_count;

        let tmp_command: string;

        // issue frame header
        [tmp_command, current_row_issued_count] = DaikinIRCommand.buildLIRCCommandFromIssueCommands(
            [this.LIRC_FRAME_START], current_row_issued_count);
        command += tmp_command;

        // issue commands
        for (let i = 0; i < frame.length - 1; i += 1) {
            // output reverse bits per byte
            const bits = sprintf("%08b", frame[i]);
            for (let j = 7; j >= 0; j -= 1) {
                [tmp_command, current_row_issued_count] = DaikinIRCommand.buildLIRCCommandFromIssueCommands(
                    [bits[j] === "1" ? DaikinIRCommand.LIRC_ONE : DaikinIRCommand.LIRC_ZERO], current_row_issued_count);
                command += tmp_command;
            }
        }

        // issue checksum (output as reverse bits)
        const cs_bits = sprintf("%08b", DaikinIRCommand.calcChecksum(frame));
        for (let i = 7; i >= 0; i -= 1) {
            [tmp_command, current_row_issued_count] = DaikinIRCommand.buildLIRCCommandFromIssueCommands(
                [cs_bits[i] === "1" ? DaikinIRCommand.LIRC_ONE : DaikinIRCommand.LIRC_ZERO], current_row_issued_count);
            command += tmp_command;
        }

        // issue frame footer
        [tmp_command, current_row_issued_count] = DaikinIRCommand.buildLIRCCommandFromIssueCommands(
            [DaikinIRCommand.LIRC_FRAME_END], current_row_issued_count);
        command += tmp_command;

        // issue space between frame
        if (!is_last_frame) {
            [tmp_command, current_row_issued_count] = DaikinIRCommand.buildLIRCCommandFromIssueCommands(
                [DaikinIRCommand.LIRC_FRAME_SEPARATE], current_row_issued_count);
            command += tmp_command;
        }

        return [command, current_row_issued_count];
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
        case Mode.Cold:
        case Mode.Warm:
            // top sign bit(0) and 5bit use integer
            frameThree[6] = (0x1F & this.temperature) << 1;
            break;
        case Mode.Auto:
        case Mode.Dry:
            // top sign bit(0 or 1) and 3bit 0padded and 2bit use integer
            let temperature_offset = this.temperature;
            if (temperature_offset < 0) {
                temperature_offset *= -1;
                temperature_offset = ~temperature_offset;
            }
            frameThree[6] = (1 << 5) | (0x03 & temperature_offset);
            break;
        case Mode.Fan:
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
            [frameThree[10], frameThree[11]] = DaikinIRCommand.timeToBytes(this.on_timer, 3);
            frameThree[12] = 0; // [11],[12]にOn/OffTimer両Off時FlagBitsがあるが、[10],[11]は上書きするので[12]のみ0set
        }
        // Off Timer
        if (this.off_timer > 0) {
            frameThree[5] |= 1 << 2;  // Flag bit
            [frameThree[11], frameThree[12]] = DaikinIRCommand.timeToBytes(this.off_timer, 7);
        }
        // Powerful
        frameThree[13] = this.powerful ? 1 : 0;
        // CheckSum
        frameThree[frameThree.length - 1] = DaikinIRCommand.calcChecksum(frameThree);

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
