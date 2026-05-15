#!/usr/bin/env python3
"""
strip_songs_js.py — Rewrite songs.js:
  • Remove inline notes[] and melody[] arrays (replaced with empty stubs)
  • Insert durationSec field before each notes: entry

Run from singing-app/:
  python3 pipeline/strip_songs_js.py

Reads:  js/songs.js  +  data/durations.json
Writes: js/songs.js  (in-place, backup saved as js/songs.js.bak)
"""
import json, re, sys, shutil
from pathlib import Path

ROOT = Path(__file__).parent.parent
SONGS_JS  = ROOT / 'js' / 'songs.js'
DURS_JSON = ROOT / 'data' / 'durations.json'

durations = json.loads(DURS_JSON.read_text())

# ── backup ────────────────────────────────────────────────────────────────────
shutil.copy(SONGS_JS, SONGS_JS.with_suffix('.js.bak'))
print(f'Backup: {SONGS_JS}.bak')

src = SONGS_JS.read_text(encoding='utf-8')

# ── helper: find the matching ] for an opening [ at pos ──────────────────────
def find_close(text, open_pos):
    """Given the index of '[', return index of matching ']'."""
    depth = 0
    i = open_pos
    in_str = False
    str_char = None
    while i < len(text):
        ch = text[i]
        if in_str:
            if ch == '\\':
                i += 2
                continue
            if ch == str_char:
                in_str = False
        else:
            if ch in ('"', "'", '`'):
                in_str = True
                str_char = ch
            elif ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1  # unmatched — should never happen

# ── strip a named array key from the source text ─────────────────────────────
def strip_array_key(text, key):
    """Replace all `key: [...]` with `key: []` (skips empty arrays already)."""
    pattern = key + ': ['
    result = []
    i = 0
    replaced = 0
    while i < len(text):
        idx = text.find(pattern, i)
        if idx == -1:
            result.append(text[i:])
            break
        open_pos = idx + len(pattern) - 1  # position of '['
        close_pos = find_close(text, open_pos)
        if close_pos == -1:
            # No matching close — append rest unchanged
            result.append(text[i:])
            break
        content = text[open_pos + 1 : close_pos]
        if content.strip():  # non-empty array
            result.append(text[i:open_pos + 1])
            result.append(']')
            replaced += 1
        else:
            result.append(text[i:close_pos + 1])
        i = close_pos + 1
    print(f'  Stripped {replaced} non-empty `{key}: [...]` blocks')
    return ''.join(result)

# ── insert durationSec before each `      notes: []` line ────────────────────
def insert_duration_sec(text, durations):
    """
    For each song id found in durations, insert
       durationSec: <value>,
    on the line before `      notes: []`.
    We key on id: '<song-id>' then look forward for the next `notes:` line.
    """
    lines = text.split('\n')
    result = []
    inserted = 0
    i = 0
    # Build a reverse map: once we've seen an id, remember it until we insert
    pending_id = None
    pending_dur = None
    while i < len(lines):
        line = lines[i]
        # Detect `id: 'some-id'`
        m = re.match(r"^\s+id:\s+'([^']+)'", line)
        if m:
            song_id = m.group(1)
            if song_id in durations:
                pending_id = song_id
                pending_dur = durations[song_id]
        # Detect the notes line (after stripping it's `      notes: [],`)
        if pending_id and re.match(r'^\s+notes:\s*\[\]', line):
            indent = re.match(r'^(\s+)', line).group(1)
            result.append(f'{indent}durationSec: {pending_dur},')
            inserted += 1
            pending_id = None
            pending_dur = None
        result.append(line)
        i += 1
    print(f'  Inserted {inserted} durationSec fields')
    return '\n'.join(result)

# ── run ───────────────────────────────────────────────────────────────────────
print('Stripping notes[]...')
src = strip_array_key(src, 'notes')
print('Stripping melody[]...')
src = strip_array_key(src, 'melody')
print('Inserting durationSec fields...')
src = insert_duration_sec(src, durations)

SONGS_JS.write_text(src, encoding='utf-8')

from pathlib import Path
new_size = SONGS_JS.stat().st_size
print(f'\n✓ songs.js rewritten — {new_size / 1024:.1f} KB  (was ~763 KB)')
