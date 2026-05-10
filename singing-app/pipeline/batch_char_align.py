#!/usr/bin/env python3
r"""
batch_char_align.py — Apply per-character WhisperX alignment to all songs with audio.

For each lyricsMode song in songs.js that has:
  - An LRC file in /tmp/lrc/<sid>.lrc
  - An audio file in /tmp/<sid>-mv-audio.mp3 (or variants)
  - An existing offset already applied (read lyricTimes[0] vs LRC first t)

Runs char_align.py to produce character-level timestamps, then patches songs.js.

Usage:
  python3 batch_char_align.py [--apply] [--sid <song-id>] [--skip-existing]

  --apply         Patch songs.js (default: dry-run only)
  --sid           Process only this song
  --skip-existing Skip songs already showing good char timing (lyricTimes has 200+ entries)
"""

import sys, os, re, json, subprocess, argparse
sys.path.insert(0, os.path.dirname(__file__))

SONGS_JS = os.path.join(os.path.dirname(__file__), '../js/songs.js')
LRC_DIR  = '/tmp/lrc'
TMP      = '/tmp'
PIPELINE = os.path.dirname(__file__)
VENV_PY  = os.path.join(PIPELINE, 'venv/bin/python3')


def _decode_js_str(s):
    r"""Decode JavaScript \uXXXX unicode escapes to actual characters."""
    return re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)


def find_audio(sid):
    for p in [
        f'{TMP}/{sid}-mv-audio.mp3',
        f'{TMP}/{sid}-mv-audio-new.mp3',
        f'{TMP}/{sid}-audio.mp3',
    ]:
        if os.path.exists(p):
            return p
    return None


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
        dur_m    = re.search(r'durationSec:\s*(\d+)', block)
        title_m  = re.search(r"title:\s*'([^']*)'", block)
        artist_m = re.search(r"artist:\s*'([^']*)'", block)
        # Read current offset: the first lyricTimes value
        lt_m     = re.search(r'lyricTimes:\s*\[([0-9.,-]+)', block)
        songs.append({
            'id':     sid,
            'dur':    int(dur_m.group(1)) if dur_m else 0,
            'title':  _decode_js_str(title_m.group(1)) if title_m else sid,
            'artist': _decode_js_str(artist_m.group(1)) if artist_m else '',
            'first_lyric_time': float(lt_m.group(1).split(',')[0]) if lt_m else None,
        })
    return songs


def get_lrc_offset(sid, current_lyric_time, lrc_path):
    """
    Calculate the offset to pass to char_align.py.
    offset = current_lyric_time[0] - lrc_first_timestamp
    (because lrc_to_times already applied the offset by shifting all times)
    """
    # Parse lrc to get first timestamp
    first_t = None
    for raw in open(lrc_path, encoding='utf-8', errors='replace'):
        m = re.match(r'\[(\d+):(\d+\.\d+)\](.*)', raw.strip())
        if not m:
            continue
        text = m.group(3).strip()
        if not text or any(kw in text for kw in ['作词','作曲','编曲','本站','来自',' - ']):
            continue
        if re.search(r'\[\d+:\d+\.\d+\]', text):
            continue
        first_t = int(m.group(1)) * 60 + float(m.group(2))
        break
    if first_t is None or current_lyric_time is None:
        return 0.0
    return round(current_lyric_time - first_t, 3)


