#!/bin/bash
# run_pipeline_batch.sh — run demucs + pYIN + melody for a batch of songs
# Usage: bash run_pipeline_batch.sh
set -e

PIPELINE_DIR="$(cd "$(dirname "$0")" && pwd)"
AUDIO_DIR="$PIPELINE_DIR/../audio"
STEMS_DIR="$PIPELINE_DIR/stems"
CONTOURS_DIR="$PIPELINE_DIR/contours"
MELODY_DIR="$PIPELINE_DIR/melody_json"
VENV="$PIPELINE_DIR/venv/bin/python3"

mkdir -p "$STEMS_DIR" "$CONTOURS_DIR" "$MELODY_DIR"

run_song() {
  local SRC="$1"
  local ID="$2"
  local RANGE="${3:-40:75}"

  echo ""
  echo "============================================"
  echo "[$ID] starting pipeline"
  echo "============================================"

  # 1. Copy original to audio/ as main track
  cp "$SRC" "$AUDIO_DIR/$ID.mp3"
  echo "[$ID] copied original → audio/$ID.mp3"

  # 2. Extract melody (demucs + pYIN) — demucs caches by stem name
  CONTOUR="$CONTOURS_DIR/$ID.json"
  if [ ! -f "$CONTOUR" ]; then
    "$VENV" "$PIPELINE_DIR/extract_melody.py" "$SRC" "$CONTOUR"
  else
    echo "[$ID] contour already exists, skipping demucs+pYIN"
  fi

  # 3. Convert no_vocals.wav → instrumental mp3
  STEM_NAME="$(basename "$SRC" .mp3)"
  NO_VOCALS_WAV="$STEMS_DIR/htdemucs/$STEM_NAME/no_vocals.wav"
  INST_MP3="$AUDIO_DIR/$ID-instrumental.mp3"
  if [ -f "$NO_VOCALS_WAV" ] && [ ! -f "$INST_MP3" ]; then
    ffmpeg -y -i "$NO_VOCALS_WAV" -codec:a libmp3lame -qscale:a 2 "$INST_MP3" 2>/dev/null
    echo "[$ID] converted no_vocals.wav → audio/$ID-instrumental.mp3"
  fi

  # 4. Convert contour → melody array
  MELODY_JSON="$MELODY_DIR/$ID.json"
  "$VENV" "$PIPELINE_DIR/contour_to_melody.py" "$CONTOUR" "$MELODY_JSON" --range "$RANGE"
  echo "[$ID] melody written to $MELODY_JSON"
  echo "[$ID] DONE"
}

# Female voices: --range 48:84
run_song "/Users/pandaboo/Downloads/梁咏琪 - 胆小鬼 MV.mp3"                                                                     "dan-xiao-gui"            "48:84"
run_song "/Users/pandaboo/Downloads/[avex官方]A-Lin P.S 我愛你 (MV完整版).mp3"                                                  "ps-wo-ai-ni"             "48:84"
run_song "/Users/pandaboo/Downloads/A-Lin忘記擁抱 Forget Love Official Music Video HD - 電影234說愛你主題曲.mp3"                 "wang-ji-yong-bao"        "48:84"

# Male voice (higher register falsetto style): --range 43:79
run_song "/Users/pandaboo/Downloads/盧廣仲-刻在我心底的名字歌詞.mp3"                                                             "ke-zai-wo-xin-di-de-ming-zi" "43:79"
run_song "/Users/pandaboo/Downloads/盧廣仲 Crowd Lu 幾分之幾 You Complete Me Official Music Video 花甲大人轉男孩電影主題曲.mp3"   "ji-fen-zhi-ji"           "43:79"

echo ""
echo "All 5 songs processed."
