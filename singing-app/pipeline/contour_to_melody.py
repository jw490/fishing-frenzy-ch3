"""
contour_to_melody.py

Convert a pyin f0-contour JSON (from extract_melody.py) into a quantized
`melody[]` array compatible with singing-app/js/songs.js:

    { midi, start, dur }   # short MIDI segments, monotonic by start

This is what game.js grades user pitch against — see game.js `song.melody`
lookup around line 263. Each emitted segment represents a single stable
sung pitch; gaps (silence / held breath / unvoiced) are skipped.

Usage:
    python contour_to_melody.py <contour.json> <output.json> \\
        [--range MIN:MAX] [--min-dur SECONDS] [--merge-gap SECONDS]

Default vocal range MIDI 40..75 covers a typical male pop range (E2..Eb5).
Override with --range 48:84 for soprano, etc.

Strategy:
1. Drop frames where pyin pinned f0 to its fmin/fmax bounds (= no pitch found).
2. Drop frames with effectively-zero voiced_prob.
3. Median-smooth the rounded-MIDI sequence over a small window to kill
   single-frame jitter. We intentionally do NOT octave-fold: pyin is already
   bounded to [fmin, fmax] in the extractor, and --range clamping catches
   whatever outliers slip through. An earlier version folded toward a
   rolling median, but during instrumental intros that median is poisoned
   by noise and drags the real vocal into the wrong octave.
5. Walk through and group consecutive identical-MIDI frames into segments.
6. Drop segments shorter than --min-dur (default 80ms).
7. Merge adjacent segments of the same MIDI separated by a gap shorter
   than --merge-gap (default 60ms).
"""
import argparse
import json
import math
import statistics
from pathlib import Path


FMAX_PIN = 1046.5  # C6 — pyin "no pitch found" upper pin
FMIN_PIN = 65.406  # C2 — pyin lower pin
PIN_TOL_HZ = 1.0   # tolerance for matching the pin values


def hz_to_midi(hz: float) -> float:
    return 69.0 + 12.0 * math.log2(hz / 440.0)


def is_pinned(f0: float) -> bool:
    if f0 is None:
        return True
    return abs(f0 - FMAX_PIN) < PIN_TOL_HZ or abs(f0 - FMIN_PIN) < PIN_TOL_HZ


def median_filter(values, window: int):
    """Median-filter a list of (value_or_None) preserving None entries."""
    half = window // 2
    out = []
    n = len(values)
    for i in range(n):
        if values[i] is None:
            out.append(None)
            continue
        lo = max(0, i - half)
        hi = min(n, i + half + 1)
        window_vals = [v for v in values[lo:hi] if v is not None]
        out.append(statistics.median(window_vals) if window_vals else None)
    return out


