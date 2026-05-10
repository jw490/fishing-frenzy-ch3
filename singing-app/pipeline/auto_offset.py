#!/usr/bin/env python3
"""
auto_offset.py — Automatically detect LRC timing offset for a song.

Strategy: forced WhisperX alignment of the first LRC line against a ±15s
search window around the LRC's claimed first-lyric timestamp. The aligner
snaps characters to actual audio — the difference between its output and
the LRC timestamp is the offset we need to apply.

Usage:
  python3 auto_offset.py <audio_file> <lrc_file> [--first-lyric-t FLOAT]

  If --first-lyric-t is omitted, it reads the first timestamp from the LRC.

Output (stdout):
  JSON: { "offset": float, "lrc_first_t": float, "detected_t": float,
          "confidence": "high"|"medium"|"low", "first_line": str }

  offset > 0  → LRC is early  (shift LRC timestamps forward by adding offset)
  offset < 0  → LRC is late   (shift LRC timestamps backward)

  Pass this as the --offset arg to lrc_to_times.py:
    python3 lrc_to_times.py song.lrc <offset> <duration> > out.json

Example:
  python3 auto_offset.py /tmp/qi-li-xiang-mv-audio.mp3 /tmp/lrc/qi-li-xiang.lrc
"""

import sys, json, re, argparse, tempfile, os
import numpy as np
import librosa
import whisperx

SEARCH_BEFORE = 12.0   # seconds before LRC first timestamp to start search
SEARCH_AFTER  = 20.0   # seconds after LRC first timestamp to end search
MIN_CONF      = 0.3    # minimum whisperx char confidence to trust result


def parse_lrc(path):
    """Return list of (time_sec, text) for lyric lines (skips meta/empty)."""
    lines = []
    for raw in open(path, encoding='utf-8', errors='replace'):
        m = re.match(r'\[(\d+):(\d+\.\d+)\](.*)', raw.strip())
        if not m:
            continue
        mins, secs, text = int(m.group(1)), float(m.group(2)), m.group(3).strip()
        # Skip blank lines and metadata
        if not text or any(kw in text for kw in ['作词','作曲','编曲','制作','来自','本站',' - ']):
            continue
        # Skip lines that look like duplicate LRC timestamps embedded in text
        if re.search(r'\[\d+:\d+\.\d+\]', text):
            continue
        lines.append((mins * 60 + secs, text))
    return lines


def extract_audio_slice(y, sr, t_start, t_end, out_path):
    """Extract [t_start, t_end] from y and save as wav."""
    i0 = max(0, int(t_start * sr))
    i1 = min(len(y), int(t_end * sr))
    slice_y = y[i0:i1]
    import soundfile as sf
    sf.write(out_path, slice_y, sr)
    return t_start  # actual start offset in original audio


def run_forced_alignment(audio_path, text_line, device='cpu'):
    """
    Run WhisperX forced alignment on the audio with text_line as the transcript.
    Returns list of char dicts: [{'char': str, 'start': float, 'end': float}, ...]
    Times are relative to the audio file's start (i.e., relative to t_start of slice).
    """
    audio = whisperx.load_audio(audio_path)
    model_a, metadata = whisperx.load_align_model(language_code='zh', device=device)

    # Provide the line as a single segment covering the whole slice
    duration = len(audio) / 16000
    segments = [{'start': 0.0, 'end': duration, 'text': text_line}]

    result = whisperx.align(
        segments, model_a, metadata, audio,
        device=device, return_char_alignments=True
    )
    chars = []
    for seg in result.get('segments', []):
        for c in seg.get('chars', []):
            ch = c.get('char', '').strip()
            t = c.get('start')
            score = c.get('score', 1.0)
            if ch and t is not None:
                chars.append({'char': ch, 'start': float(t), 'score': float(score) if score else 1.0})
    return chars


