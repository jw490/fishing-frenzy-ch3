#!/usr/bin/env python3
"""
VocalStar song quality gate.

Checks every song in songs.js against three auto-fail rules:
  1. Density > 100%  — voiced duration exceeds track length (wrong/shorter source)
  2. Segments < 300  — too few melody segments (no real vocals)
  3. firstVocalSec > 60% of durationSec — countdown timer is probably wrong

Also checks per-song structure:
  4. instrumentalSrc exists and differs from audioSrc

Usage:
  python3 scripts/quality-check.py              # check all songs
  python3 scripts/quality-check.py qi-li-xiang  # check one song

Exits 0 if all pass, 1 if any fail (blocks deploy).
"""

import json, os, re, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS_JS  = os.path.join(BASE, 'js', 'songs.js')
DATA_DIR  = os.path.join(BASE, 'data', 'songs')

# ── parse songs.js ────────────────────────────────────────────────────────────

def parse_songs(src):
    ids          = re.findall(r"id:\s*'([^']+)'", src)
    durations    = {}
    first_vocals = {}
    audio_srcs   = {}
    instr_srcs   = {}

    for sid in ids:
        m = re.search(r"id:\s*'" + re.escape(sid) + r"'.*?durationSec:\s*(\d+)", src, re.DOTALL)
        durations[sid] = int(m.group(1)) if m else 0

        m = re.search(r"id:\s*'" + re.escape(sid) + r"'.*?firstVocalSec:\s*(\d+)", src, re.DOTALL)
        first_vocals[sid] = int(m.group(1)) if m else None

        m = re.search(r"id:\s*'" + re.escape(sid) + r"'.*?audioSrc:\s*'([^']*)'", src, re.DOTALL)
        audio_srcs[sid] = m.group(1) if m else ''

        m = re.search(r"id:\s*'" + re.escape(sid) + r"'.*?instrumentalSrc:\s*'([^']*)'", src, re.DOTALL)
        instr_srcs[sid] = m.group(1) if m else ''

    return ids, durations, first_vocals, audio_srcs, instr_srcs


def load_melody(sid):
    path = os.path.join(DATA_DIR, f'{sid}.json')
    if not os.path.exists(path):
        return []
    d = json.load(open(path))
    segs = d.get('melody', d) if isinstance(d, dict) else d
    return segs if isinstance(segs, list) else []


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    with open(SONGS_JS) as f:
        src = f.read()

    ids, durations, first_vocals, audio_srcs, instr_srcs = parse_songs(src)

    # optional: filter to a single song
    filter_id = sys.argv[1] if len(sys.argv) > 1 else None
    if filter_id and filter_id not in ids:
        print(f'ERROR: song id "{filter_id}" not found in songs.js')
        sys.exit(1)
    targets = [filter_id] if filter_id else ids

    PASS = '✅'
    FAIL = '❌'

    failures = []
    warnings = []

    header = f"{'ID':<30} {'Dur':>4}  {'fVoc':>5}  {'Segs':>5}  {'Density':>8}  {'Instr':>5}  Status"
    print(header)
    print('─' * len(header))

    for sid in targets:
        dur   = durations.get(sid, 0)
        fvoc  = first_vocals.get(sid)
        audio = audio_srcs.get(sid, '')
        instr = instr_srcs.get(sid, '')
        segs  = load_melody(sid)

        n = len(segs)
        voiced_dur = sum(s.get('dur', 0) for s in segs) if segs else 0
        density = voiced_dur / dur if dur else 0

        issues = []

        # Rule 1: density > 100%
        if density > 1.0:
            issues.append(f'density {density:.0%} > 100% — wrong/shorter source?')

        # Rule 2: segments < 300
        if n < 300:
            issues.append(f'only {n} segments — no real vocals?')

        # Rule 3: firstVocalSec > 60% of duration
        if fvoc is not None and dur > 0 and fvoc > dur * 0.6:
            issues.append(f'firstVocalSec {fvoc}s is {fvoc/dur:.0%} into a {dur}s track')

        # Rule 4: instrumental separate from audio
        instr_ok = instr and audio and instr != audio and 'instrumental' in instr
        if not instr_ok:
            issues.append('instrumentalSrc missing or same as audioSrc')

        status = FAIL if issues else PASS
        density_str = f'{density:.0%}' if dur else '?'
        fvoc_str    = str(fvoc) if fvoc is not None else '?'
        instr_flag  = PASS if instr_ok else FAIL

        print(f'{sid:<30} {dur:>4}s  {fvoc_str:>4}s  {n:>5}  {density_str:>8}  {instr_flag:>5}  {status}')

        if issues:
            for issue in issues:
                print(f'   └─ {issue}')
            failures.append((sid, issues))

    print()
    if failures:
        print(f'FAILED: {len(failures)} song(s) — fix before deploying')
        for sid, issues in failures:
            print(f'  {sid}: {"; ".join(issues)}')
        sys.exit(1)
    else:
        print(f'All {len(targets)} song(s) passed ✅')
        sys.exit(0)


if __name__ == '__main__':
    main()