def contour_to_melody(
    contour: dict,
    midi_min: int,
    midi_max: int,
    min_dur: float,
    merge_gap: float,
) -> list:
    times = contour["times_sec"]
    f0 = contour["f0_hz"]
    conf = contour["confidence"]
    hop = contour["hop_seconds"]

    # Step 1+2: drop pinned / zero-conf frames; convert survivors to MIDI float.
    midi_float = []
    for hz, c in zip(f0, conf):
        if hz is None or is_pinned(hz) or c < 0.001:
            midi_float.append(None)
            continue
        m = hz_to_midi(hz)
        midi_float.append(m)

    # Step 3: snap to integer MIDI, then median-filter to kill jitter and
    # pyin's octave-halving spikes. pyin occasionally reports f0/2 on sustained
    # voice formants, producing ~100-150ms MIDI-down-12 dropouts. A wide
    # median window (~175ms) removes those while keeping real ornaments.
    rounded = [None if m is None else int(round(m)) for m in midi_float]
    window_frames = max(5, int(round(0.175 / hop)) | 1)  # odd size
    smoothed = median_filter(rounded, window=window_frames)
    smoothed = [None if m is None else int(round(m)) for m in smoothed]

    # Range clamp: drop anything outside the allowed vocal range.
    for i, m in enumerate(smoothed):
        if m is not None and (m < midi_min or m > midi_max):
            smoothed[i] = None

    # Step 5: walk and group consecutive identical-MIDI frames into segments.
    segments = []  # list of {midi, start, end}
    i = 0
    n = len(smoothed)
    while i < n:
        if smoothed[i] is None:
            i += 1
            continue
        j = i + 1
        while j < n and smoothed[j] == smoothed[i]:
            j += 1
        start = times[i]
        end = times[j - 1] + hop
        segments.append({"midi": smoothed[i], "start": start, "end": end})
        i = j

    # Step 6: drop segments shorter than min_dur.
    segments = [s for s in segments if (s["end"] - s["start"]) >= min_dur]

    # Step 6b: drop short "jump" segments — a segment <300ms whose MIDI is
    # >4 semitones from BOTH neighbors is almost certainly a pyin octave-halving
    # spike (voice formant → f0/2), not a real ornament. Real ornaments stay
    # closer than a tritone to their neighbors.
    kept = []
    for i, s in enumerate(segments):
        short = (s["end"] - s["start"]) < 0.30
        prev_m = segments[i - 1]["midi"] if i > 0 else None
        next_m = segments[i + 1]["midi"] if i + 1 < len(segments) else None
        if short and prev_m is not None and next_m is not None:
            if abs(s["midi"] - prev_m) > 4 and abs(s["midi"] - next_m) > 4:
                continue  # drop the blip
        kept.append(s)
    segments = kept

    # Step 7: merge adjacent same-MIDI segments separated by < merge_gap.
    merged = []
    for s in segments:
        if merged and merged[-1]["midi"] == s["midi"] and (s["start"] - merged[-1]["end"]) < merge_gap:
            merged[-1]["end"] = s["end"]
        else:
            merged.append(dict(s))

    # Emit final shape: {midi, start, dur} with durations rounded to 2 decimals.
    melody = []
    for s in merged:
        dur = round(s["end"] - s["start"], 2)
        if dur <= 0:
            continue
        melody.append({
            "midi": int(s["midi"]),
            "start": round(s["start"], 2),
            "dur": dur,
        })
    return melody


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("contour_json", type=Path)
    ap.add_argument("output_json", type=Path)
    ap.add_argument("--range", default="40:75",
                    help="midi_min:midi_max vocal range clamp (default 40:75 — male pop)")
    ap.add_argument("--min-dur", type=float, default=0.08,
                    help="drop segments shorter than this (seconds, default 0.08)")
    ap.add_argument("--merge-gap", type=float, default=0.06,
                    help="merge adjacent same-pitch segments if gap < this (seconds, default 0.06)")
    args = ap.parse_args()

    midi_min, midi_max = [int(x) for x in args.range.split(":")]

    with open(args.contour_json) as f:
        contour = json.load(f)

    melody = contour_to_melody(
        contour,
        midi_min=midi_min,
        midi_max=midi_max,
        min_dur=args.min_dur,
        merge_gap=args.merge_gap,
    )

    # Sanity stats
    durations = [m["dur"] for m in melody]
    midis = [m["midi"] for m in melody]
    print(f"[melody] {len(melody)} segments")
    if melody:
        print(f"[melody] total sung duration: {sum(durations):.1f}s "
              f"(out of {contour['times_sec'][-1]:.1f}s contour)")
        print(f"[melody] segment dur: min={min(durations):.2f}s "
              f"median={statistics.median(durations):.2f}s max={max(durations):.2f}s")
        print(f"[melody] MIDI range: {min(midis)}..{max(midis)} "
              f"median={int(statistics.median(midis))}")

    with open(args.output_json, "w") as f:
        json.dump({"melody": melody}, f, indent=2)
    print(f"[done] wrote {args.output_json}")


if __name__ == "__main__":
    main()
