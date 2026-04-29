/* ==========================================
   Song Library
   Each song: { id, title, artist, difficulty, bpm, key, icon, color, notes[] }
   Note: { midi, start (beats), dur (beats), lyric }
   MIDI: 60=C4, 62=D4, 64=E4, 65=F4, 67=G4, 69=A4, 71=B4, 72=C5
   ========================================== */

const Songs = {

  library: [
    {
      id: 'miss-you-3000',
      title: '\u60F3\u898B\u4F60\u60F3\u898B\u4F60\u60F3\u898B\u4F60',
      artist: '\u516B\u4E09\u5941 831',
      difficulty: 'hard',
      bpm: 128,
      key: 'Gb Major',
      icon: '\uD83D\uDC9C',
      color: '#e040fb',
      hasAudioTrack: true,
      audioSrc: '/media/miss-you-3000-mv-audio.mp3',
      instrumentalSrc: '/media/miss-you-3000-mv-instrumental.mp3',
      mvSrc: '/media/miss-you-3000-mv.mp4',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 242,
      notes: [],
      // Extracted vocal melody (Demucs htdemucs vocals + librosa pyin + smoothing,
      // via pipeline/contour_to_melody.py --range 48:76). 695 segments.
      // Used for real pitch-accuracy grading in lyricsMode. Times in seconds. MIDI absolute.
      melody: []
    },

    {
      id: 'zuo-wei',
      title: '\u5EA7\u4F4D',
      artist: '\u4E8E\u51AC\u7136',
      difficulty: 'medium',
      bpm: 80,
      key: 'A Major',
      icon: '\uD83C\uDFB5',
      color: '#00b4a6',
      hasAudioTrack: true,
      audioSrc: '/media/zuo-wei-mv-audio.mp3',
      instrumentalSrc: '/media/zuo-wei-mv-instrumental.mp3',
      mvSrc: '/media/zuo-wei-mv.mp4',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 208,
      notes: [],
      // Extracted vocal melody (Demucs htdemucs stem + librosa pyin,
      // smoothed + octave-error filtered via pipeline/contour_to_melody.py).
      // Used by game.js for real pitch-accuracy grading. Times in seconds,
      // MIDI absolute. Regenerate with:
      //   python pipeline/extract_melody.py audio/zuo-wei.mp3 pipeline/contours/zuo-wei.json
      //   python pipeline/contour_to_melody.py pipeline/contours/zuo-wei.json pipeline/contours/zuo-wei.melody.json
      melody: []
    },
    {
      id: 'gu-dan-bei-ban-qiu',
      title: '孤單北半球',
      artist: 'Ocean Yang',
      difficulty: 'medium',
      bpm: 78,
      key: 'F Major',
      icon: '\uD83C\uDFB5',
      color: '#e91e63',
      hasAudioTrack: true,
      audioSrc: '/media/gu-dan-bei-ban-qiu-mv-audio.mp3',
      instrumentalSrc: '/media/gu-dan-bei-ban-qiu-mv-instrumental.mp3',
      mvSrc: '/media/gu-dan-bei-ban-qiu-mv.mp4',
      stripVocals: true,
      lyricsMode: true,
      melody: [],
      durationSec: 249,
      notes: []
    },
    {
      id: 'bu-neng-shuo',
      title: '不能說的秘密',
      artist: '周杰倫 Jay Chou',
      difficulty: 'hard',
      bpm: 72,
      key: 'G Major',
      icon: '\uD83C\uDFB5',
      color: '#5c6bc0',
      hasAudioTrack: true,
      mvSrc: '/media/bu-neng-shuo-mv.mp4',
      audioSrc: '/media/bu-neng-shuo-mv-audio.mp3',
      instrumentalSrc: '/media/bu-neng-shuo-mv-audio.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 312,
      notes: [],
      melody: []
    },
    {
      id: 'jia-bin',
      title: '嘉賓',
      artist: '張遠 Zhang Yuan',
      difficulty: 'medium',
      bpm: 80,
      key: 'A Major',
      icon: '\uD83C\uDFB5',
      color: '#ff7043',
      hasAudioTrack: true,
      audioSrc: '/media/jia-bin-mv-audio.mp3',
      instrumentalSrc: '/media/jia-bin-mv-instrumental.mp3',
      stripVocals: true,
      mvSrc: '/media/jia-bin-mv.mp4',
      lyricsMode: true,
      durationSec: 333.8,
      notes: [],
      // Extracted vocal melody for pitch grading in lyricsMode.
      melody: []
    },
    {
      id: 'jie-yan',
      title: '戒烟',
      artist: '李榮浩 Ronghao Li',
      difficulty: 'medium',
      bpm: 72,
      key: 'G Major',
      icon: '\uD83C\uDFB5',
      color: '#4fc3f7',
      hasAudioTrack: true,
      mvSrc: '/media/jie-yan-mv.mp4',
      audioSrc: '/media/jie-yan-mv-audio.mp3',
      instrumentalSrc: '/media/jie-yan-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 328,
      notes: [],
      melody: []
    },
    {
      id: 'diu-le-ni',
      title: '丟了你',
      artist: '井朧 Jing Long',
      difficulty: 'hard',
      bpm: 82,
      key: 'F Major',
      icon: '\uD83C\uDFB5',
      color: '#9c27b0',
      hasAudioTrack: true,
      mvSrc: '/media/diu-le-ni-mv.mp4',
      audioSrc: '/media/diu-le-ni-mv-audio.mp3',
      instrumentalSrc: '/media/diu-le-ni-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 268,
      notes: [],
      melody: []
    },
    {
      id: 'tai-yang-yu-di-qiu',
      title: '太陽與地球',
      artist: '盧廣仲 Crowd Lu',
      difficulty: 'easy',
      bpm: 120,
      key: 'G Major',
      icon: '\uD83C\uDFB5',
      color: '#ffb74d',
      hasAudioTrack: true,
      mvSrc: '/media/tai-yang-yu-di-qiu-mv.mp4',
      audioSrc: '/media/tai-yang-yu-di-qiu-mv-audio.mp3',
      instrumentalSrc: '/media/tai-yang-yu-di-qiu-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 262,
      notes: [],
      // Extracted vocal melody for pitch grading (599 segments, MIDI 49-77)
      melody: []
    },

    {
      id: 'kai-shi-dong-le',
      title: '開始懂了',
      artist: '孫燕姿 Sun Yan-Zi',
      difficulty: 'medium',
      bpm: 120,
      key: 'F# Major',
      icon: '\uD83C\uDFB5',
      color: '#e91e63',
      hasAudioTrack: true,
      mvSrc: '/media/kai-shi-dong-le-mv.mp4',
      audioSrc: '/media/kai-shi-dong-le-mv-audio.mp3',
      instrumentalSrc: '/media/kai-shi-dong-le-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 282,
      notes: [],
      melody: []
    },
    {
      id: 'perfect',
      title: 'Perfect',
      artist: 'Ed Sheeran',
      difficulty: 'medium',
      bpm: 95,
      key: 'Ab Major',
      icon: '\uD83C\uDFB6',
      color: '#42a5f5',
      hasAudioTrack: true,
      mvSrc: '/media/perfect-mv.mp4',
      audioSrc: '/media/perfect-mv-audio.mp3',
      instrumentalSrc: '/media/perfect-mv-audio.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 296,
      notes: [],
      melody: []
    },
    {
      id: 'ru-guo-ke-yi',
      title: '如果可以',
      artist: '韋禮安 WeiBird',
      difficulty: 'medium',
      bpm: 75,
      key: 'Eb Major',
      icon: '\uD83C\uDF19',
      color: '#7e57c2',
      hasAudioTrack: true,
      mvSrc: '/media/ru-guo-ke-yi-mv.mp4',
      audioSrc: '/media/ru-guo-ke-yi-mv-audio.mp3',
      instrumentalSrc: '/media/ru-guo-ke-yi-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 275,
      notes: [],
      melody: []
    },
    {
      id: 'lv-guang',
      title: '绿光',
      artist: '孙燕姿 Stefanie Sun',
      difficulty: 'medium',
      bpm: 132,
      key: 'Eb Major',
      icon: '\u2728',
      color: '#66bb6a',
      hasAudioTrack: true,
      mvSrc: '/media/lv-guang-mv.mp4',
      audioSrc: '/media/lv-guang-mv-audio.mp3',
      instrumentalSrc: '/media/lv-guang-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 296,
      notes: [],
      melody: []
    },
    {
      id: 'i-dont-wanna-wait',
      title: "I Don't Wanna Wait",
      artist: 'David Guetta & OneRepublic',
      difficulty: 'easy',
      bpm: 128,
      key: 'Db Major',
      icon: '\u26A1',
      color: '#e53935',
      hasAudioTrack: true,
      mvSrc: '/media/i-dont-wanna-wait-mv.mp4',
      audioSrc: '/media/i-dont-wanna-wait-mv-audio.mp3',
      instrumentalSrc: '/media/i-dont-wanna-wait-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 171,
      notes: [],
      melody: []
    },
    {
      id: 'qi-feng-le',
      title: '起风了',
      artist: '买辣椒也用券',
      difficulty: 'medium',
      bpm: 76,
      key: 'C Major',
      icon: '🍃',
      color: '#78909c',
      hasAudioTrack: true,
      mvSrc: '/media/qi-feng-le-mv.mp4',
      audioSrc: '/media/qi-feng-le-mv-audio.mp3',
      instrumentalSrc: '/media/qi-feng-le-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 316,
      notes: [],
      melody: []
    },
    {
      id: 'love-story',
      title: 'Love Story',
      artist: 'Taylor Swift',
      difficulty: 'medium',
      bpm: 119,
      key: 'D Major',
      icon: '\uD83D\uDC98',
      color: '#ff8fab',
      hasAudioTrack: true,
      mvSrc: '/media/love-story-mv.mp4',
      audioSrc: '/media/love-story-mv-audio.mp3',
      instrumentalSrc: '/media/love-story-mv-audio.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 236,
      notes: [],
      melody: []
    },
    {
      id: 'pu-tong-peng-you',
      title: '普通朋友',
      artist: '陶喆 David Tao',
      difficulty: 'medium',
      bpm: 96,
      key: 'C Major',
      icon: '\uD83D\uDC94',
      color: '#5c6bc0',
      hasAudioTrack: true,
      mvSrc: '/media/pu-tong-peng-you-mv.mp4',
      audioSrc: '/media/pu-tong-peng-you-mv-audio.mp3',
      instrumentalSrc: '/media/pu-tong-peng-you-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 253,
      notes: [],
      melody: []
    },
    {
      id: 'yi-nian',
      title: '\u4E00\u5FF5',
      artist: '\u5F35\u7D2B\u5BE7 & \u674E\u946B\u4E00',
      difficulty: 'medium',
      bpm: 80,
      key: 'D Minor',
      icon: '\uD83C\uDFB5',
      color: '#b87efc',
      hasAudioTrack: true,
      mvSrc: '/media/yi-nian-mv.mp4',
      audioSrc: '/media/yi-nian-mv-audio.mp3',
      instrumentalSrc: '/media/yi-nian-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 106,
      // User-synced lyric timings via sync.html (tap-sync against
      // audio/yi-nian.mp3). 37 lines.
      durationSec: 165.3,
      notes: [],
      // pYIN-extracted melody from audio/yi-nian.mp3 via
      //   pipeline/extract_melody.py + pipeline/contour_to_melody.py
      // 405 segments, MIDI 41..74 (median 63). Used by game.js for pitch grading.
      melody: []
    },

    {
      id: 'xiao-xin-yi-yi',
      title: '\u6211\u5BF9\u7F18\u5206\u5C0F\u5FC3\u7FFC\u7FFC',
      artist: '\u6797\u4FCA\u5091 JJ Lin',
      difficulty: 'medium',
      bpm: 78,
      key: 'F# Major',
      icon: '\uD83C\uDFB5',
      color: '#ffb44b',
      hasAudioTrack: true,
      mvSrc: '/media/xiao-xin-yi-yi-mv.mp4',
      audioSrc: '/media/xiao-xin-yi-yi-mv-audio.mp3',
      instrumentalSrc: '/media/xiao-xin-yi-yi-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 282,
      notes: [],
      // pYIN-extracted melody from audio/xiao-xin-yi-yi.mp3 via
      //   pipeline/extract_melody.py + pipeline/contour_to_melody.py
      // 673 segments, MIDI 46..75 (median 61). Used by game.js for pitch grading.
      melody: []
    },

    {
      id: 'ai-qing-wen-zen-me-zou',
      title: '\u611B\uFF0C\u8ACB\u554F\u600E\u9EBC\u8D70',
      artist: 'A-Lin \u9EC3\u9E97\u73B2',
      difficulty: 'medium',
      bpm: 74,
      key: 'F Major',
      icon: '\uD83C\uDFB5',
      color: '#ff6b9d',
      hasAudioTrack: true,
      mvSrc: '/media/ai-qing-wen-zen-me-zou-mv.mp4',
      audioSrc: '/media/ai-qing-wen-zen-me-zou-mv-audio.mp3',
      instrumentalSrc: '/media/ai-qing-wen-zen-me-zou-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 265,
      notes: [],
      // pYIN-extracted melody: 775 segments, MIDI 47..74 (median 65).
      melody: []
    },

    {
      id: 'you-yi-zhong-bei-shang',
      title: '\u6709\u4E00\u7A2E\u60B2\u50B7',
      artist: 'A-Lin \u9EC3\u9E97\u73B2',
      difficulty: 'medium',
      bpm: 80,
      key: 'E Minor',
      icon: '\uD83C\uDFB5',
      color: '#7b9eff',
      hasAudioTrack: true,
      mvSrc: '/media/you-yi-zhong-bei-shang-mv.mp4',
      audioSrc: '/media/you-yi-zhong-bei-shang-mv-audio.mp3',
      instrumentalSrc: '/media/you-yi-zhong-bei-shang-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 242,
      notes: [],
      // pYIN-extracted melody: 441 segments, MIDI 49..75 (median 67).
      melody: []
    },

    {
      id: 'yu-die',
      title: '\u96E8\u8776',
      artist: '\u674E\u7FCA\u541B',
      difficulty: 'medium',
      bpm: 72,
      key: 'Bb Minor',
      icon: '\uD83C\uDFB5',
      color: '#a855f7',
      hasAudioTrack: true,
      mvSrc: '/media/yu-die-mv.mp4',
      audioSrc: '/media/yu-die-mv-audio.mp3',
      instrumentalSrc: '/media/yu-die-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 228,
      notes: [],
      // pYIN-extracted melody: 534 segments, MIDI 50..74 (median 64).
      melody: []
    },

    {
      id: 'dan-xiao-gui',
      title: '胆小鬼',
      artist: '梁咏琪 Gigi Leung',
      difficulty: 'medium',
      bpm: 80,
      key: 'G Major',
      icon: '🎵',
      color: '#f59e0b',
      hasAudioTrack: true,
      mvSrc: '/media/dan-xiao-gui-mv.mp4',
      audioSrc: '/media/dan-xiao-gui-mv-audio.mp3',
      instrumentalSrc: '/media/dan-xiao-gui-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 256,
      notes: [],
      // pYIN-extracted melody: 522 segments, MIDI 49..72 (median 63).
      melody: []
    },

    {
      id: 'ps-wo-ai-ni',
      title: 'P.S. 我愛你',
      artist: 'A-Lin 黃麗玲',
      difficulty: 'medium',
      bpm: 76,
      key: 'Ab Major',
      icon: '🎵',
      color: '#ec4899',
      hasAudioTrack: true,
      mvSrc: '/media/ps-wo-ai-ni-mv.mp4',
      audioSrc: '/media/ps-wo-ai-ni-mv-audio.mp3',
      instrumentalSrc: '/media/ps-wo-ai-ni-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 256,
      notes: [],
      // pYIN-extracted melody: 598 segments, MIDI 48..82 (median 65).
      melody: []
    },

    {
      id: 'wang-ji-yong-bao',
      title: '忘記擁抱',
      artist: 'A-Lin 黃麗玲',
      difficulty: 'medium',
      bpm: 91,
      key: 'E Major',
      icon: '🎵',
      color: '#10b981',
      hasAudioTrack: true,
      mvSrc: '/media/wang-ji-yong-bao-mv.mp4',
      audioSrc: '/media/wang-ji-yong-bao-mv-audio.mp3',
      instrumentalSrc: '/media/wang-ji-yong-bao-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 282,
      notes: [],
      // pYIN-extracted melody: 642 segments, MIDI 52..83 (median 66).
      melody: []
    },

    {
      id: 'ke-zai-wo-xin-di-de-ming-zi',
      title: '刻在我心底的名字',
      artist: '盧廣仲 Crowd Lu',
      difficulty: 'hard',
      bpm: 66,
      key: 'F Major',
      icon: '🎵',
      color: '#6366f1',
      hasAudioTrack: true,
      mvSrc: '/media/ke-zai-wo-xin-di-de-ming-zi-mv.mp4',
      audioSrc: '/media/ke-zai-wo-xin-di-de-ming-zi-mv-audio.mp3',
      instrumentalSrc: '/media/ke-zai-wo-xin-di-de-ming-zi-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 317,
      notes: [],
      // pYIN-extracted melody: 734 segments, MIDI 43..77 (median 60).
      melody: []
    },

    {
      id: 'ji-fen-zhi-ji',
      title: '幾分之幾',
      artist: '盧廣仲 Crowd Lu',
      difficulty: 'medium',
      bpm: 72,
      key: 'Db Major',
      icon: '🎵',
      color: '#8b5cf6',
      hasAudioTrack: true,
      mvSrc: '/media/ji-fen-zhi-ji-mv.mp4',
      audioSrc: '/media/ji-fen-zhi-ji-mv-audio.mp3',
      instrumentalSrc: '/media/ji-fen-zhi-ji-mv-instrumental.mp3',
      stripVocals: true,
      lyricsMode: true,
      durationSec: 231,
      notes: [],
      // pYIN-extracted melody: 529 segments, MIDI 43..79 (median 61).
      melody: []
    },

    {
      id: 'beautiful-things',
      title: 'Beautiful Things',
      artist: 'Benson Boone',
      difficulty: 'medium',
      bpm: 120,
      key: 'C Major',
      icon: '🎵',
      color: '#f59e0b',
      hasAudioTrack: true,
      mvSrc: '/media/beautiful-things-mv.mp4',
      audioSrc: '/media/beautiful-things-mv-audio.mp3',
      instrumentalSrc: '/media/beautiful-things-mv-audio.mp3',
      stripVocals: true,
      hasMelodyData: false,
      pitchGradingReady: false,
      lyricsMode: true,
      durationSec: 193,
      notes: [],
      melody: []
    },

    {
      id: 'espresso',
      title: 'Espresso',
      artist: 'Sabrina Carpenter',
      difficulty: 'easy',
      bpm: 104,
      key: 'E Major',
      icon: '🎵',
      color: '#ec4899',
      hasAudioTrack: true,
      mvSrc: '/media/espresso-mv.mp4',
      audioSrc: '/media/espresso-mv-audio.mp3',
      instrumentalSrc: '/media/espresso-mv-audio.mp3',
      stripVocals: true,
      hasMelodyData: false,
      pitchGradingReady: false,
      lyricsMode: true,
      durationSec: 189,
      notes: [],
      melody: []
    },

    {
      id: 'qi-li-xiang',
      title: '七里香',
      artist: '周杰倫 Jay Chou',
      difficulty: 'medium',
      bpm: 76,
      key: 'F Major',
      icon: '🎵',
      color: '#10b981',
      hasAudioTrack: true,
      mvSrc: '/media/qi-li-xiang-mv.mp4',
      audioSrc: '/media/qi-li-xiang-mv-audio.mp3',
      instrumentalSrc: '/media/qi-li-xiang-mv-instrumental.mp3',
      stripVocals: true,
      hasMelodyData: false,
      pitchGradingReady: false,
      lyricsMode: true,
      durationSec: 300,
      notes: [],
      melody: []
    },

    {
      id: 'ai-de-jiu-shi-ni',
      title: '愛的就是你',
      artist: '王力宏 Leehom Wang',
      difficulty: 'medium',
      bpm: 92,
      key: 'G Major',
      icon: '🎵',
      color: '#3b82f6',
      hasAudioTrack: true,
      audioSrc: 'audio/ai-de-jiu-shi-ni.mp3',
      hasMelodyData: false,
      pitchGradingReady: false,
      lyricsMode: true,
      durationSec: 285.4,
      notes: [],
      melody: []
    },
  ],

  // Helper: convert beats to seconds
  beatsToSec(beats, bpm) {
    return (beats / bpm) * 60;
  },

  // Get a song by id
  get(id) {
    return this.library.find(s => s.id === id);
  },

  // Get song duration in seconds.
  // Uses durationSec metadata when available (set at build time from last note),
  // falling back to live derivation once song data is loaded.
  getDuration(song) {
    if (song.durationSec != null) return song.durationSec;
    const lastNote = song.notes[song.notes.length - 1];
    if (!lastNote) return 0;
    if (song.lyricsMode || song.notesInSeconds) {
      return lastNote.start + lastNote.dur;
    }
    return this.beatsToSec(lastNote.start + lastNote.dur, song.bpm);
  },

  // Lazy-load per-song notes + melody from /data/songs/{id}.json.
  // No-op if already loaded. Called by App.selectSong() before game start.
  async loadData(songId) {
    const song = this.get(songId);
    if (!song || song._dataLoaded) return;
    try {
      const resp = await fetch(`/data/songs/${songId}.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      song.notes  = data.notes  || [];
      song.melody = data.melody || [];
      song._dataLoaded = true;
    } catch (e) {
      console.warn(`[Songs] Failed to load data for ${songId}:`, e);
      // Degrade gracefully — timing-only mode still works with empty notes.
      song._dataLoaded = true;
    }
  },

  // Get notes converted to seconds
  getNotesInSeconds(song) {
    if (song.lyricsMode || song.notesInSeconds) {
      // Already in seconds — just add freq and name
      return song.notes.map(n => ({
        midi: n.midi,
        start: n.start,
        dur: n.dur,
        lyric: n.lyric,
        octaveShift: n.octaveShift,
        freq: this.midiToFreq(n.midi || 0),
        name: this.midiToName(n.midi || 0)
      }));
    }
    return song.notes.map(n => ({
      midi: n.midi,
      start: this.beatsToSec(n.start, song.bpm),
      dur: this.beatsToSec(n.dur, song.bpm),
      lyric: n.lyric,
      octaveShift: n.octaveShift,
      freq: this.midiToFreq(n.midi),
      name: this.midiToName(n.midi)
    }));
  },

  // MIDI to frequency
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  // MIDI to note name
  midiToName(midi) {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const note = names[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return note + octave;
  },

  // Frequency to MIDI (float)
  freqToMidi(freq) {
    return 69 + 12 * Math.log2(freq / 440);
  },

  // Frequency to note name
  freqToName(freq) {
    if (freq <= 0) return '--';
    const midi = Math.round(this.freqToMidi(freq));
    return this.midiToName(midi);
  },

  // Frequency to cents offset from nearest note
  freqToCents(freq) {
    if (freq <= 0) return 0;
    const midi = this.freqToMidi(freq);
    const nearestMidi = Math.round(midi);
    return (midi - nearestMidi) * 100;
  }
};
