"""
extract_melody.py

Given an input mp3:
1. Run Demucs (htdemucs) to isolate the vocal stem.
2. Run librosa.pyin on the isolated vocal to extract a monophonic f0 contour.
3. Write the result as JSON with fields:
     { sample_rate, hop_seconds, f0_hz, times_sec, confidence }
   f0_hz has NaN (JSON null) where pyin was unvoiced.

Usage:
    python extract_melody.py <input.mp3> <output.json>

This script is committed so the extraction is reproducible if we add new songs.
The resulting JSON is the "real melody" source of truth — per-syllable MIDI
values get derived from it once lyric timings are synced in sync.html.
"""
import argparse
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import librosa
import soundfile as sf


def run_demucs(input_mp3: Path, work_dir: Path) -> Path:
    """Run Demucs htdemucs on the input and return the path to the isolated vocals wav."""
    # htdemucs is the default 4-stem model; we only need vocals.
    cmd = [
        sys.executable, "-m", "demucs.separate",
        "-n", "htdemucs",
        "--two-stems", "vocals",   # only split vocals vs accompaniment
        "-o", str(work_dir),
        str(input_mp3),
    ]
    print(f"[demucs] running: {' '.join(cmd)}", flush=True)
    subprocess.check_call(cmd)
    # Demucs writes to <work_dir>/htdemucs/<stem>/vocals.wav
    stem_name = input_mp3.stem
    vocals_path = work_dir / "htdemucs" / stem_name / "vocals.wav"
    if not vocals_path.exists():
        raise RuntimeError(f"Expected vocals wav at {vocals_path} but not found")
    return vocals_path


def extract_f0(vocals_wav: Path) -> dict:
    """Load the vocal stem and run pyin to get an f0 contour."""
    print(f"[pyin] loading {vocals_wav}", flush=True)
    y, sr = librosa.load(str(vocals_wav), sr=None, mono=True)

    # pyin parameters tuned for singing voice
    fmin = librosa.note_to_hz("C2")   # ~65 Hz — catches low male voice
    fmax = librosa.note_to_hz("C6")   # ~1046 Hz — catches high female voice
    frame_length = 2048
    hop_length = 512  # ~32 ms at 16 kHz, ~11 ms at 44.1 kHz

    print(f"[pyin] running pitch tracking ({len(y)/sr:.1f}s audio, sr={sr})", flush=True)
    f0, voiced_flag, voiced_prob = librosa.pyin(
        y,
        fmin=fmin,
        fmax=fmax,
        sr=sr,
        frame_length=frame_length,
        hop_length=hop_length,
        fill_na=None,  # leave unvoiced as NaN
    )

    times = librosa.times_like(f0, sr=sr, hop_length=hop_length)

    # Convert NaNs to None (JSON nulls)
    f0_list = [None if (f is None or math.isnan(float(f))) else float(f) for f in f0.tolist()]
    conf_list = [float(c) if not math.isnan(float(c)) else 0.0 for c in voiced_prob.tolist()]

    return {
        "sample_rate": int(sr),
        "hop_length": int(hop_length),
        "hop_seconds": float(hop_length / sr),
        "times_sec": [float(t) for t in times.tolist()],
        "f0_hz": f0_list,
        "confidence": conf_list,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_mp3", type=Path)
    ap.add_argument("output_json", type=Path)
    ap.add_argument("--keep-stems", action="store_true",
                    help="Keep the Demucs output directory instead of deleting it.")
    args = ap.parse_args()

    if not args.input_mp3.exists():
        print(f"ERROR: {args.input_mp3} not found", file=sys.stderr)
        sys.exit(1)

    args.output_json.parent.mkdir(parents=True, exist_ok=True)

    # Use a dedicated stems/ dir next to the pipeline script so re-runs are fast
    # (Demucs will reuse the cached separation if it exists).
    stems_root = Path(__file__).parent / "stems"
    stems_root.mkdir(exist_ok=True)

    vocals_wav = run_demucs(args.input_mp3, stems_root)
    print(f"[demucs] isolated vocals at {vocals_wav}", flush=True)

    contour = extract_f0(vocals_wav)
    contour["source_mp3"] = str(args.input_mp3.name)
    contour["vocals_wav"] = str(vocals_wav.relative_to(Path(__file__).parent))

    # Count voiced frames for a sanity check
    voiced = sum(1 for f in contour["f0_hz"] if f is not None)
    total = len(contour["f0_hz"])
    print(f"[pyin] {voiced}/{total} frames voiced ({100*voiced/total:.1f}%)", flush=True)

    with open(args.output_json, "w") as f:
        json.dump(contour, f)
    print(f"[done] wrote {args.output_json} ({os.path.getsize(args.output_json)/1024:.1f} KB)", flush=True)


if __name__ == "__main__":
    main()