def detect_offset(audio_path, lrc_path, first_lyric_t_hint=None):
    print(f'[auto_offset] audio: {audio_path}', file=sys.stderr)
    print(f'[auto_offset] lrc:   {lrc_path}', file=sys.stderr)

    # Parse LRC
    lrc_lines = parse_lrc(lrc_path)
    if not lrc_lines:
        return {'error': 'no lyric lines found in LRC', 'offset': 0.0}

    lrc_first_t, first_line_text = lrc_lines[0]
    print(f'[auto_offset] LRC first lyric: {lrc_first_t:.2f}s  "{first_line_text[:20]}"', file=sys.stderr)

    # Load full audio to get sample rate and length
    y, sr = librosa.load(audio_path, sr=None, mono=True)
    total_dur = len(y) / sr
    print(f'[auto_offset] audio duration: {total_dur:.1f}s', file=sys.stderr)

    # Define search window
    t_start = max(0, lrc_first_t - SEARCH_BEFORE)
    t_end   = min(total_dur, lrc_first_t + SEARCH_AFTER)
    print(f'[auto_offset] search window: {t_start:.1f}s → {t_end:.1f}s', file=sys.stderr)

    # Extract slice as temp wav
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
        slice_path = tf.name

    try:
        extract_audio_slice(y, sr, t_start, t_end, slice_path)

        # Run forced alignment on the first lyric line
        # Use up to first 2 lines to give aligner more context
        two_lines = ' '.join(t for _, t in lrc_lines[:2])
        print(f'[auto_offset] aligning: "{two_lines[:40]}"...', file=sys.stderr)

        chars = run_forced_alignment(slice_path, two_lines)
        print(f'[auto_offset] aligned {len(chars)} chars', file=sys.stderr)

        if not chars:
            return {
                'offset': 0.0, 'lrc_first_t': lrc_first_t,
                'detected_t': None, 'confidence': 'low',
                'first_line': first_line_text,
                'note': 'no chars returned from aligner — check audio has vocals'
            }

        # The first char's time is relative to slice start (t_start)
        detected_t_in_slice = chars[0]['start']
        detected_t = t_start + detected_t_in_slice

        # Mean score of first line chars
        n_first_line = len(first_line_text)
        first_chars = chars[:n_first_line]
        mean_score = np.mean([c['score'] for c in first_chars]) if first_chars else 0.0

        offset = detected_t - lrc_first_t

        if mean_score >= 0.7:
            confidence = 'high'
        elif mean_score >= MIN_CONF:
            confidence = 'medium'
        else:
            confidence = 'low'

        print(f'[auto_offset] detected_t={detected_t:.2f}s  lrc_first_t={lrc_first_t:.2f}s', file=sys.stderr)
        print(f'[auto_offset] offset={offset:+.2f}s  confidence={confidence} (score={mean_score:.2f})', file=sys.stderr)

        return {
            'offset': round(offset, 3),
            'lrc_first_t': lrc_first_t,
            'detected_t': round(detected_t, 3),
            'confidence': confidence,
            'mean_score': round(mean_score, 3),
            'first_line': first_line_text,
        }

    finally:
        os.unlink(slice_path)


def main():
    p = argparse.ArgumentParser(description='Auto-detect LRC timing offset')
    p.add_argument('audio_file')
    p.add_argument('lrc_file')
    p.add_argument('--first-lyric-t', type=float, default=None)
    args = p.parse_args()

    result = detect_offset(args.audio_file, args.lrc_file, args.first_lyric_t)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if 'error' not in result:
        offset = result['offset']
        lrc_offset = -offset  # invert for lrc_to_times.py
        print(f'\n→ lrc_to_times.py offset arg: {lrc_offset:+.2f}', file=sys.stderr)
        if abs(offset) < 0.3:
            print('  (within tolerance, no fix needed)', file=sys.stderr)
        else:
            sid = os.path.basename(args.lrc_file).replace('.lrc', '')
            print(f'  Fix: python3 lrc_to_times.py {args.lrc_file} {lrc_offset:.2f} <dur> > /tmp/{sid}.lyrics.json', file=sys.stderr)


if __name__ == '__main__':
    main()
