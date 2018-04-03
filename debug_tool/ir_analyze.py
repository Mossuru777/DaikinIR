from typing import Iterable, List, Tuple

from read_lirc_rawcode import pseudo_mode2

# Timing Constants      [min,max]
msgDelay_timings = (20000, 40000)
startPeak_timings = (3000, 4000)
startTrough_timings = (1500, 1800)
oneZero_threshold = 600


def main():
    timings = wait_read()
    binary = timings_to_binary(timings)

    print("")
    print("----------MESSAGE----------")
    print("-----BINARY-----")
    for i in range(0, 3):
        print("Frame {} ({} bits): {}".format(i, len(binary[i]), " ".join(split_by_n(binary[i], 8))))

    print("")
    print("-----CHECKSUMS-----")
    for i in range(0, 3):
        matched, expect, actual = confirm_checksum(binary[i])
        if matched:
            print("Frame {}: matched ({})".format(i, expect))
        else:
            print("Frame {}: not matched (expect {}, actual {})".format(i, expect, actual))

    print("")
    print("-----SETTINGS-----")

    print("Power: " + str(bool(int(binary[2][40:41]))))
    print("Temperature: " + str(int(binary[2][49:55][::-1], 2)))

    mode_num = int(binary[2][44:47][::-1], 2)  # 3bit
    if mode_num == 0:
        print("Mode: Auto")
    elif mode_num == 2:
        print("Mode: Dry")
    elif mode_num == 3:
        print("Mode: Cold")
    elif mode_num == 4:
        print("Mode: Warm")
    elif mode_num == 6:
        print("Mode: Fan")
    else:
        print("Mode: Unknown")

    fan_num = int(binary[2][68:72][::-1], 2)
    if fan_num == 10:
        print("Fan Speed: Auto")
    elif fan_num == 11:
        print("Fan Speed: Night")
    elif 3 <= fan_num <= 7:
        print("Fan Speed: {}".format(fan_num - 2))
    else:
        print("Fan Speed: Unknown")
    print("")

    # print("Econo: {}".format(bool(int(binary[2][130:131]))))
    print("Powerful: {}".format(bool(int(binary[2][104:105]))))
    print("Silent: {}".format(bool(int(binary[2][109:110]))))
    # print("Mold Proof: {}".format(bool(int(binary[2][137:138]))))
    # print("Sensor: {}".format(bool(int(binary[2][129:130]))))
    print("Swing: {}".format(binary[2][64:68] == "1111"))  # 4bit 0000 == off, 1111 == on
    # print("Swing: {}".format(binary[2][64:68]))
    print("")

    print("Time: {}".format(binary_to_time(binary[1][40:51][::-1])))

    if binary[2][41] == 1:
        print("On Timer: {}".format(binary_to_time(binary[2][80:91][::-1])))
    else:
        print("On Timer: None")

    if binary[2][42] == 1:
        print("Off Timer: {}".format(binary_to_time(binary[2][92:103][::-1])))
    else:
        print("Off Timer: None")

    print("----------END----------")


def wait_read() -> List[int]:
    timings = []
    for next_line in pseudo_mode2():
        try:
            # print(next_line)
            # print(int(next_line[6:]))
            timings.append(int(next_line[6:]))
            # if len(timings) == 1:
            #     print("reading...")
        except ValueError:
            if next_line != "":
                print("[Skip] " + next_line)
            pass

    return timings


def val_between(val, extremes) -> bool:
    return extremes[0] <= val <= extremes[1]


def start_bit(current: int, timings: List[int]) -> bool:
    if val_between(timings[current], msgDelay_timings):
        if val_between(timings[current + 1], startPeak_timings):
            if val_between(timings[current + 2], startTrough_timings):
                return True
    return False


def timings_to_binary(timings) -> Tuple[str, str, str]:
    messages = []
    msg_num = -1
    for i in range(0, len(timings)):
        if start_bit(i, timings):
            # print("start bit: {}".format(i))
            msg_num += 1
            messages.append([])
        elif msg_num >= 0:
            messages[msg_num].append(timings[i])

    binary = []
    for i in range(0, len(messages)):
        binary.append("")
        for timing in messages[i][3:][::2]:
            if int(timing) > oneZero_threshold:
                binary[i] += "1"
            else:
                binary[i] += "0"
        # print(" ".join(split_by_n(binary[i], 8)))

    return binary[0], binary[1], binary[2]


def split_by_n(seq, n) -> Iterable:
    while seq:
        yield seq[:n]
        seq = seq[n:]


def confirm_checksum(binary: List[str]) -> Tuple[bool, str, str]:
    checksum = 0
    binary_per_byte = list(split_by_n(binary, 8))

    for b in binary_per_byte[:-1]:
        checksum += int(b[::-1], 2)
    expect_checksum_binary = bin(checksum)[2:].zfill(8)[-8:]

    try:
        actual_checksum_binary = binary_per_byte[-1][:8][::-1]
        matched = expect_checksum_binary == actual_checksum_binary
        return matched, expect_checksum_binary, actual_checksum_binary
    except IndexError:
        raise RuntimeError("checksum binary length insufficient: actual {}".format(len(binary_per_byte[-1])))


def binary_to_time(binary: str) -> str:
    time_minutes = int(binary, 2)
    minutes_part = time_minutes % 60
    hours_part = (time_minutes - minutes_part) / 60
    return "{}:{}".format(hours_part, minutes_part)


if __name__ == "__main__":
    main()
