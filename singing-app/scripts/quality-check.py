#!/usr/bin/env python3
"""
VocalStar song quality checklist — checks every song against hard criteria.

PASS criteria:
  [1] HAS VOCAL AUDIO  – audioSrc exists on R2, file size > 2MB
  [2] HAS KARAOKE      – instrumentalSrc exists on R2, file size differs from
                          audio by > 10% (proves Demucs actually ran)
  [3] COUNTDOWN OK     – firstVocalSec is within ±4s of round(lyricTimes[0])-6
  [4] HAS BARS         – lyrics and lyricTimes both non-empty, timestamps
                          monotonically non-decreasing, char count matches
  [5] CLEAN NOTES      – notes[] must be empty for lyricsMode songs (non-empty
                          notes force _expandToSyllables() → BPM branch → flat bars)
  [6] HAS MELODY       – melody[] has ≥ 300 segments (needed for pitch scoring)
  [7] PITCH READY      – pitchGradingReady is not explicitly false
"""
import re, json, sys, subprocess
from pathlib import Path

CDN = "https://pub-7b37e1a1b08244c98f1735f2f95ab5f6.r2.dev"
SONGS_PATH = Path(__file__).parent.parent / "js" / "songs.js"

def r2_size(filename):
    """Return Content-Length from R2 HEAD request, or 0 on error."""
    r = subprocess.run(
        ["curl", "-sI", f"{CDN}/{filename}"],
        capture_output=True, text=True, timeout=10
    )
    for line in r.stdout.splitlines():
        if line.lower().startswith("content-length"):
            try: return int(line.split(":", 1)[1].strip())
            except: pass
    return 0

def check_timestamps(lyrics, times):
    """Return (ok, issue_desc). Checks monotonicity and coverage."""
    if not lyrics or not times:
        return False, "empty"
    total_chars = sum(len(l) for l in lyrics)
    if len(times) != total_chars:
        return False, f"times len {len(times)} != chars {total_chars}"
    ti = 0
    for li, line in enumerate(lyrics):
        for ci in range(1, len(line)):
            if times[ti+ci] < times[ti+ci-1] - 0.005:
                return False, f"backward at line {li+1} char {ci}"
        if li + 1 < len(lyrics):
            last_t = times[ti+len(line)-1]
            next_t  = times[ti+len(line)]
            if last_t >= next_t:
                return False, f"overlap line {li+1}→{li+2}"
        ti += len(line)
    return True, ""

src = SONGS_PATH.read_text()
ids = re.findall(r"id: '([^']+)'", src)

target = sys.argv[1] if len(sys.argv) > 1 else None
if target:
    ids = [i for i in ids if i == target]

HDR = f"{'ID':<32} {'[1]':>4} {'[2]':>4} {'[3]':>4} {'[4]':>4} {'[5]':>4} {'[6]':>4} {'[7]':>4}  STATUS"
print(HDR)
print("─" * len(HDR))

failures = 0
for sid in ids:
    idx = src.find(f"id: '{sid}'")
    next_idx = src.find("id: '", idx+10)
    chunk = src[idx:] if next_idx == -1 else src[idx:next_idx]

    # Extract fields
    def field(pat):
        m = re.search(pat, chunk)
        return m.group(1) if m else None

    audio_path   = field(r"audioSrc:\s*'(/[^']+)'")
    instr_path   = field(r"instrumentalSrc:\s*'(/[^']+)'")
    fvs_str      = field(r"firstVocalSec:\s*(\d+)")
    lyr_m        = re.search(r'lyrics:\s*(\[\[.*?\]\])', chunk, re.DOTALL)
    times_m      = re.search(r'lyricTimes:\s*(\[[\d.,\s-]+\])', chunk, re.DOTALL)
    notes_m      = re.search(r'notes:\s*(\[.*?\])', chunk, re.DOTALL)
    melody_m     = re.search(r'melody:\s*(\[.*?\])', chunk, re.DOTALL)
    lyrics_mode  = bool(re.search(r'lyricsMode:\s*true', chunk))
    pitch_false  = bool(re.search(r'pitchGradingReady:\s*false', chunk))

    fvs    = int(fvs_str) if fvs_str else None
    lyrics = json.loads(lyr_m.group(1)) if lyr_m else []
    times  = json.loads(times_m.group(1)) if times_m else []
    try:    notes = json.loads(notes_m.group(1)) if notes_m else []
    except: notes = []
    try:    melody_count = len(json.loads(melody_m.group(1))) if melody_m else 0
    except: melody_count = 0

    # [1] Has vocal audio
    if audio_path:
        audio_fn = audio_path.split("/")[-1]
        a_size   = r2_size(audio_fn)
        chk1_ok  = a_size > 2_000_000
        chk1_lbl = "✅" if chk1_ok else f"❌{a_size//1024}KB"
    else:
        chk1_ok, chk1_lbl, a_size = False, "❌no path", 0

    # [2] Has karaoke (instrumental differs from audio by > 10%)
    if instr_path and instr_path != audio_path:
        instr_fn = instr_path.split("/")[-1]
        i_size   = r2_size(instr_fn)
        if a_size > 0 and i_size > 0:
            diff = abs(a_size - i_size) / max(a_size, i_size)
            chk2_ok  = diff > 0.10
            chk2_lbl = "✅" if chk2_ok else f"❌{diff:.0%}"
        else:
            chk2_ok, chk2_lbl = False, "❌404"
    else:
        chk2_ok, chk2_lbl = False, "❌same"

    # [3] Countdown OK
    if times and fvs is not None:
        expected = max(0, round(times[0]) - 6)
        chk3_ok  = abs(fvs - expected) <= 4
        chk3_lbl = "✅" if chk3_ok else f"❌fvs={fvs}≠{expected}"
    else:
        chk3_ok, chk3_lbl = False, "❌no times"

    # [4] Has bars (lyrics+times populated, timestamps monotonic)
    ts_ok, ts_issue = check_timestamps(lyrics, times)
    chk4_ok  = ts_ok and len(lyrics) >= 10
    chk4_lbl = "✅" if chk4_ok else f"❌{ts_issue if not ts_ok else f'{len(lyrics)}lines'}"

    # [5] Clean notes (lyricsMode songs must have notes: [] or no notes)
    if lyrics_mode:
        chk5_ok  = len(notes) == 0
        chk5_lbl = "✅" if chk5_ok else f"❌{len(notes)}notes"
    else:
        chk5_ok, chk5_lbl = True, "n/a"

    # [6] Has melody (≥ 300 segments for pitch scoring)
    chk6_ok  = melody_count >= 300
    chk6_lbl = "✅" if chk6_ok else f"❌{melody_count}seg"

    # [7] Pitch grading not explicitly disabled
    chk7_ok  = not pitch_false
    chk7_lbl = "✅" if chk7_ok else "❌disabled"

    all_ok = chk1_ok and chk2_ok and chk3_ok and chk4_ok and chk5_ok and chk6_ok and chk7_ok
    if not all_ok:
        failures += 1
    status = "✅ PASS" if all_ok else "❌ FAIL"

    print(f"{sid:<32} {chk1_lbl:>6} {chk2_lbl:>6} {chk3_lbl:>12} {chk4_lbl:>6} {chk5_lbl:>6} {chk6_lbl:>8} {chk7_lbl:>6}  {status}")

print()
print(f"{'All passed ✅' if failures == 0 else f'{failures} song(s) FAILED ❌'}")
if failures > 0:
    sys.exit(1)
