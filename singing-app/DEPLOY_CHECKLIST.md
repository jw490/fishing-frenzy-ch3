# VocalStar Pre-Deploy Checklist

Go through every applicable section before `vercel deploy --prod`.

---

## 1. Scoring Logic

- [ ] **Silence test**: with mic open but no singing, score stays 0 (or very close)
  - Presence-only path (midi=0): requires confidence >= 0.6
  - MV global frames path: requires confidence >= 0.3
- [ ] **Ambient noise can't max score**: trace the formula — if confidence gate passes, can noise reach 100?
- [ ] **Base score floor**: songs without melody data get `20 + coverage*0.65`. Floor is 20, not 0. Is that intentional?
- [ ] **`_computeLiveScore` vs `getResults()`**: both functions must use the same formula branches. Any change to one must mirror in the other.
- [ ] **MV songs (empty notes)**: `_computeLiveScore` returns 0 until `_mvVoicedFrames > 0`. Final `getResults()` uses frame ratio, not note coverage.

---

## 2. CSS / Hidden States

- [ ] **`[hidden]` on flex/grid elements**: browser default `display: none` is overridden by CSS `display: flex`. Every flex container that can be hidden needs `.class[hidden] { display: none !important; }`.
- [ ] **Initial HUD state**: RANK and SCORE blocks are both `hidden` at page load and game start.
- [ ] **Placeholder text**: rank/score elements contain no visible placeholder text (e.g. `#—`, `0`) in their initial HTML — use empty string or let JS populate.

---

## 3. Countdown

- [ ] **`firstVocalSec` set on every song**: grep `songs.js` for entries missing `firstVocalSec`.
  ```
  grep -c "firstVocalSec" singing-app/js/songs.js
  # should equal number of songs (32)
  ```
- [ ] **Timing makes sense**: `firstVocalSec` is the actual first sung note in the downloaded video, not the original song. These can differ if the karaoke video starts mid-song or has a long/short intro.
- [ ] **Window is long enough**: countdown window is 5.5s. Songs with `firstVocalSec < 6` will show a truncated countdown — verify that's acceptable.
- [ ] **`_countdownDone` resets on game start**: confirm reset in the game reset block.

---

## 4. Karaoke Toggle (`stripVocals`)

- [ ] **Karaoke-source songs have `stripVocals: false`**: songs where `instrumentalSrc === audioSrc` (no Demucs run). Toggle does nothing for these — hiding it is correct.
- [ ] **Demucs songs have `stripVocals: true`**: songs with a real `-mv-instrumental.mp3`.
- [ ] Verify with:
  ```
  grep -A5 "instrumentalSrc" singing-app/js/songs.js | grep -B3 "mv-audio.mp3.*instrumentalSrc\|instrumentalSrc.*mv-audio"
  ```

---

## 5. New Songs

- [ ] `mvSrc`, `audioSrc`, `instrumentalSrc` all point to `/media/` (not `audio/`)
- [ ] `durationSec` set (integer, from ffprobe)
- [ ] `firstVocalSec` set (watch first few seconds of video)
- [ ] `stripVocals` correct (`false` if karaoke source, `true` if Demucs ran)
- [ ] `lyricsMode: true` set for all MV songs
- [ ] `pitchGradingReady: false` set if no melody data
- [ ] JSON file exists at `data/songs/[id].json` (even if empty `{"notes":[],"melody":[]}`)
- [ ] Files uploaded to R2 and accessible: `curl -I https://pub-7b37e1a1b08244c98f1735f2f95ab5f6.r2.dev/[id]-mv.mp4`

---

## 6. HUD Behaviour (trace through code, not just eyeball)

- [ ] Before singing: SCORE hidden, RANK hidden
- [ ] After first voiced frame: SCORE appears with a real number
- [ ] RANK appears only when leaderboard data loaded AND score > 0
- [ ] Score cannot exceed 100 (check `Math.min(100, ...)` clamp)
- [ ] Score cannot go below 0 (check `Math.max(0, ...)` clamp)

---

## 7. Git Hygiene

- [ ] Only intended files staged (`git diff --stat HEAD`)
- [ ] No `.env`, credentials, or large binaries committed
- [ ] Commit message explains WHY, not just what

---

## Quick Grep Commands

```bash
# All songs missing firstVocalSec
grep -c "firstVocalSec" singing-app/js/songs.js
# should equal number of songs (32)

# Songs where instrumentalSrc = audioSrc (karaoke source)
grep -A2 "audioSrc:" singing-app/js/songs.js | grep "instrumentalSrc" | grep "mv-audio"

# Confidence thresholds in game.js
grep "confidence" singing-app/js/game.js | grep -v "//"

# Full firstVocalSec audit — compare JSON first-note vs songs.js value, flag long notes
python3 -c "
import json, os, re
songs_dir = 'singing-app/data/songs'
songs_js = open('singing-app/js/songs.js').read()
fvs = dict(re.findall(r\"id: '([^']+)'.*?firstVocalSec: (\d+)\", songs_js, re.DOTALL))
for fname in sorted(os.listdir(songs_dir)):
    if not fname.endswith('.json'): continue
    sid = fname[:-5]
    notes = json.load(open(f'{songs_dir}/{fname}')).get('notes', [])
    if not notes: print(f'{sid}: EMPTY'); continue
    n0 = notes[0]
    fv = int(fvs.get(sid, -1))
    diff = abs(fv - n0['start'])
    flags = []
    if diff > 3: flags.append(f'DIFF {diff:.0f}s')
    if n0['dur'] > 8: flags.append('LONG_DUR')
    if n0['start'] < 4: flags.append('VERY_EARLY')
    if flags: print(f'⚠ {sid}: firstVocalSec={fv} jsonFirst={n0[\"start\"]:.1f} dur={n0[\"dur\"]:.1f} {flags}')
print('Audit done.')
"
```

### What to look for in the audit
- **DIFF Xs**: `firstVocalSec` and JSON first-note are far apart — verify which is correct by checking the video
- **LONG_DUR**: First note duration > 8s — usually means background/choral intro was captured; the real singing may start at a later note. Check the lyric text: does it match what the user actually sings?
- **VERY_EARLY**: First note < 4s — confirm vocals truly start that early in the downloaded video (not a detection artefact)
