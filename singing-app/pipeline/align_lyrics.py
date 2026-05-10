#!/usr/bin/env python3
"""
align_lyrics.py — Generate character-level lyric timestamps using WhisperX forced alignment.

Usage:
  python3 align_lyrics.py <song_id> <audio_file> <lyrics_file>

  <lyrics_file>: plain text, one lyric line per line, Chinese characters only
                 (no spaces, no punctuation except line breaks)

Output:
  Prints JSON to stdout with 'lyrics' (lines of chars) and 'lyricTimes' (flat start times).
  Redirect to /tmp/<song_id>.lyrics.json

Example:
  python3 align_lyrics.py qi-li-xiang /tmp/qi-li-xiang-vocals.wav /tmp/qi-li-xiang.txt
"""

import sys, json, re, whisperx

def clean_line(line):
    """Strip whitespace, keep only Chinese characters and common punctuation."""
    line = line.strip()
    # Remove spaces between characters
    line = re.sub(r'\s+', '', line)
    # Remove empty lines
    return line

def load_lyrics(path):
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    return [clean_line(l) for l in lines if clean_line(l)]

def estimate_segments(lines, total_duration, first_vocal_sec=0):
    """
    Build rough time segments for each lyric line so the aligner has a
    reasonable search window. We distribute lines evenly across the vocal
    section — alignment will snap to the actual audio regardless.
    """
    total_chars = sum(len(l) for l in lines)
    segments = []
    cursor = first_vocal_sec
    vocal_duration = total_duration - first_vocal_sec

    for line in lines:
        frac = len(line) / total_chars if total_chars > 0 else 1 / len(lines)
        dur = frac * vocal_duration
        segments.append({
            'start': cursor,
            'end': min(cursor + dur, total_duration - 0.5),
            'text': line,
        })
        cursor += dur

    return segments

def run_alignment(audio_path, segments):
    audio = whisperx.load_audio(audio_path)
    model_a, metadata = whisperx.load_align_model(language_code='zh', device='cpu')
    result = whisperx.align(
        segments, model_a, metadata, audio,
        device='cpu', return_char_alignments=True
    )
    return result

def build_output(result, lines):
    """
    Map aligned chars back to the original lyric lines.
    Returns lyrics (array of char arrays) and lyricTimes (flat float array).
    """
    # Collect all char timestamps from alignment
    char_entries = []
    for seg in result['segments']:
        for c in seg.get('chars', []):
            ch = c.get('char', '').strip()
            t = c.get('start')
            if ch and t is not None:
                char_entries.append((t, ch))

    if not char_entries:
        print('[ERROR] No char alignments returned — check audio and lyrics match', file=sys.stderr)
        sys.exit(1)

    # Distribute char_entries back into lines
    # (alignment may have shifted chars; we trust line lengths from original lyrics)
    lyrics_out = []
    times_out = []
    idx = 0

    for line in lines:
        line_chars = list(line)
        line_times = []
        line_out = []
        for ch in line_chars:
            if idx < len(char_entries):
                t, aligned_ch = char_entries[idx]
                line_out.append(aligned_ch)
                line_times.append(round(t, 3))
                idx += 1
            else:
                # Ran out of aligned chars — append with last known time
                last_t = times_out[-1] if times_out else (line_times[-1] if line_times else 0)
                line_out.append(ch)
                line_times.append(round(last_t + 0.3, 3))
        lyrics_out.append(line_out)
        times_out.extend(line_times)

    return lyrics_out, times_out

def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)

    song_id   = sys.argv[1]
    audio_path = sys.argv[2]
    lyrics_path = sys.argv[3]
    first_vocal = float(sys.argv[4]) if len(sys.argv) > 4 else 0

    print(f'[align_lyrics] {song_id}', file=sys.stderr)
    print(f'  audio:  {audio_path}', file=sys.stderr)
    print(f'  lyrics: {lyrics_path}', file=sys.stderr)

    lines = load_lyrics(lyrics_path)
    print(f'  lines: {len(lines)}, total chars: {sum(len(l) for l in lines)}', file=sys.stderr)

    # Get audio duration
    import librosa
    y, sr = librosa.load(audio_path, sr=None, mono=True)
    total_duration = len(y) / sr
    print(f'  duration: {total_duration:.1f}s', file=sys.stderr)

    segments = estimate_segments(lines, total_duration, first_vocal)
    print(f'  running alignment...', file=sys.stderr)

    result = run_alignment(audio_path, segments)

    lyrics_out, times_out = build_output(result, lines)

    output = {
        'song_id': song_id,
        'lyrics': lyrics_out,
        'lyricTimes': times_out,
        'lineCount': len(lyrics_out),
        'charCount': len(times_out),
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))
    print(f'  done: {len(lyrics_out)} lines, {len(times_out)} chars', file=sys.stderr)

if __name__ == '__main__':
    main()
