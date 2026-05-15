# VocalStar — Standing QA Checklist

Run through this after every deploy. Check each item against production (vocalstar.lol).
Mark ✅ pass / ❌ fail with a one-line note if failing.

---

## 1. App Load
- [ ] Page loads at vocalstar.lol with no JS console errors
- [ ] Song list renders (at least 10 cards visible)
- [ ] Auth state correct (logged-in users see avatar; logged-out see Sign In)

## 2. Song Selection
- [ ] Tapping a song card shows the warmup / countdown screen
- [ ] Song title and artist name display correctly
- [ ] Mic permission prompt fires if not yet granted

## 3. Game Screen — General
- [ ] HUD shows: score, streak, time, mic bars, karaoke button
- [ ] Countdown timer (5-4-3-2-1 GO) fires at correct firstVocalSec
- [ ] Pitch canvas visible and draws (faint grid + playhead line)
- [ ] Mic bars animate when user makes sound
- [ ] Progress bar advances at bottom of canvas

## 4. Game Screen — MV Songs (e.g. 掉了, 身後)
- [ ] Video plays (not black screen)
- [ ] Video is 720p or higher — not blurry on landscape mobile
- [ ] Karaoke ON: video muted, Synth instrumental audible
- [ ] Karaoke OFF: video audio audible, Synth silent
- [ ] Pitch canvas visible below video (has-mv-lyrics songs)
- [ ] Pitch dot / trail appears when singing

## 5. Game Screen — LyricsMode Songs (e.g. 氣質, 七里香)
- [ ] Lyric lines scroll correctly in the canvas
- [ ] Next-line preview shown in lyrics bar
- [ ] Syllable bars appear at correct pitch heights
- [ ] Hit bars turn green when user matches pitch

## 6. Scoring
- [ ] Live score appears on HUD after first sung note (not "—")
- [ ] Streak counter increments on good pitch
- [ ] Grade bombs ("NICE!", "ON FIRE!") fire at streak 5 / 10 / 20

## 7. Song End / Results
- [ ] Tapping × mid-song → results screen (score saved, not lost)
- [ ] Tapping END mid-song → results screen
- [ ] Natural song end → results screen automatically
- [ ] Results screen shows score, pitch accuracy (if melody data), coverage
- [ ] Replay and Back buttons work

## 8. Leaderboard
- [ ] Song leaderboard loads on results screen
- [ ] Live rank shown during game (after first score appears)
- [ ] User's entry saved and visible in leaderboard after game

## 9. Feedback Modal
- [ ] Bug button visible on game and results screens
- [ ] Modal opens, form submits, shows "✓ Sent!" within 10s
- [ ] If network slow: shows timeout error (not stuck on "Sending…")
- [ ] Modal closes correctly (× button and Escape key)

## 10. Mobile (test on 390px portrait + landscape)
- [ ] Song list scrolls smoothly, cards tap correctly
- [ ] Game HUD fits without overflow (no clipping)
- [ ] MV video fills width, no black bars in portrait
- [ ] Canvas visible and not zero-height in landscape
- [ ] Lyrics bar readable (font ≥ 18px)

## 11. Quality Gate (run before every deploy)
```bash
cd singing-app && python3 scripts/quality-check.py
```
- [ ] All songs pass (density ≤ 100%, segments ≥ 300, instrumental separate)

---

## Known Limitations (not bugs — deliberate trade-offs)
- 掉了 / 身後: no notes[] → no next-line lyric preview (lyrics are burned into video)
- Karaoke OFF mode: pitch grading disabled by design (singer's voice bleeds)
- Songs without pitchGradingReady: coverage-only scoring (no pitch %)
