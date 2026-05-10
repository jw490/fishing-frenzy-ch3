#!/usr/bin/env python3
"""
batch_recalibrate.py — Fully automated LRC offset correction for all songs.

For each song in songs.js with lyricsMode:
  1. Download audio-only from YouTube (fast, ~30s/song) if not already in /tmp
  2. Run auto_offset to detect LRC timing drift
  3. Re-run lrc_to_times.py with the correct offset
  4. Patch songs.js lyrics + lyricTimes
  5. Report results

Run modes:
  python3 batch_recalibrate.py --detect-only   # just detect offsets, don't patch
  python3 batch_recalibrate.py --apply         # detect + patch songs.js
  python3 batch_recalibrate.py --apply --sid qi-li-xiang  # single song

Requires: yt-dlp in PATH, LRC files in /tmp/lrc/<sid>.lrc
Songs missing LRC files are skipped (reported at end).
"""

import sys, os, re, json, subprocess, argparse
sys.path.insert(0, os.path.dirname(__file__))

SONGS_JS  = os.path.join(os.path.dirname(__file__), '../js/songs.js')
LRC_DIR   = '/tmp/lrc'
TMP       = '/tmp'
PIPELINE  = os.path.dirname(__file__)
VENV_PY   = os.path.join(PIPELINE, 'venv/bin/python3')

CONFIDENCE_THRESHOLD = 0.5   # below this → skip auto-apply
OFFSET_THRESHOLD     = 0.25  # offsets smaller than this → no fix needed


def _decode_js_str(s):
    r"""Decode JavaScript \uXXXX unicode escapes to actual characters."""
    return re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)

def parse_songs_js():
    src = open(SONGS_JS).read()
    songs = []
    for m in re.finditer(r"id:\s*'([^']+)'", src):
        sid = m.group(1)
        idx = m.start()
        next_idx = src.find("id: '", idx + 10)
        block = src[idx:next_idx] if next_idx != -1 else src[idx:]
        if 'lyricsMode: true' not in block:
            continue
        dur_m   = re.search(r'durationSec:\s*(\d+)', block)
        title_m = re.search(r"title:\s*'([^']*)'", block)
        artist_m= re.search(r"artist:\s*'([^']*)'", block)
        songs.append({
            'id':     sid,
            'dur':    int(dur_m.group(1)) if dur_m else 0,
            'title':  _decode_js_str(title_m.group(1)) if title_m else sid,
            'artist': _decode_js_str(artist_m.group(1)) if artist_m else '',
        })
    return songs


def find_audio(sid):
    for p in [f'{TMP}/{sid}-mv-audio.mp3', f'{TMP}/{sid}-mv-audio-new.mp3', f'{TMP}/{sid}-audio.mp3']:
        if os.path.exists(p):
            return p
    return None


