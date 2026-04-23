/* ==========================================
   Song Library
   Each song: { id, title, artist, difficulty, bpm, key, icon, color, notes[] }
   Note: { midi, start (beats), dur (beats), lyric }
   MIDI: 60=C4, 62=D4, 64=E4, 65=F4, 67=G4, 69=A4, 71=B4, 72=C5
   ========================================== */

const Songs = {

  library: [
    {
      id: 'twinkle',
      title: 'Twinkle Twinkle Little Star',
      artist: 'Traditional',
      difficulty: 'easy',
      bpm: 100,
      key: 'C Major',
      icon: '\u2B50',
      color: '#7b2fff',
      notes: [
        // Line 1: Twinkle twinkle little star
        { midi: 60, start: 0, dur: 1, lyric: 'Twin-' },
        { midi: 60, start: 1, dur: 1, lyric: 'kle ' },
        { midi: 67, start: 2, dur: 1, lyric: 'twin-' },
        { midi: 67, start: 3, dur: 1, lyric: 'kle ' },
        { midi: 69, start: 4, dur: 1, lyric: 'lit-' },
        { midi: 69, start: 5, dur: 1, lyric: 'tle ' },
        { midi: 67, start: 6, dur: 2, lyric: 'star, ' },
        // Line 2: How I wonder what you are
        { midi: 65, start: 8, dur: 1, lyric: 'How ' },
        { midi: 65, start: 9, dur: 1, lyric: 'I ' },
        { midi: 64, start: 10, dur: 1, lyric: 'won-' },
        { midi: 64, start: 11, dur: 1, lyric: 'der ' },
        { midi: 62, start: 12, dur: 1, lyric: 'what ' },
        { midi: 62, start: 13, dur: 1, lyric: 'you ' },
        { midi: 60, start: 14, dur: 2, lyric: 'are. ' },
        // Line 3: Up above the world so high
        { midi: 67, start: 16, dur: 1, lyric: 'Up ' },
        { midi: 67, start: 17, dur: 1, lyric: 'a-' },
        { midi: 65, start: 18, dur: 1, lyric: 'bove ' },
        { midi: 65, start: 19, dur: 1, lyric: 'the ' },
        { midi: 64, start: 20, dur: 1, lyric: 'world ' },
        { midi: 64, start: 21, dur: 1, lyric: 'so ' },
        { midi: 62, start: 22, dur: 2, lyric: 'high, ' },
        // Line 4: Like a diamond in the sky
        { midi: 67, start: 24, dur: 1, lyric: 'Like ' },
        { midi: 67, start: 25, dur: 1, lyric: 'a ' },
        { midi: 65, start: 26, dur: 1, lyric: 'dia-' },
        { midi: 65, start: 27, dur: 1, lyric: 'mond ' },
        { midi: 64, start: 28, dur: 1, lyric: 'in ' },
        { midi: 64, start: 29, dur: 1, lyric: 'the ' },
        { midi: 62, start: 30, dur: 2, lyric: 'sky. ' },
        // Line 5: Twinkle twinkle little star (repeat)
        { midi: 60, start: 32, dur: 1, lyric: 'Twin-' },
        { midi: 60, start: 33, dur: 1, lyric: 'kle ' },
        { midi: 67, start: 34, dur: 1, lyric: 'twin-' },
        { midi: 67, start: 35, dur: 1, lyric: 'kle ' },
        { midi: 69, start: 36, dur: 1, lyric: 'lit-' },
        { midi: 69, start: 37, dur: 1, lyric: 'tle ' },
        { midi: 67, start: 38, dur: 2, lyric: 'star, ' },
        // Line 6: How I wonder what you are
        { midi: 65, start: 40, dur: 1, lyric: 'How ' },
        { midi: 65, start: 41, dur: 1, lyric: 'I ' },
        { midi: 64, start: 42, dur: 1, lyric: 'won-' },
        { midi: 64, start: 43, dur: 1, lyric: 'der ' },
        { midi: 62, start: 44, dur: 1, lyric: 'what ' },
        { midi: 62, start: 45, dur: 1, lyric: 'you ' },
        { midi: 60, start: 46, dur: 2, lyric: 'are.' },
      ]
    },

    {
      id: 'ode-to-joy',
      title: 'Ode to Joy',
      artist: 'Beethoven',
      difficulty: 'easy',
      bpm: 108,
      key: 'C Major',
      icon: '\uD83C\uDFB5',
      color: '#00d4ff',
      notes: [
        // Line 1
        { midi: 64, start: 0, dur: 1, lyric: 'Joy-' },
        { midi: 64, start: 1, dur: 1, lyric: 'ful, ' },
        { midi: 65, start: 2, dur: 1, lyric: 'joy-' },
        { midi: 67, start: 3, dur: 1, lyric: 'ful, ' },
        { midi: 67, start: 4, dur: 1, lyric: 'we ' },
        { midi: 65, start: 5, dur: 1, lyric: 'a-' },
        { midi: 64, start: 6, dur: 1, lyric: 'dore ' },
        { midi: 62, start: 7, dur: 1, lyric: 'thee, ' },
        // Line 2
        { midi: 60, start: 8, dur: 1, lyric: 'God ' },
        { midi: 60, start: 9, dur: 1, lyric: 'of ' },
        { midi: 62, start: 10, dur: 1, lyric: 'glad-' },
        { midi: 64, start: 11, dur: 1, lyric: 'ness, ' },
        { midi: 64, start: 12, dur: 1.5, lyric: 'Lord ' },
        { midi: 62, start: 13.5, dur: 0.5, lyric: 'of ' },
        { midi: 62, start: 14, dur: 2, lyric: 'love; ' },
        // Line 3
        { midi: 64, start: 16, dur: 1, lyric: 'Hearts ' },
        { midi: 64, start: 17, dur: 1, lyric: 'un-' },
        { midi: 65, start: 18, dur: 1, lyric: 'fold ' },
        { midi: 67, start: 19, dur: 1, lyric: 'like ' },
        { midi: 67, start: 20, dur: 1, lyric: 'flow-' },
        { midi: 65, start: 21, dur: 1, lyric: 'ers ' },
        { midi: 64, start: 22, dur: 1, lyric: 'be-' },
        { midi: 62, start: 23, dur: 1, lyric: 'fore ' },
        // Line 4
        { midi: 60, start: 24, dur: 1, lyric: 'thee, ' },
        { midi: 60, start: 25, dur: 1, lyric: 'o-' },
        { midi: 62, start: 26, dur: 1, lyric: 'p\'ning ' },
        { midi: 64, start: 27, dur: 1, lyric: 'to ' },
        { midi: 62, start: 28, dur: 1.5, lyric: 'the ' },
        { midi: 60, start: 29.5, dur: 0.5, lyric: 'sun ' },
        { midi: 60, start: 30, dur: 2, lyric: 'above. ' },
        // B section
        { midi: 62, start: 32, dur: 1, lyric: 'Melt ' },
        { midi: 62, start: 33, dur: 1, lyric: 'the ' },
        { midi: 64, start: 34, dur: 1, lyric: 'clouds ' },
        { midi: 60, start: 35, dur: 1, lyric: 'of ' },
        { midi: 62, start: 36, dur: 0.5, lyric: 'sin ' },
        { midi: 64, start: 36.5, dur: 0.5, lyric: 'and ' },
        { midi: 65, start: 37, dur: 0.5, lyric: 'sad-' },
        { midi: 64, start: 37.5, dur: 0.5, lyric: 'ness; ' },
        { midi: 60, start: 38, dur: 1, lyric: 'drive ' },
        { midi: 62, start: 39, dur: 0.5, lyric: 'the ' },
        { midi: 64, start: 39.5, dur: 0.5, lyric: 'dark ' },
        { midi: 65, start: 40, dur: 0.5, lyric: 'of ' },
        { midi: 64, start: 40.5, dur: 0.5, lyric: 'doubt ' },
        { midi: 62, start: 41, dur: 1, lyric: 'a-' },
        { midi: 60, start: 42, dur: 1, lyric: 'way; ' },
        { midi: 62, start: 43, dur: 1, lyric: '' },
        // Final line
        { midi: 64, start: 44, dur: 1, lyric: 'Giv-' },
        { midi: 64, start: 45, dur: 1, lyric: 'er ' },
        { midi: 65, start: 46, dur: 1, lyric: 'of ' },
        { midi: 67, start: 47, dur: 1, lyric: 'im-' },
        { midi: 67, start: 48, dur: 1, lyric: 'mor-' },
        { midi: 65, start: 49, dur: 1, lyric: 'tal ' },
        { midi: 64, start: 50, dur: 1, lyric: 'glad-' },
        { midi: 62, start: 51, dur: 1, lyric: 'ness, ' },
        { midi: 60, start: 52, dur: 1, lyric: 'Fill ' },
        { midi: 60, start: 53, dur: 1, lyric: 'us ' },
        { midi: 62, start: 54, dur: 1, lyric: 'with ' },
        { midi: 64, start: 55, dur: 1, lyric: 'the ' },
        { midi: 62, start: 56, dur: 1.5, lyric: 'light ' },
        { midi: 60, start: 57.5, dur: 0.5, lyric: 'of ' },
        { midi: 60, start: 58, dur: 2, lyric: 'day!' },
      ]
    },

    {
      id: 'happy-birthday',
      title: 'Happy Birthday',
      artist: 'Traditional',
      difficulty: 'medium',
      bpm: 90,
      key: 'C Major',
      icon: '\uD83C\uDF82',
      color: '#ff2fa8',
      notes: [
        // Happy birthday to you (pickup notes)
        { midi: 60, start: 0, dur: 0.75, lyric: 'Hap-' },
        { midi: 60, start: 0.75, dur: 0.25, lyric: 'py ' },
        { midi: 62, start: 1, dur: 1, lyric: 'birth-' },
        { midi: 60, start: 2, dur: 1, lyric: 'day ' },
        { midi: 65, start: 3, dur: 1, lyric: 'to ' },
        { midi: 64, start: 4, dur: 2, lyric: 'you, ' },
        // Happy birthday to you
        { midi: 60, start: 6, dur: 0.75, lyric: 'Hap-' },
        { midi: 60, start: 6.75, dur: 0.25, lyric: 'py ' },
        { midi: 62, start: 7, dur: 1, lyric: 'birth-' },
        { midi: 60, start: 8, dur: 1, lyric: 'day ' },
        { midi: 67, start: 9, dur: 1, lyric: 'to ' },
        { midi: 65, start: 10, dur: 2, lyric: 'you, ' },
        // Happy birthday dear [name]
        { midi: 60, start: 12, dur: 0.75, lyric: 'Hap-' },
        { midi: 60, start: 12.75, dur: 0.25, lyric: 'py ' },
        { midi: 72, start: 13, dur: 1, lyric: 'birth-' },
        { midi: 69, start: 14, dur: 1, lyric: 'day ' },
        { midi: 65, start: 15, dur: 1, lyric: 'dear ' },
        { midi: 64, start: 16, dur: 1, lyric: 'friend, ' },
        { midi: 62, start: 17, dur: 2, lyric: '' },
        // Happy birthday to you
        { midi: 70, start: 19, dur: 0.75, lyric: 'Hap-' },
        { midi: 70, start: 19.75, dur: 0.25, lyric: 'py ' },
        { midi: 69, start: 20, dur: 1, lyric: 'birth-' },
        { midi: 65, start: 21, dur: 1, lyric: 'day ' },
        { midi: 67, start: 22, dur: 1, lyric: 'to ' },
        { midi: 65, start: 23, dur: 2, lyric: 'you!' },
      ]
    },

    {
      id: 'amazing-grace',
      title: 'Amazing Grace',
      artist: 'Traditional',
      difficulty: 'medium',
      bpm: 80,
      key: 'G Major',
      icon: '\u2728',
      color: '#00ff88',
      notes: [
        // Amazing grace, how sweet the sound
        { midi: 62, start: 0, dur: 1, lyric: 'A-' },
        { midi: 67, start: 1, dur: 2, lyric: 'maz-' },
        { midi: 71, start: 3, dur: 0.5, lyric: 'ing ' },
        { midi: 67, start: 3.5, dur: 0.5, lyric: '' },
        { midi: 71, start: 4, dur: 2, lyric: 'grace, ' },
        { midi: 69, start: 6, dur: 1, lyric: 'how ' },
        { midi: 67, start: 7, dur: 2, lyric: 'sweet ' },
        { midi: 64, start: 9, dur: 1, lyric: 'the ' },
        { midi: 62, start: 10, dur: 2, lyric: 'sound, ' },
        // That saved a wretch like me
        { midi: 62, start: 13, dur: 1, lyric: 'That ' },
        { midi: 67, start: 14, dur: 2, lyric: 'saved ' },
        { midi: 71, start: 16, dur: 0.5, lyric: 'a ' },
        { midi: 67, start: 16.5, dur: 0.5, lyric: '' },
        { midi: 71, start: 17, dur: 2, lyric: 'wretch ' },
        { midi: 69, start: 19, dur: 1, lyric: 'like ' },
        { midi: 74, start: 20, dur: 3, lyric: 'me. ' },
        // I once was lost, but now am found
        { midi: 74, start: 24, dur: 1, lyric: 'I ' },
        { midi: 74, start: 25, dur: 2, lyric: 'once ' },
        { midi: 71, start: 27, dur: 0.5, lyric: 'was ' },
        { midi: 67, start: 27.5, dur: 0.5, lyric: '' },
        { midi: 71, start: 28, dur: 2, lyric: 'lost, ' },
        { midi: 69, start: 30, dur: 1, lyric: 'but ' },
        { midi: 67, start: 31, dur: 2, lyric: 'now ' },
        { midi: 64, start: 33, dur: 1, lyric: 'am ' },
        { midi: 62, start: 34, dur: 2, lyric: 'found, ' },
        // Was blind but now I see
        { midi: 62, start: 37, dur: 1, lyric: 'Was ' },
        { midi: 67, start: 38, dur: 2, lyric: 'blind, ' },
        { midi: 71, start: 40, dur: 0.5, lyric: 'but ' },
        { midi: 67, start: 40.5, dur: 0.5, lyric: '' },
        { midi: 71, start: 41, dur: 2, lyric: 'now ' },
        { midi: 69, start: 43, dur: 1, lyric: 'I ' },
        { midi: 67, start: 44, dur: 3, lyric: 'see.' },
      ]
    },

    {
      id: 'scale-warmup',
      title: 'C Major Scale',
      artist: 'Warm-Up Exercise',
      difficulty: 'easy',
      bpm: 80,
      key: 'C Major',
      icon: '\uD83C\uDFBC',
      color: '#ffd700',
      notes: [
        // Up the scale
        { midi: 60, start: 0, dur: 2, lyric: 'Do ' },
        { midi: 62, start: 2, dur: 2, lyric: 'Re ' },
        { midi: 64, start: 4, dur: 2, lyric: 'Mi ' },
        { midi: 65, start: 6, dur: 2, lyric: 'Fa ' },
        { midi: 67, start: 8, dur: 2, lyric: 'Sol ' },
        { midi: 69, start: 10, dur: 2, lyric: 'La ' },
        { midi: 71, start: 12, dur: 2, lyric: 'Ti ' },
        { midi: 72, start: 14, dur: 4, lyric: 'Do! ' },
        // Down the scale
        { midi: 72, start: 18, dur: 2, lyric: 'Do ' },
        { midi: 71, start: 20, dur: 2, lyric: 'Ti ' },
        { midi: 69, start: 22, dur: 2, lyric: 'La ' },
        { midi: 67, start: 24, dur: 2, lyric: 'Sol ' },
        { midi: 65, start: 26, dur: 2, lyric: 'Fa ' },
        { midi: 64, start: 28, dur: 2, lyric: 'Mi ' },
        { midi: 62, start: 30, dur: 2, lyric: 'Re ' },
        { midi: 60, start: 32, dur: 4, lyric: 'Do!' },
      ]
    },

    {
      id: 'when-the-saints',
      title: 'When the Saints Go Marching In',
      artist: 'Traditional',
      difficulty: 'medium',
      bpm: 110,
      key: 'C Major',
      icon: '\uD83C\uDFBA',
      color: '#ff8844',
      notes: [
        // Oh when the saints
        { midi: 60, start: 0, dur: 1, lyric: 'Oh ' },
        { midi: 64, start: 1, dur: 1, lyric: 'when ' },
        { midi: 65, start: 2, dur: 1, lyric: 'the ' },
        { midi: 67, start: 3, dur: 3, lyric: 'saints ' },
        // Go marching in
        { midi: 60, start: 6, dur: 1, lyric: 'go ' },
        { midi: 64, start: 7, dur: 1, lyric: 'march-' },
        { midi: 65, start: 8, dur: 1, lyric: 'ing ' },
        { midi: 67, start: 9, dur: 3, lyric: 'in, ' },
        // Oh when the saints go marching in
        { midi: 60, start: 12, dur: 1, lyric: 'Oh ' },
        { midi: 64, start: 13, dur: 1, lyric: 'when ' },
        { midi: 65, start: 14, dur: 1, lyric: 'the ' },
        { midi: 67, start: 15, dur: 2, lyric: 'saints ' },
        { midi: 64, start: 17, dur: 2, lyric: 'go ' },
        { midi: 60, start: 19, dur: 2, lyric: 'march-' },
        { midi: 64, start: 21, dur: 1, lyric: 'ing ' },
        { midi: 62, start: 22, dur: 3, lyric: 'in, ' },
        // Oh Lord I want to be in that number
        { midi: 64, start: 25, dur: 1, lyric: 'Oh ' },
        { midi: 62, start: 26, dur: 1, lyric: 'Lord ' },
        { midi: 60, start: 27, dur: 1, lyric: 'I ' },
        { midi: 60, start: 28, dur: 1, lyric: 'want ' },
        { midi: 62, start: 29, dur: 1, lyric: 'to ' },
        { midi: 64, start: 30, dur: 2, lyric: 'be ' },
        { midi: 62, start: 32, dur: 1, lyric: 'in ' },
        { midi: 60, start: 33, dur: 1, lyric: 'that ' },
        { midi: 67, start: 34, dur: 2, lyric: 'num-' },
        { midi: 67, start: 36, dur: 1, lyric: 'ber, ' },
        // When the saints go marching in
        { midi: 67, start: 37, dur: 1, lyric: 'When ' },
        { midi: 65, start: 38, dur: 1, lyric: 'the ' },
        { midi: 64, start: 39, dur: 1.5, lyric: 'saints ' },
        { midi: 62, start: 40.5, dur: 1.5, lyric: 'go ' },
        { midi: 60, start: 42, dur: 1, lyric: 'march-' },
        { midi: 62, start: 43, dur: 1, lyric: 'ing ' },
        { midi: 60, start: 44, dur: 3, lyric: 'in!' },
      ]
    },

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
      audioSrc: 'audio/miss-you-3000.mp3',
      // Time-synced lyrics mode: timing in seconds from LRC, pitch is approximate center
      lyricsMode: true,
      // lyricsMode: timing in SECONDS, lyrics are the primary guide, no pitch blocks shown
      notes: [
        // -- VERSE 1 --
        { midi: 0, start: 18.61, dur: 3.5, lyric: '\u7576\u611B\u60C5\u4E00\u843D\u6210\u4E00\u5288\u6C38\u6046\u7684\u523B\u5316\u6210\u56DE\u61B6' },
        { midi: 0, start: 22.32, dur: 3.5, lyric: '\u60F3\u5FF5\u5E7E\u500B\u4E16\u7D00 \u624D\u662F\u523B\u9AA8\u9298\u5FC3' },
        { midi: 0, start: 26.03, dur: 7.0, lyric: '\u82E5\u80FD\u56DE\u5230\u51B0\u6CB3\u6642\u671F \u591A\u60F3\u628A\u4F60\u62B1\u7DCA\u8655\u7406' },
        { midi: 0, start: 33.47, dur: 3.5, lyric: '\u4F60\u7684\u7B11\u591A\u7642\u7664 \u8B93\u4EBA\u751F\u4E5F\u8607\u9192' },
        // -- VERSE 2 --
        { midi: 0, start: 37.20, dur: 3.5, lyric: '\u4EFB\u6642\u5149\u66F4\u8FED\u4E86\u56DB\u5B63 \u4EFB\u5B87\u5B99\u7121\u74B0\u6216\u661F\u79FB' },
        { midi: 0, start: 40.91, dur: 5.5, lyric: '\u6C38\u9060\u4E0D\u9000\u6D41\u884C \u662F\u60C5\u8272\u7684\u771F\u5FC3' },
        { midi: 0, start: 46.76, dur: 2.5, lyric: '\u82E5\u6709\u4E00\u5929\u4E16\u754C\u5C07\u6211\u907A\u68C4' },
        { midi: 0, start: 49.43, dur: 4.3, lyric: '\u800C\u4F60\u6703\u5728\u53E3\u888B\u88E1\u627E\u5230\u6211' },
        // -- PRE-CHORUS --
        { midi: 0, start: 53.93, dur: 4.3, lyric: '\u5931\u53BB\u4F60\u7684\u98A8\u666F \u50CF\u5750\u98DB\u7D6E \u50CF\u662F\u843D\u6587\u660E' },
        { midi: 0, start: 58.44, dur: 6.7, lyric: '\u80FD\u5426\u4E00\u5834\u5947\u8E5F \u4E00\u7DDA\u751F\u6A5F' },
        { midi: 0, start: 65.35, dur: 2.2, lyric: '\u80FD\u4E0D\u80FD\u53C8\u518D' },
        { midi: 0, start: 67.74, dur: 4.5, lyric: '\u4E00\u6B21\u76F8\u9047' },
        // -- CHORUS --
        { midi: 0, start: 72.52, dur: 3.7, lyric: '\u60F3\u898B\u4F60 \u53EA\u60F3\u898B\u4F60' },
        { midi: 0, start: 76.40, dur: 3.5, lyric: '\u672A\u4F86\u904E\u53BB \u6211\u53EA\u60F3\u898B\u4F60' },
        { midi: 0, start: 79.96, dur: 6.9, lyric: '\u7A7F\u8D8A\u4E86\u5343\u500B\u842C\u500B\u6642\u9593\u7DDA\u88E1 \u4EBA\u6D77\u88E1\u76F8\u4F9D' },
        { midi: 0, start: 87.13, dur: 4.0, lyric: '\u7528\u76E1\u4E86\u908F\u8F2F\u5FC3\u6A5F' },
        { midi: 0, start: 91.38, dur: 5.0, lyric: '\u63A8\u7406\u611B\u60C5 \u6700\u96E3\u89E3\u7684\u8B0E' },
        { midi: 0, start: 96.50, dur: 5.5, lyric: '\u6703\u4E0D\u6703\u4F60\u4E5F\u548C\u6211\u4E00\u6A23 \u5728\u7B49\u5F85\u4E00\u53E5\u6211\u9858\u610F' },
        // -- INTERLUDE --
        // -- VERSE 3 --
        { midi: 0, start: 111.05, dur: 5.3, lyric: '\u8A8D\u4E16\u5149\u66F4\u8FED\u4E86\u56DB\u5B63 \u4EFB\u5B87\u5B99\u7121\u74B0\u6216\u661F\u79FB' },
        { midi: 0, start: 116.63, dur: 2.5, lyric: '\u6C38\u9060\u4E0D\u9000\u6D41\u884C' },
        { midi: 0, start: 119.28, dur: 4.5, lyric: '\u662F\u60C5\u8272\u7684\u771F\u5FC3' },
        // -- PRE-CHORUS 2 --
        { midi: 0, start: 124.07, dur: 4.3, lyric: '\u5931\u53BB\u4F60\u7684\u98A8\u666F \u50CF\u5750\u98DB\u7D6E \u50CF\u662F\u843D\u6587\u660E' },
        { midi: 0, start: 128.58, dur: 5.0, lyric: '\u80FD\u5426\u4E00\u5834\u5947\u8E5F \u4E00\u7DDA\u751F\u6A5F \u80FD\u4E0D\u80FD\u53C8\u518D\u4E00\u6B21\u76F8\u9047' },
        // -- CHORUS 2 --
        { midi: 0, start: 133.80, dur: 3.7, lyric: '\u60F3\u898B\u4F60 \u53EA\u60F3\u898B\u4F60' },
        { midi: 0, start: 137.70, dur: 3.5, lyric: '\u672A\u4F86\u904E\u53BB \u6211\u53EA\u60F3\u898B\u4F60' },
        { midi: 0, start: 141.30, dur: 6.7, lyric: '\u7A7F\u8D8A\u4E86\u5343\u500B\u842C\u500B\u6642\u9593\u7DDA\u88E1 \u4EBA\u6D77\u88E1\u76F8\u4F9D' },
        { midi: 0, start: 148.20, dur: 4.0, lyric: '\u7528\u76E1\u4E86\u908F\u8F2F\u5FC3\u6A5F' },
        { midi: 0, start: 152.30, dur: 4.5, lyric: '\u63A8\u7406\u611B\u60C5 \u6700\u96E3\u89E3\u7684\u8B0E' },
        { midi: 0, start: 157.00, dur: 6.0, lyric: '\u6703\u4E0D\u6703\u4F60\u4E5F\u548C\u6211\u4E00\u6A23 \u5728\u7B49\u5F85\u4E00\u53E5\u6211\u9858\u610F' },
        // -- BRIDGE --
        { midi: 0, start: 185.00, dur: 6.0, lyric: '\u60F3\u898B\u4F60 \u53EA\u60F3\u898B\u4F60' },
        { midi: 0, start: 191.20, dur: 6.0, lyric: '\u672A\u4F86\u904E\u53BB \u6211\u53EA\u60F3\u898B\u4F60' },
        // -- FINAL CHORUS --
        { midi: 0, start: 200.00, dur: 3.7, lyric: '\u60F3\u898B\u4F60 \u53EA\u60F3\u898B\u4F60' },
        { midi: 0, start: 203.90, dur: 3.5, lyric: '\u672A\u4F86\u904E\u53BB \u6211\u53EA\u60F3\u898B\u4F60' },
        { midi: 0, start: 207.50, dur: 6.7, lyric: '\u7A7F\u8D8A\u4E86\u5343\u500B\u842C\u500B\u6642\u9593\u7DDA\u88E1 \u4EBA\u6D77\u88E1\u76F8\u4F9D' },
        { midi: 0, start: 214.40, dur: 4.0, lyric: '\u7528\u76E1\u4E86\u908F\u8F2F\u5FC3\u6A5F' },
        { midi: 0, start: 218.60, dur: 4.5, lyric: '\u63A8\u7406\u611B\u60C5 \u6700\u96E3\u89E3\u7684\u8B0E' },
        { midi: 0, start: 223.30, dur: 6.0, lyric: '\u6703\u4E0D\u6703\u4F60\u4E5F\u548C\u6211\u4E00\u6A23 \u5728\u7B49\u5F85\u4E00\u53E5\u6211\u9858\u610F' },
        // -- OUTRO --
        { midi: 0, start: 232.00, dur: 5.0, lyric: '\u6703\u4E0D\u6703\u4F60\u4E5F\u548C\u6211\u4E00\u6A23' },
        { midi: 0, start: 237.30, dur: 5.0, lyric: '\u5728\u7B49\u5F85\u4E00\u53E5' },
        { midi: 0, start: 244.00, dur: 8.0, lyric: '\u6211\u9858\u610F' },
      ]
    }
  ],

  // Helper: convert beats to seconds
  beatsToSec(beats, bpm) {
    return (beats / bpm) * 60;
  },

  // Get a song by id
  get(id) {
    return this.library.find(s => s.id === id);
  },

  // Get song duration in seconds
  getDuration(song) {
    if (song.lyricsMode) {
      const lastNote = song.notes[song.notes.length - 1];
      return lastNote.start + lastNote.dur;
    }
    const lastNote = song.notes[song.notes.length - 1];
    return this.beatsToSec(lastNote.start + lastNote.dur, song.bpm);
  },

  // Get notes converted to seconds
  getNotesInSeconds(song) {
    if (song.lyricsMode) {
      // Already in seconds — just add freq and name
      return song.notes.map(n => ({
        midi: n.midi,
        start: n.start,
        dur: n.dur,
        lyric: n.lyric,
        freq: this.midiToFreq(n.midi),
        name: this.midiToName(n.midi)
      }));
    }
    return song.notes.map(n => ({
      midi: n.midi,
      start: this.beatsToSec(n.start, song.bpm),
      dur: this.beatsToSec(n.dur, song.bpm),
      lyric: n.lyric,
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
