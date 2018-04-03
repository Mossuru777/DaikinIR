import re

with open("./lirc_conf_rawcode.txt") as f:
    conf = f.read()
    conf = re.sub(r"^ +", "", conf, flags=re.MULTILINE)
    conf = re.sub(r" +", "\n", conf, flags=re.MULTILINE)


def pseudo_mode2():
    is_odd = True
    for value in conf.split("\n"):
        if value == "":
            continue
        yield ("pulse" if is_odd else "space") + " " + value
        is_odd = not is_odd
