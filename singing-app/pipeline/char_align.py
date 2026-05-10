#!/usr/bin/env python3
r"""
char_align.py — Per-character WhisperX forced alignment for all lyric lines.

Given an audio file + LRC + offset, for each LRC line:
  1. Extract audio slice [line_start, next_line_start + buffer]
  2. Run WhisperX forced alignment with the line text
  3. Map character timestamps back to absolute audio time
  4. Fall back to linear interpolation for low-confidence lines

Output: JSON matching lrc_to_times.py format:
  { lyrics: [[char,...], ...], lyricTimes: [t,...], lineCount, charCount, offset, fallbacks }

Usage:
  python3 char_align.py <audio_file> <lrc_file> <offset_sec> <duration_sec>

Examples:
  python3 char_align.py /tmp/qi-li-xiang-mv-audio.mp3 /tmp/lrc/qi-li-xiang.lrc 2.5 234 > /tmp/qi-li-xiang.lyrics.json
"""

import sys, json, re, os, tempfile, argparse
import numpy as np
import soundfile as sf
import librosa
import whisperx

# Minimum fraction of chars that need to be aligned for WhisperX result to win
ALIGN_COVERAGE  = 0.5
# Minimum mean char score to trust alignment (vs fallback)
MIN_MEAN_SCORE  = 0.25
# Buffer (seconds) after last LRC line
LAST_LINE_BUF   = 6.0
# Extra buffer after end of line window for WhisperX slice (gives aligner context)
SLICE_TRAIL     = 0.8


def parse_lrc(path):
    r"""Parse LRC file. Returns [(time_sec, text), ...]."""
    lines = []
    for raw in open(path, encoding='utf-8', errors='replace'):
        raw = raw.strip()
        m = re.match(r'\[(\d+):(\d+\.\d+)\](.*)', raw)
        if not m:
            continue
        mins, secs, text = int(m.group(1)), float(m.group(2)), m.group(3).strip()
        # Skip meta / blank / duplicate-timestamp lines
        if not text:
            continue
        # Expanded credit/meta filter — covers standard and non-standard formats
        _credit_kws = [
            '作词', '作曲', '编曲', '本站', '来自', ' - ',
            '制作人', '制作公司', '混音', '母带', '和声', '录音', '策划', '监制',
            '总监制', '出品', '发行', '版权',
            '吉他', '贝斯', '鼓手', '钢琴', '键盘', '弦乐', '大提琴', '古筝', '竹笛',
            'PRODUCER', 'COMPOSER', 'LYRICIST', 'GUITAR', 'MIXING', 'MASTERING',
            '词：', '曲：', '词 :', '曲 :', '编：',
        ]
        if any(kw in text for kw in _credit_kws):
            continue
        if re.search(r'\[\d+:\d+\.\d+\]', text):
            continue
        lines.append((mins * 60 + secs, text))
    return lines


def linear_times(t_start, t_end, n_chars):
    """Distribute n_chars evenly across [t_start, t_end-0.3s]."""
    window = max(t_end - t_start - 0.3, 0.5)
    return [round(t_start + window * k / n_chars, 3) for k in range(n_chars)]


def extract_slice(y, sr, t0, t1):
    """Extract audio samples from y between t0 and t1 seconds."""
    i0 = max(0, int(t0 * sr))
    i1 = min(len(y), int(t1 * sr))
    return y[i0:i1]


def run_align(slice_y, sr, text, model_a, metadata, t_offset, device='cpu'):
    """
    Run WhisperX forced alignment on slice_y for text.
    Returns list of {'char': str, 'start': float (absolute), 'score': float}.
    t_offset is added to convert slice-relative times to absolute times.
    """
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
        slice_path = tf.name
    try:
        sf.write(slice_path, slice_y, sr)
        audio = whisperx.load_audio(slice_path)
        dur   = len(audio) / 16000
        segments = [{'start': 0.0, 'end': dur, 'text': text}]
        result = whisperx.align(
            segments, model_a, metadata, audio,
            device=device, return_char_alignments=True
        )
        out = []
        for seg in result.get('segments', []):
            for c in seg.get('chars', []):
                ch = c.get('char', '').strip()
                t  = c.get('start')
                sc = float(c.get('score') or 0.0)
                if ch and t is not None:
                    out.append({'char': ch, 'start': round(float(t) + t_offset, 3), 'score': sc})
        return out
    finally:
        os.unlink(slice_path)


