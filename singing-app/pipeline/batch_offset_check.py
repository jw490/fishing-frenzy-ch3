#!/usr/bin/env python3
"""
batch_offset_check.py — Run auto_offset.py across all songs and report.

Reads songs.js, for each song with lyricsMode + lyricTimes:
  1. Checks if audio file exists in /tmp/<sid>-mv-audio.mp3 (or variant)
  2. Checks if LRC file exists in /tmp/lrc/<sid>.lrc
  3. Runs auto_offset.detect_offset()
  4. Reports offset table and generates fix commands for songs that need it

Usage:
  python3 batch_offset_check.py [--apply]   # --apply re-runs lrc_to_times and patches songs.js

Songs missing audio files are flagged for re-download.
"""

import sys, os, re, json, subprocess
sys.path.insert(0, os.path.dirname(__file__))

SONGS_JS  = os.path.join(os.path.dirname(__file__), '../js/songs.js')
LRC_DIR   = '/tmp/lrc'
TMP       = '/tmp'
PIPELINE  = os.path.dirname(__file__)

APPLY = '--apply' in sys.argv


def find_audio(sid):
    """Return path to audio file if it exists locally."""
    candidates = [
        f'{TMP}/{sid}-mv-audio.mp3',
        f'{TMP}/{sid}-mv-audio-new.mp3',
        f'{TMP}/{sid}-audio.mp3',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def parse_songs_js():
    """Extract id + lyricTimes[0] + durationSec for all lyricsMode songs."""
    src = open(SONGS_JS).read()
    songs = []
    for m in re.finditer(r"id:\s*'([^']+)'", src):
        sid = m.group(1)
        idx = m.start()
        next_idx = src.find("id: '", idx + 10)
        block = src[idx:next_idx] if next_idx != -1 else src[idx:]

        if 'lyricsMode: true' not in block:
            continue
        lt_m = re.search(r'lyricTimes:\s*\[([^\]]{1,80})', block)
        dur_m = re.search(r'durationSec:\s*(\d+)', block)
        has_lyrics = 'lyricTimes:' in block
        if not has_lyrics:
            continue
        first_t = float(lt_m.group(1).split(',')[0]) if lt_m else None
        dur = int(dur_m.group(1)) if dur_m else 0
        songs.append({'id': sid, 'first_t': first_t, 'dur': dur})
    return songs


def main():
    from auto_offset import detect_offset

    songs = parse_songs_js()
    print(f'Found {len(songs)} lyricsMode songs\n')

    results = []
    missing_audio = []
    missing_lrc   = []

    for s in songs:
        sid   = s['id']
        audio = find_audio(sid)
        lrc   = os.path.join(LRC_DIR, f'{sid}.lrc')

        if not audio:
            missing_audio.append(sid)
            print(f'[SKIP] {sid:35s}  ⚠️  audio not in /tmp — needs re-download')
            continue
        if not os.path.exists(lrc):
            missing_lrc.append(sid)
            print(f'[SKIP] {sid:35s}  ⚠️  no LRC in {LRC_DIR}')
            continue

        print(f'[RUN]  {sid}...', end=' ', flush=True)
        try:
            r = detect_offset(audio, lrc)
            r['id']  = sid
            r['dur'] = s['dur']
            r['audio'] = audio
            r['lrc']   = lrc
            results.append(r)
            offset = r['offset']
            conf   = r.get('confidence','?')
            sym    = '✓' if abs(offset) < 0.3 else ('⚠' if abs(offset) < 1.5 else '✗')
            print(f'{sym}  offset={offset:+.2f}s  [{conf}]')
        except Exception as e:
            print(f'ERROR: {e}')
            results.append({'id': sid, 'error': str(e), 'offset': 0.0})

    # ── Summary ───────────────────────────────────────────────────
    print('\n' + '─'*70)
    print(f'{"Song ID":<35} {"Offset":>8}  {"Conf":<8}  Status')
    print('─'*70)

    needs_fix = []
    for r in results:
        sid    = r['id']
        offset = r.get('offset', 0)
        conf   = r.get('confidence', '?')
        if 'error' in r:
            print(f'{sid:<35} {"ERROR":>8}  {"":<8}  {r["error"][:30]}')
            continue
        sym = '✓' if abs(offset) < 0.3 else ('⚠' if abs(offset) < 1.5 else '✗')
        print(f'{sid:<35} {offset:>+8.2f}s  {conf:<8}  {sym}')
        if abs(offset) >= 0.3 and conf != 'low':
            needs_fix.append(r)

    print('─'*70)
    print(f'\n{len(needs_fix)} songs need offset correction.')

    if missing_audio:
        print(f'\n⚠️  {len(missing_audio)} songs missing audio in /tmp (need re-download):')
        for sid in missing_audio:
            print(f'   {sid}')

    if missing_lrc:
        print(f'\n⚠️  {len(missing_lrc)} songs missing LRC:')
        for sid in missing_lrc:
            print(f'   {sid}')

    # ── Fix commands ──────────────────────────────────────────────
    if needs_fix:
        print('\n── Fix commands ──────────────────────────────────────────────')
        for r in needs_fix:
            sid = r['id']
            lrc_offset = -r['offset']
            dur = r['dur']
            print(f"python3 {PIPELINE}/lrc_to_times.py {r['lrc']} {lrc_offset:.2f} {dur} > {TMP}/{sid}.lyrics.json")
        print()

    # ── Apply fixes ───────────────────────────────────────────────
    if APPLY and needs_fix:
        print('Applying fixes...')
        from lrc_to_times import lrc_to_lyrics_json
        import importlib.util

        for r in needs_fix:
            sid        = r['id']
            lrc_offset = -r['offset']
            dur        = r['dur']
            out_path   = f'{TMP}/{sid}.lyrics.json'

            ret = subprocess.run(
                [sys.executable, f'{PIPELINE}/lrc_to_times.py',
                 r['lrc'], str(lrc_offset), str(dur)],
                capture_output=True, text=True
            )
            if ret.returncode != 0:
                print(f'  [FAIL] {sid}: {ret.stderr[:100]}')
                continue
            with open(out_path, 'w') as f:
                f.write(ret.stdout)
            print(f'  [OK]  {sid} → {out_path}')

        # Patch songs.js
        print('\nPatching songs.js...')
        src = open(SONGS_JS).read()
        patched = 0
        for r in needs_fix:
            sid = r['id']
            out_path = f'{TMP}/{sid}.lyrics.json'
            if not os.path.exists(out_path):
                continue
            data = json.load(open(out_path))
            lyrics = data['lyrics']
            times  = data['lyricTimes']

            lyrics_json = json.dumps(lyrics, ensure_ascii=False, separators=(',', ':'))
            times_json  = json.dumps(times,  separators=(',', ':'))

            # Replace existing lyricTimes block
            pattern = re.compile(
                r"(id:\s*'" + re.escape(sid) + r"'.*?lyricTimes:\s*)(\[.*?\])",
                re.DOTALL
            )
            new_src = pattern.sub(r'\g<1>' + times_json, src)
            # Also replace lyrics
            pattern2 = re.compile(
                r"(id:\s*'" + re.escape(sid) + r"'.*?lyrics:\s*)(\[.*?\])",
                re.DOTALL
            )
            new_src = pattern2.sub(r'\g<1>' + lyrics_json, new_src)
            if new_src != src:
                src = new_src
                patched += 1
                print(f'  [OK]  {sid} patched')
            else:
                print(f'  [WARN] {sid} no change in songs.js')

        open(SONGS_JS, 'w').write(src)
        print(f'\n{patched} songs patched in songs.js.')
        print('→ Bump songs.js version in index.html, commit, and deploy.')


if __name__ == '__main__':
    main()
