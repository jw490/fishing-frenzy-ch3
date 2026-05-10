#!/usr/bin/env python3
"""
Convert an LRC file + audio offset to character-level lyricTimes for songs.js.

Usage:
  python3 lrc_to_times.py <lrc_file> <offset_sec> <lyrics_ref_file>

The offset is how many seconds to ADD to LRC timestamps to get video-file time.
For songs with a label/pre-roll intro, this equals the intro length.

Output: JSON with lyrics + lyricTimes, ready to inject into songs.js.
"""
import sys, json, re

def parse_lrc(path):
    """Return list of (time_sec, text) for lyric lines only."""
    lines = []
    for raw in open(path, encoding='utf-8', errors='replace'):
        raw = raw.strip()
        m = re.match(r'\[(\d+):(\d+\.\d+)\](.*)', raw)
        if not m:
            continue
        mins, secs, text = int(m.group(1)), float(m.group(2)), m.group(3).strip()
        # Skip meta lines and empty lines
        if not text or any(kw in text for kw in ['作词', '作曲', '编曲', '本站', '来自', ' - ']):
            continue
        t = mins * 60 + secs
        lines.append((t, text))
    return lines

def lrc_to_char_times(lrc_lines, offset, total_duration):
    """
    For each char in each lyric line, interpolate a timestamp.
    Between line N start and line N+1 start, distribute chars evenly.
    Last line: distribute chars evenly over ~4s default.
    """
    lyrics_out = []
    times_out  = []

    for i, (t_start, text) in enumerate(lrc_lines):
        t_file = t_start + offset

        # Next line start (capped at total_duration - 1)
        if i + 1 < len(lrc_lines):
            t_next = lrc_lines[i+1][0] + offset
        else:
            t_next = min(t_file + 6.0, total_duration - 0.5)

        # Remove spaces — we display individual chars
        chars = [c for c in text if not c.isspace()]
        n = len(chars)
        if n == 0:
            continue

        # Distribute char times evenly across the line window
        # Leave last 0.3s as buffer before next line
        window = max(t_next - t_file - 0.3, 0.5)
        char_times = [round(t_file + window * k / n, 3) for k in range(n)]

        lyrics_out.append(chars)
        times_out.extend(char_times)

    return lyrics_out, times_out

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    lrc_path = sys.argv[1]
    offset   = float(sys.argv[2])

    lrc_lines = parse_lrc(lrc_path)
    print(f'Parsed {len(lrc_lines)} lyric lines', file=sys.stderr)
    for t, text in lrc_lines[:5]:
        print(f'  [{t:.2f}s] {text}', file=sys.stderr)

    # Rough total duration (we'll use a large number; caller can pass as arg 3)
    total = float(sys.argv[3]) if len(sys.argv) > 3 else 360.0

    lyrics_out, times_out = lrc_to_char_times(lrc_lines, offset, total)

    out = {
        'lyrics':     lyrics_out,
        'lyricTimes': times_out,
        'lineCount':  len(lyrics_out),
        'charCount':  len(times_out),
        'offset':     offset,
    }
    print(json.dumps(out, ensure_ascii=False))
    print(f'Output: {len(lyrics_out)} lines, {len(times_out)} chars', file=sys.stderr)

if __name__ == '__main__':
    main()