def patch_songs_js(sid, lyrics, times):
    """Patch lyrics + lyricTimes in songs.js for song sid."""
    src = open(SONGS_JS).read()

    lyrics_json = json.dumps(lyrics, ensure_ascii=False, separators=(',', ':'))
    times_json  = json.dumps(times, separators=(',', ':'))

    pat_times  = re.compile(
        r"(id:\s*'" + re.escape(sid) + r"'.*?lyricTimes:\s*)(\[.*?\])", re.DOTALL)
    pat_lyrics = re.compile(
        r"(id:\s*'" + re.escape(sid) + r"'.*?lyrics:\s*)(\[.*?\])", re.DOTALL)

    new_src = pat_times.sub(lambda m: m.group(1) + times_json, src)
    new_src = pat_lyrics.sub(lambda m: m.group(1) + lyrics_json, new_src)

    if new_src == src:
        return False, 'No change — fields not found or unchanged'
    open(SONGS_JS, 'w').write(new_src)
    return True, None


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--apply',         action='store_true', help='Patch songs.js')
    p.add_argument('--sid',           default=None,        help='Single song only')
    p.add_argument('--skip-existing', action='store_true', help='Skip songs with many timestamps')
    p.add_argument('--lang',          default='zh',        help='WhisperX language (default: zh)')
    args = p.parse_args()

    songs = parse_songs_js()
    if args.sid:
        songs = [s for s in songs if s['id'] == args.sid]
        if not songs:
            print(f'Song {args.sid!r} not found'); sys.exit(1)

    print(f'Processing {len(songs)} songs\n')

    ok_list    = []
    skip_list  = []
    fail_list  = []

    for s in songs:
        sid  = s['id']
        dur  = s['dur']
        lrc  = os.path.join(LRC_DIR, f'{sid}.lrc')
        audio = find_audio(sid)

        print(f'── {sid} ──')

        if not os.path.exists(lrc):
            print(f'  SKIP: no LRC'); skip_list.append((sid, 'no LRC')); continue
        if not audio:
            print(f'  SKIP: no audio'); skip_list.append((sid, 'no audio')); continue

        # Compute current offset from existing lyricTimes[0]
        current_first_t = s['first_lyric_time']
        offset = get_lrc_offset(sid, current_first_t, lrc)
        print(f'  audio: {os.path.basename(audio)}  offset={offset:+.2f}s  dur={dur}s')

        # Run char_align
        out_path = f'{TMP}/{sid}.lyrics.json'
        cmd = [VENV_PY, os.path.join(PIPELINE, 'char_align.py'),
               audio, lrc, str(offset), str(dur), '--lang', args.lang]
        print(f'  running char_align...')
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

        # Print stderr (progress lines) to our stderr
        for line in r.stderr.splitlines():
            print(f'  {line}', file=sys.stderr)

        if r.returncode != 0:
            print(f'  FAIL: {r.stderr[-200:]}')
            fail_list.append((sid, 'char_align failed'))
            continue

        try:
            # Some library versions print stray text to stdout before the JSON.
            # Find the first '{' and parse from there.
            raw = r.stdout
            brace = raw.find('{')
            if brace > 0:
                raw = raw[brace:]
            data = json.loads(raw)
        except Exception as e:
            print(f'  FAIL: JSON parse error: {e}\n  stdout: {r.stdout[:200]!r}')
            fail_list.append((sid, 'json parse'))
            continue

        n_chars    = data.get('charCount', 0)
        n_lines    = data.get('lineCount', 0)
        n_fallback = data.get('fallbacks', '?')
        print(f'  → {n_lines} lines, {n_chars} chars, {n_fallback} fallbacks')

        # Save output
        with open(out_path, 'w') as f:
            json.dump(data, f, ensure_ascii=False)

        if args.apply:
            ok, err = patch_songs_js(sid, data['lyrics'], data['lyricTimes'])
            if ok:
                print(f'  Patched songs.js ✓')
                ok_list.append(sid)
            else:
                print(f'  Patch error: {err}')
                fail_list.append((sid, err))
        else:
            print(f'  (dry-run, use --apply to patch)')
            ok_list.append(sid)

    print(f'\n{"="*60}')
    print(f'Done: {len(ok_list)} ok, {len(skip_list)} skipped, {len(fail_list)} failed')
    if skip_list:
        print(f'\nSkipped:')
        for sid, reason in skip_list:
            print(f'  {sid}: {reason}')
    if fail_list:
        print(f'\nFailed:')
        for sid, reason in fail_list:
            print(f'  {sid}: {reason}')
    if args.apply and ok_list:
        print('\n→ songs.js patched. Bump version, commit, deploy.')


if __name__ == '__main__':
    main()
