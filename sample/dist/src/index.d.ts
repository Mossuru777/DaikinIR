export declare class DaikinIR {
    readonly power: DaikinIR.Enums.Power;
    readonly mode: DaikinIR.Enums.Mode;
    readonly temperature: number;
    readonly fan_speed: DaikinIR.Enums.FanSpeed;
    readonly swing: DaikinIR.Enums.Swing;
    readonly powerful: boolean;
    readonly timer_mode: DaikinIR.Enums.TimerMode;
    readonly off_timer: number;
    readonly on_timer: number;
    private static readonly IR_INITIAL_FRAME_SEPARATE_SPACE;
    private static readonly IR_FRAME_START_END_PULSE;
    private static readonly IR_FRAME_START_SPACE;
    private static readonly IR_BIT_SEPARATOR_PULSE;
    private static readonly IR_BIT_ZERO_SPACE;
    private static readonly IR_BIT_ONE_SPACE;
    private static readonly IR_FRAME_SEPARATE_SPACE;
    private static readonly LIRC_MAX_COMMANDS;
    private static readonly LIRC_INDENT_SPACE;
    private static readonly LIRC_COMMAND_BEGINNING_SPACE;
    private static readonly LIRC_COMMAND_SPACE;
    private static readonly LIRC_INITIAL_FRAME;
    private static readonly LIRC_FRAME_START;
    private static readonly LIRC_FRAME_END;
    private static readonly LIRC_FRAME_SEPARATE;
    private static readonly LIRC_ZERO;
    private static readonly LIRC_ONE;
    private row_issued_count;
    constructor(power: DaikinIR.Enums.Power, mode: DaikinIR.Enums.Mode, temperature: number, fan_speed: DaikinIR.Enums.FanSpeed, swing: DaikinIR.Enums.Swing, powerful: boolean, timer_mode: DaikinIR.Enums.TimerMode, hour: number);
    getLIRCConfig(): string;
    private buildLIRCCommandFromIssueCommands(issue_commands);
    private buildLIRCCommandsFromFrames(frames);
    getFrames(): number[][];
    private static calcChecksum(frame);
    private static timeToBytes(hour, split_bits);
}
export declare namespace DaikinIR.Enums {
    const enum Power {
        Off = 0,
        On = 1,
    }
    const enum Mode {
        Auto = 0,
        Dry = 2,
        Cold = 3,
        Warm = 4,
        Fan = 6,
    }
    const enum FanSpeed {
        Level1 = 3,
        Level2 = 4,
        Level3 = 5,
        Level4 = 6,
        Level5 = 7,
        Auto = 10,
        Silent = 11,
    }
    const enum Swing {
        Off = 0,
        On = 15,
    }
    const enum TimerMode {
        None = 0,
        Off = 1,
        On = 2,
    }
}
