import * as enums from "./enums";
import * as utils from "./utils";

export class DaikinIRSignal {
    public readonly off_timer: number;
    public readonly on_timer: number;

    constructor(public readonly power: enums.Power, public readonly mode: enums.Mode,
                public readonly fan_speed: enums.FanSpeed, public readonly swing: enums.Swing,
                timer_mode: enums.TimerMode, hour: number) {
        this.off_timer = timer_mode === enums.TimerMode.Off ? utils.time_to_bit(hour) : 0;
        this.on_timer = timer_mode === enums.TimerMode.On ? utils.time_to_bit(hour) : 0;
    }
}
