/* ==========================================
   MIDI File Parser
   Parses standard MIDI files (.mid) and
   extracts melody notes with timing + pitch
   ========================================== */

const MidiParser = {

  /**
   * Parse a MIDI file (ArrayBuffer) and return note data
   * compatible with our Songs format.
   * Returns { bpm, notes: [{ midi, start (beats), dur (beats), lyric }] }
   */
  parse(arrayBuffer) {
    const data = new DataView(arrayBuffer);
    let offset = 0;

    // --- Read Header ---
    const headerTag = this._readString(data, offset, 4);
    if (headerTag !== 'MThd') throw new Error('Not a valid MIDI file');
    offset += 4;

    const headerLen = data.getUint32(offset); offset += 4;
    const format = data.getUint16(offset); offset += 2;
    const numTracks = data.getUint16(offset); offset += 2;
    const ticksPerBeat = data.getUint16(offset); offset += 2;

    // --- Read Tracks ---
    const allEvents = [];
    for (let t = 0; t < numTracks; t++) {
      const trackTag = this._readString(data, offset, 4);
      if (trackTag !== 'MTrk') throw new Error('Invalid track chunk');
      offset += 4;
      const trackLen = data.getUint32(offset); offset += 4;
      const trackEnd = offset + trackLen;

      let tick = 0;
      while (offset < trackEnd) {
        const { value: delta, bytesRead } = this._readVarLen(data, offset);
        offset += bytesRead;
        tick += delta;

        // Read event
        const eventByte = data.getUint8(offset);

        if (eventByte === 0xFF) {
          // Meta event
          offset++;
          const metaType = data.getUint8(offset); offset++;
          const { value: metaLen, bytesRead: metaLenBytes } = this._readVarLen(data, offset);
          offset += metaLenBytes;

          if (metaType === 0x51 && metaLen === 3) {
            // Tempo change
            const microsPerBeat = (data.getUint8(offset) << 16) |
                                  (data.getUint8(offset + 1) << 8) |
                                  data.getUint8(offset + 2);
            allEvents.push({ tick, type: 'tempo', microsPerBeat });
          }

          offset += metaLen;
        } else if (eventByte === 0xF0 || eventByte === 0xF7) {
          // SysEx event
          offset++;
          const { value: sysLen, bytesRead: sysLenBytes } = this._readVarLen(data, offset);
          offset += sysLenBytes + sysLen;
        } else {
          // MIDI event
          let statusByte = eventByte;
          if (eventByte & 0x80) {
            offset++;
            this._lastStatus = statusByte;
          } else {
            // Running status
            statusByte = this._lastStatus || 0;
          }

          const type = statusByte & 0xF0;
          const channel = statusByte & 0x0F;

          if (type === 0x90 || type === 0x80) {
            // Note On / Note Off
            const note = data.getUint8(offset); offset++;
            const velocity = data.getUint8(offset); offset++;

            if (type === 0x90 && velocity > 0) {
              allEvents.push({ tick, type: 'noteOn', note, velocity, channel, track: t });
            } else {
              allEvents.push({ tick, type: 'noteOff', note, channel, track: t });
            }
          } else if (type === 0xA0 || type === 0xB0 || type === 0xE0) {
            // Aftertouch, Control Change, Pitch Bend - 2 data bytes
            offset += 2;
          } else if (type === 0xC0 || type === 0xD0) {
            // Program Change, Channel Pressure - 1 data byte
            offset += 1;
          } else {
            // Unknown, try to skip
            offset++;
          }
        }
      }

      offset = trackEnd;
    }

    // --- Process events into notes ---
    return this._eventsToNotes(allEvents, ticksPerBeat);
  },

  _eventsToNotes(events, ticksPerBeat) {
    // Sort by tick
    events.sort((a, b) => a.tick - b.tick);

    // Find tempo (default 120 BPM)
    let microsPerBeat = 500000; // 120 BPM
    for (const e of events) {
      if (e.type === 'tempo') {
        microsPerBeat = e.microsPerBeat;
        break;
      }
    }
    const bpm = Math.round(60000000 / microsPerBeat);

    // Match note-on with note-off
    const openNotes = {}; // key: "track-channel-note" -> { tick, velocity }
    const notes = [];

    for (const e of events) {
      if (e.type === 'noteOn') {
        const key = `${e.track}-${e.channel}-${e.note}`;
        openNotes[key] = { tick: e.tick, velocity: e.velocity };
      } else if (e.type === 'noteOff') {
        const key = `${e.track}-${e.channel}-${e.note}`;
        if (openNotes[key]) {
          const startTick = openNotes[key].tick;
          const durTicks = e.tick - startTick;
          notes.push({
            midi: e.note,
            startTick,
            durTicks,
            start: startTick / ticksPerBeat,
            dur: durTicks / ticksPerBeat,
            velocity: openNotes[key].velocity,
          });
          delete openNotes[key];
        }
      }
    }

    // Sort by start time
    notes.sort((a, b) => a.start - b.start);

    return { bpm, ticksPerBeat, notes, rawNoteCount: notes.length };
  },

  /**
   * Extract the melody track from parsed MIDI.
   * Heuristic: pick the track/channel with the most notes in vocal range (C4-C6),
   * or let user specify. Returns notes in our song format.
   */
  extractMelody(parsed, options = {}) {
    let notes = parsed.notes;

    // Filter to vocal range (MIDI 48-84 = C3-C6)
    const vocalNotes = notes.filter(n => n.midi >= 48 && n.midi <= 84);

    // If there are multiple tracks/channels, find the one most likely to be melody
    // (most notes in the vocal sweet spot C4-G5 = MIDI 60-79)
    if (!options.useAllNotes) {
      const trackCounts = {};
      for (const n of vocalNotes) {
        const key = `${n.midi >= 60 && n.midi <= 79 ? 'vocal' : 'other'}`;
        trackCounts[key] = (trackCounts[key] || 0) + 1;
      }
      // Use vocal range notes
      notes = vocalNotes.filter(n => n.midi >= 48 && n.midi <= 84);
    }

    // Remove overlapping notes (keep highest pitch = melody)
    const melody = [];
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      // Check if there's a higher note starting at the same time
      let isHighest = true;
      for (let j = 0; j < notes.length; j++) {
        if (i !== j && Math.abs(notes[j].start - n.start) < 0.01 && notes[j].midi > n.midi) {
          isHighest = false;
          break;
        }
      }
      // For simultaneous notes, keep the highest (likely melody)
      // But skip if it's a chord note very close in time to a previous note
      if (isHighest) {
        // Check if this overlaps with the previous melody note
        if (melody.length > 0) {
          const prev = melody[melody.length - 1];
          if (n.start < prev.start + prev.dur - 0.01 && n.start > prev.start + 0.01) {
            // Overlapping - keep the new one only if it's clearly a new note
            if (n.start - prev.start > 0.1) {
              // Trim previous note
              prev.dur = n.start - prev.start;
              melody.push(n);
            }
            // else skip this note
          } else {
            melody.push(n);
          }
        } else {
          melody.push(n);
        }
      }
    }

    // Convert to our format with empty lyrics
    const songNotes = melody.map(n => ({
      midi: n.midi,
      start: Math.round(n.start * 100) / 100,
      dur: Math.max(0.25, Math.round(n.dur * 100) / 100),
      lyric: '',
    }));

    return {
      bpm: parsed.bpm,
      notes: songNotes,
    };
  },

  // --- Helpers ---

  _readString(data, offset, len) {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += String.fromCharCode(data.getUint8(offset + i));
    }
    return s;
  },

  _readVarLen(data, offset) {
    let value = 0;
    let bytesRead = 0;
    let b;
    do {
      b = data.getUint8(offset + bytesRead);
      value = (value << 7) | (b & 0x7F);
      bytesRead++;
    } while (b & 0x80 && bytesRead < 4);
    return { value, bytesRead };
  },

  _lastStatus: 0,
};
