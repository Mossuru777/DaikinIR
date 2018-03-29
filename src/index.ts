import { Power, Mode, FanSpeed, Swing, TimerMode } from "./conf_enums";

export class DaikinIRCommand {
    // IR Timing private static readonlyants
    private static readonly IR_SEPARATOR_PULSE = "430";
    private static readonly IR_FRAME_SEPARATOR_PULSE = "3400";
    private static readonly IR_FRAME_SEPARATOR_SPACE = "1750";
    private static readonly IR_ONE = "1320";
    private static readonly IR_ZERO = "450";
    private static readonly IR_PKG_START = "25000";
    private static readonly IR_FRAME_START = "35000";

    // LIRC private static readonlyants
    private static readonly LIRC_SPACE = "     ";
    private static readonly LIRC_FRAME_START = [
        DaikinIRCommand.IR_FRAME_SEPARATOR_PULSE,
        DaikinIRCommand.IR_FRAME_SEPARATOR_SPACE
    ];
    private static readonly LIRC_PKG_START = [
        DaikinIRCommand.IR_SEPARATOR_PULSE,
        DaikinIRCommand.IR_PKG_START
    ];
    private static readonly LIRC_MIDDLE_PKG_START = [
        DaikinIRCommand.IR_SEPARATOR_PULSE,
        DaikinIRCommand.IR_FRAME_START
    ];
    private static readonly LIRC_ZERO = [
        DaikinIRCommand.IR_SEPARATOR_PULSE,
        DaikinIRCommand.IR_ZERO
    ];
    private static readonly LIRC_ONE = [
        DaikinIRCommand.IR_SEPARATOR_PULSE,
        DaikinIRCommand.IR_ONE
    ];

    readonly off_timer: number;
    readonly on_timer: number;

    constructor(readonly power: Power, readonly mode: Mode, readonly degree: number,
                readonly fan_speed: FanSpeed, readonly swing: Swing, readonly powerful: boolean,
                readonly timer_mode: TimerMode, hour: number) {
        this.off_timer = timer_mode === TimerMode.Off ? hour : 0;
        this.on_timer = timer_mode === TimerMode.On ? hour : 0;
    }

    getLIRCConfig(): string {
        const frames = this.getFrames();

        let command1: string;
        let command2: string;
        let command3: string;
        let row_issued_count = 2;
        [command1, row_issued_count] = DaikinIRCommand.buildLIRCCommand(frames[0], row_issued_count, true);
        [command2, row_issued_count] = DaikinIRCommand.buildLIRCCommand(frames[1], row_issued_count, false);
        [command3, row_issued_count] = DaikinIRCommand.buildLIRCCommand(frames[2], row_issued_count, false);

        return `
begin remote
    name  AirCon
    flags RAW_CODES
    eps 30
    aeps 100
    gap 34978

    begin raw_codes
        name Control
${DaikinIRCommand.LIRC_SPACE}${DaikinIRCommand.LIRC_ZERO}${DaikinIRCommand.LIRC_ZERO}${DaikinIRCommand.LIRC_ZERO}
${DaikinIRCommand.LIRC_SPACE}${DaikinIRCommand.LIRC_ZERO}${DaikinIRCommand.LIRC_ZERO}${command1}${command2}${command3}
    end raw_codes
end remote
`;
    }

    private static buildLIRCCommand(frame: number[], row_issued_count: number,
                                    is_first_package: boolean): [string, number] {
        let command = "";
        let current_row_issued_count = row_issued_count;
        const issueCommands = function (issue_commands: string[][]) {
            for (let i = 0; i < issue_commands.length; i += 1) {
                for (let j = 0; j < issue_commands[i].length; j += 1) {
                    if (current_row_issued_count === 3) {
                        command += "\n";
                        current_row_issued_count = 0;
                    }
                    command += DaikinIRCommand.LIRC_SPACE + issue_commands[i][j];
                    current_row_issued_count += 1;
                }
            }
        };

        // issue package and frame start declare
        const pkg_start = is_first_package ? DaikinIRCommand.LIRC_PKG_START : DaikinIRCommand.LIRC_MIDDLE_PKG_START;
        issueCommands([pkg_start, DaikinIRCommand.LIRC_FRAME_START]);

        // issue commands
        for (let i = 0; i < frame.length; i += 1) {
            const bits = frame[i].toString(2);
            for (let j = 15; j >= 0; j -= 1) {  // bit reverse output
                issueCommands([bits[j] === "1" ? DaikinIRCommand.LIRC_ONE : DaikinIRCommand.LIRC_ZERO]);
            }
        }

        return [command, current_row_issued_count];
    }

