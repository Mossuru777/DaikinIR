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