def download_audio_only(sid, title, artist):
    """Download audio-only from YouTube using a search query. Returns path or None."""
    out_path = f'{TMP}/{sid}-mv-audio.mp3'
    query = f'{title} {artist} official'
    print(f'  Downloading audio-only: {query}')
    cmd = [
        'yt-dlp',
        '-f', 'bestaudio',
        '-x', '--audio-format', 'mp3',
        '--audio-quality', '192K',
        '--no-playlist',
        '-o', out_path,
        f'ytsearch1:{query}',
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if r.returncode == 0 and os.path.exists(out_path):
        size = os.path.getsize(out_path) // 1024
        print(f'  Downloaded: {out_path} ({size}KB)')
        return out_path
    print(f'  Download failed: {r.stderr[-200:]}')
    return None


def run_auto_offset(audio_path, lrc_path):
    r = subprocess.run(
        [VENV_PY, os.path.join(PIPELINE, 'auto_offset.py'), audio_path, lrc_path],
        capture_output=True, text=True, timeout=120
    )
    if r.returncode != 0:
        return None, r.stderr[-300:]
    try:
        result = json.loads(r.stdout)
        return result, r.stderr
    except Exception as e:
        return None, f'JSON parse error: {e}\n{r.stdout[:200]}'


def run_lrc_to_times(lrc_path, offset, duration):
    r = subprocess.run(
        [VENV_PY, os.path.join(PIPELINE, 'lrc_to_times.py'), lrc_path, str(offset), str(duration)],
        capture_output=True, text=True, timeout=30
    )
    if r.returncode != 0:
        return None, r.stderr
    try:
        return json.loads(r.stdout), None
    except Exception as e:
        return None, f'JSON parse error: {e}'


def patch_songs_js(sid, lyrics, times):
    src = open(SONGS_JS).read()

    lyrics_json = json.dumps(lyrics, ensure_ascii=False, separators=(',', ':'))
    times_json  = json.dumps(times, separators=(',', ':'))

    # Replace lyricTimes — use lambda to avoid backslash interpretation in replacement
    pat_times = re.compile(
        r"(id:\s*'" + re.escape(sid) + r"'.*?lyricTimes:\s*)(\[.*?\])", re.DOTALL)
    new_src = pat_times.sub(lambda m: m.group(1) + times_json, src)

    # Replace lyrics
    pat_lyrics = re.compile(
        r"(id:\s*'" + re.escape(sid) + r"'.*?lyrics:\s*)(\[.*?\])", re.DOTALL)
    new_src = pat_lyrics.sub(lambda m: m.group(1) + lyrics_json, new_src)

    if new_src == src:
        return False, 'No change — lyrics/lyricTimes fields not found'

    open(SONGS_JS, 'w').write(new_src)
    return True, None


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--detect-only', action='store_true', help='Detect offsets only, do not patch')
    p.add_argument('--apply',       action='store_true', help='Detect and patch songs.js')
    p.add_argument('--sid',         default=None,        help='Process a single song ID')
    p.add_argument('--skip-download', action='store_true', help='Skip download if audio missing')
    args = p.parse_args()

    if not args.detect_only and not args.apply:
        print('Specify --detect-only or --apply')
        sys.exit(1)

    songs = parse_songs_js()
    if args.sid:
        songs = [s for s in songs if s['id'] == args.sid]
        if not songs:
            print(f'Song {args.sid} not found'); sys.exit(1)

    print(f'Processing {len(songs)} songs\n')

    report = []
    no_lrc  = []
    low_conf= []
    errors  = []

    for s in songs:
        sid  = s['id']
        dur  = s['dur']
        lrc  = os.path.join(LRC_DIR, f'{sid}.lrc')
        print(f'── {sid} ──')

        # Check LRC
        if not os.path.exists(lrc):
            print(f'  SKIP: no LRC at {lrc}')
            no_lrc.append(sid)
            continue

        # Get or download audio
        audio = find_audio(sid)
        if not audio:
            if args.skip_download:
                print(f'  SKIP: no audio in /tmp (--skip-download)')
                errors.append((sid, 'no audio'))
                continue
            audio = download_audio_only(sid, s['title'], s['artist'])
            if not audio:
                errors.append((sid, 'download failed'))
                continue

        # Run auto_offset
        result, log = run_auto_offset(audio, lrc)
        if result is None:
            print(f'  ERROR: {log[:200]}')
            errors.append((sid, 'auto_offset failed'))
            continue

        offset   = result['offset']
        conf     = result.get('confidence', 'low')
        score    = result.get('mean_score', 0)
        first_t  = result.get('lrc_first_t', 0)
        detected = result.get('detected_t', 0)

        sym = '✓' if abs(offset) < OFFSET_THRESHOLD else ('⚠' if abs(offset) < 2.0 else '✗')
        print(f'  {sym}  offset={offset:+.2f}s  [{conf} score={score:.2f}]  lrc={first_t:.2f}s → actual={detected:.2f}s')

        report.append({**s, 'offset': offset, 'confidence': conf, 'score': score,
                        'lrc_first_t': first_t, 'detected_t': detected})

        # Apply if requested
        if not args.apply:
            continue
        if abs(offset) < OFFSET_THRESHOLD:
            print(f'  Within tolerance, no change needed')
            continue
        if score < CONFIDENCE_THRESHOLD:
            print(f'  LOW CONFIDENCE ({score:.2f}) — skipping auto-apply')
            low_conf.append(sid)
            continue

        lrc_offset = -offset  # invert: positive offset means LRC is early → shift times later
        lyrics_data, err = run_lrc_to_times(lrc, lrc_offset, dur)
        if err or not lyrics_data:
            print(f'  lrc_to_times error: {err}')
            errors.append((sid, f'lrc_to_times: {err}'))
            continue

        ok, err = patch_songs_js(sid, lyrics_data['lyrics'], lyrics_data['lyricTimes'])
        if ok:
            print(f'  Patched: {len(lyrics_data["lyricTimes"])} timestamps with offset {lrc_offset:+.2f}s')
        else:
            print(f'  Patch error: {err}')
            errors.append((sid, err))

    # ── Summary ──────────────────────────────────────────────────────
    print('\n' + '═'*60)
    print('SUMMARY')
    print('═'*60)

    needs_fix = [r for r in report if abs(r['offset']) >= OFFSET_THRESHOLD]
    auto_ok   = [r for r in report if abs(r['offset']) < OFFSET_THRESHOLD]

    print(f'  OK (within tolerance):  {len(auto_ok)}')
    print(f'  Needs offset fix:       {len(needs_fix)}')
    print(f'  Low confidence:         {len(low_conf)}')
    print(f'  No LRC:                 {len(no_lrc)}')
    print(f'  Errors:                 {len(errors)}')

    if needs_fix:
        print('\nFix commands (for manual review or --skip-download re-run):')
        for r in needs_fix:
            sid = r['id']
            lrc_offset = -r['offset']
            print(f"  python3 lrc_to_times.py /tmp/lrc/{sid}.lrc {lrc_offset:.2f} {r['dur']} > /tmp/{sid}.lyrics.json")

    if no_lrc:
        print(f'\nNo LRC: {no_lrc}')
    if low_conf:
        print(f'\nLow confidence (manual calibration needed): {low_conf}')
    if errors:
        print(f'\nErrors: {errors}')

    if args.apply and needs_fix:
        print('\n→ songs.js patched. Bump version in index.html, commit, and deploy.')


if __name__ == '__main__':
    main()