def match_chars(expected_chars, aligned, t_start, t_end):
    """
    Match expected_chars (list of str) against aligned output.
    Returns list of timestamps aligned to expected_chars, or None if poor match.

    Strategy: walk expected_chars left→right, greedily match against aligned list.
    For gaps (expected char not found in aligned), interpolate.
    """
    n = len(expected_chars)
    if not aligned:
        return None

    # Build map: aligned char → list of (index_in_aligned, time, score)
    # Use greedy forward scan
    times = [None] * n
    ai = 0
    for ci, ch in enumerate(expected_chars):
        # Try to find ch in the next few aligned tokens
        found = False
        for look in range(ai, min(ai + 8, len(aligned))):
            if aligned[look]['char'] == ch:
                times[ci] = aligned[look]['start']
                ai = look + 1
                found = True
                break
        # If not found, leave as None (will interpolate below)

    # Check coverage
    found_count = sum(1 for t in times if t is not None)
    coverage = found_count / n
    if coverage < ALIGN_COVERAGE:
        return None

    # Check mean score of found chars
    scores = [aligned[j]['score']
              for ci, ch in enumerate(expected_chars)
              for j in range(len(aligned))
              if aligned[j]['start'] == times[ci] and times[ci] is not None]
    mean_score = float(np.mean(scores)) if scores else 0.0
    if mean_score < MIN_MEAN_SCORE:
        return None

    # Fill None gaps by linear interpolation between anchors
    # First, fill leading Nones with t_start
    # Last, fill trailing Nones with t_end - 0.3
    anchors = [(i, t) for i, t in enumerate(times) if t is not None]
    if not anchors:
        return None

    # Extend anchors to boundaries
    anchors_extended = [(-1, t_start)] + anchors + [(n, min(t_end - 0.3, anchors[-1][1] + 0.5))]

    result = times[:]
    for k in range(len(anchors_extended) - 1):
        i0, t0 = anchors_extended[k]
        i1, t1 = anchors_extended[k + 1]
        # Interpolate positions i0+1 .. i1-1
        span = i1 - i0
        for pos in range(i0 + 1, i1):
            if result[pos] is None:
                frac = (pos - i0) / span
                result[pos] = round(t0 + frac * (t1 - t0), 3)

    return [t if t is not None else round(t_start, 3) for t in result]


def align_all_lines(lrc_lines, y, sr, offset, total_dur, model_a, metadata,
                    device='cpu', verbose=True):
    """
    Align every LRC line. Returns lyrics_out, times_out, stats.
    """
    lyrics_out    = []
    times_out     = []
    n_aligned     = 0
    n_fallback    = 0

    for i, (t_lrc, text) in enumerate(lrc_lines):
        t_start = t_lrc + offset
        if i + 1 < len(lrc_lines):
            t_end = lrc_lines[i + 1][0] + offset
        else:
            t_end = min(t_start + LAST_LINE_BUF, total_dur - 0.5)

        chars = [c for c in text if not c.isspace()]
        if not chars:
            continue

        if verbose:
            print(f'[char_align] line {i+1:3d}/{len(lrc_lines)}: '
                  f'"{text[:18]:<18}" @ {t_start:.2f}s', file=sys.stderr, end='  ')

        # Extract audio slice (add trail for aligner context)
        slice_y = extract_slice(y, sr, t_start, t_end + SLICE_TRAIL)
        use_fallback = False

        try:
            aligned = run_align(slice_y, sr, text, model_a, metadata,
                                t_offset=t_start, device=device)
            char_times = match_chars(chars, aligned, t_start, t_end)

            if char_times is not None:
                lyrics_out.append(chars)
                times_out.extend(char_times)
                n_aligned += 1
                if verbose:
                    cov = sum(1 for t in char_times if t > t_start) / len(chars)
                    print(f'✓ ({len(aligned)} aligned, cov={cov:.0%})', file=sys.stderr)
            else:
                use_fallback = True
        except Exception as e:
            if verbose:
                print(f'ERROR: {e}', file=sys.stderr)
            use_fallback = True

        if use_fallback:
            if verbose:
                print('→ linear fallback', file=sys.stderr)
            lyrics_out.append(chars)
            times_out.extend(linear_times(t_start, t_end, len(chars)))
            n_fallback += 1

    return lyrics_out, times_out, {'aligned': n_aligned, 'fallback': n_fallback}


def main():
    p = argparse.ArgumentParser(description='Per-character WhisperX alignment for LRC')
    p.add_argument('audio_file')
    p.add_argument('lrc_file')
    p.add_argument('offset_sec',   type=float)
    p.add_argument('duration_sec', type=float)
    p.add_argument('--device', default='cpu', help='cpu or cuda')
    p.add_argument('--lang',   default='zh',  help='WhisperX language code (default: zh)')
    args = p.parse_args()

    lrc_lines = parse_lrc(args.lrc_file)
    print(f'[char_align] {len(lrc_lines)} lyric lines', file=sys.stderr)

    print('[char_align] loading audio...', file=sys.stderr)
    y, sr = librosa.load(args.audio_file, sr=None, mono=True)
    print(f'[char_align] audio loaded: {len(y)/sr:.1f}s @ {sr}Hz', file=sys.stderr)

    print(f'[char_align] loading WhisperX align model (lang={args.lang})...', file=sys.stderr)
    model_a, metadata = whisperx.load_align_model(
        language_code=args.lang, device=args.device
    )

    lyrics_out, times_out, stats = align_all_lines(
        lrc_lines, y, sr,
        offset=args.offset_sec,
        total_dur=args.duration_sec,
        model_a=model_a, metadata=metadata,
        device=args.device, verbose=True
    )

    print(f'\n[char_align] DONE: {len(lyrics_out)} lines, {len(times_out)} chars, '
          f'{stats["aligned"]} aligned, {stats["fallback"]} fallback', file=sys.stderr)

    out = {
        'lyrics':     lyrics_out,
        'lyricTimes': times_out,
        'lineCount':  len(lyrics_out),
        'charCount':  len(times_out),
        'offset':     args.offset_sec,
        'fallbacks':  stats['fallback'],
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
