export function time_to_bit(hour: number): number {
    // 11bit use (2^11 >= 24hour * 60min)
    const rounded_hour = Math.round(hour);
    return rounded_hour * 60;
}