    private getFrames(): number[][] {
        // *** Frame1 ***
        const frameOne: number[] = [0x11, 0xDA, 0x27, 0x00, 0xC5, 0x30, 0x00, 0x07];
        // CheckSum
        frameOne[frameOne.length - 1] = DaikinIRCommand.calcChecksum(frameOne);

        // *** Frame2 ***
        const frameTwo: number[] = [0x11, 0xDA, 0x27, 0x00, 0x42, 0x00, 0x08, 0x5C];
        // CheckSum
        frameTwo[frameTwo.length - 1] = DaikinIRCommand.calcChecksum(frameTwo);

        // *** Frame3 ***
        const frameThree: number[] = [
            0x11, 0xDA, 0x27, 0x00, 0x00, 0x08, 0x00, 0x00,
            0xB0, 0x00, 0x00, 0x06, 0x60, 0x00, 0x00, 0xC1,
            0x80, 0x00, 0x00
        ];
        // Power
        frameThree[5] = this.power | frameThree[5];
        // Mode
        frameThree[5] = (this.mode << 4) | (0x0F & frameThree[5]);
        // Degree
        switch (this.mode) {
        case Mode.Cold:
        case Mode.Warm:
            frameThree[6] = this.degree;
            break;
        case Mode.Auto:
        case Mode.Dry:
            let degree_offset = this.degree;
            if (degree_offset < 0) {
                    degree_offset *= -1;
                    degree_offset = ~degree_offset;
                }
            frameThree[6] = 1 << 5 | degree_offset;
            break;
        case Mode.Fan:
            frameThree[6] = 25;
            break;
        }
        // FanSpeed
        frameThree[8] = (this.fan_speed << 4) | (0x0F & frameThree[8]);
        // Swing
        frameThree[8] = this.swing | (0xF0 & frameThree[8]);
        // Off Timer
        if (this.off_timer > 0) {
            const bit = DaikinIRCommand.timeToBit(this.off_timer);
            frameThree[13] |= 1 << 2;  // Flag bit
            frameThree[7] = (bit >> 6) | (0xE0 & frameThree[7]);  // 先頭5bit
            frameThree[8] = (0x3F & bit) | (0x03 & frameThree[8]);  // 残り6bit
        } else {
            frameThree[13] &= 0xFB;  // Flag bit
            frameThree[7] &= 0xE0;  // 先頭5bit
            frameThree[8] &= 0x03;  // 残り6bit
        }
        // On Timer
        if (this.on_timer > 0) {
            const bit = DaikinIRCommand.timeToBit(this.on_timer);
            frameThree[13] |= 1 << 1;  // Flag bit
            frameThree[8] = (bit >> 10) | (0xFE & frameThree[8]);  // 先頭1bit
            frameThree[9] = 0xFF & (bit >> 2);  // 中間8bit
            frameThree[10] = (0x03 & bit) << 6 | (0x3F & frameThree[10]);  // 残り2bit
        } else {
            frameThree[13] &= 0xFD;  // Flag bit
            frameThree[8] &= 0xFE;  // 先頭1bit
            frameThree[9] = 0;  // 中間8bit
            frameThree[10] &= 0x3F;  // 残り2bit
        }
        // CheckSum
        frameThree[frameThree.length - 1] = DaikinIRCommand.calcChecksum(frameThree);

        return [frameOne, frameTwo, frameThree];
    }

    private static calcChecksum(frame: number[]): number {
        let checksum = 0;
        for (let i = 0; i < frame.length - 1; i += 1) {
            checksum += frame[i];
        }
        return checksum;
    }

    private static timeToBit(hour: number): number {
        // 11bit use (2^11 >= 24hour * 60min)
        const rounded_min = Math.round(hour) * 60;
        let return_bits = 0;
        for (let i = 0; i < 11; i += 1) {
            return_bits = 1 & (rounded_min >> i);
        }
        return return_bits;
    }
}
