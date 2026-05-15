#!/usr/bin/env python3
"""
strip_pinyin.py
Usage:  python3 pipeline/strip_pinyin.py          (paste, Ctrl-D)
        python3 pipeline/strip_pinyin.py < in.txt
"""
import sys, re

CJK = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303f]')

def process(text):
    out = []
    prev_blank = False
    for line in text.splitlines():
        s = line.strip()

        # blank line — allow one, collapse runs
        if not s:
            if not prev_blank:
                out.append('')
            prev_blank = True
            continue
        prev_blank = False

        # find last CJK character in the line
        last = -1
        for i, c in enumerate(s):
            if CJK.match(c):
                last = i

        # pure-pinyin line (no CJK) — drop it
        if last == -1:
            # keep lines like "~Interlude 间奏~" that have CJK, but 间奏 is CJK so it'd be kept
            # anything with no CJK at all: drop
            continue

        # keep up to and including the last CJK character, then strip trailing spaces
        kept = s[:last + 1].rstrip()
        # also strip leading * markers
        kept = kept.lstrip('* ')
        if kept:
            out.append(kept)

    return '\n'.join(out)

if __name__ == '__main__':
    if sys.stdin.isatty():
        print("Paste lyrics then Ctrl-D:\n", file=sys.stderr)
    print(process(sys.stdin.read()))
