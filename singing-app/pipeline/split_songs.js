#!/usr/bin/env node
/**
 * split_songs.js — Extract per-song data from songs.js into /data/songs/{id}.json
 *
 * Output:
 *   data/songs/{id}.json   → { notes, melody }
 *   data/durations.json    → { [id]: durationSec }
 *
 * Run from singing-app/:
 *   node pipeline/split_songs.js
 */
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT      = path.join(__dirname, '..');
const SONGS_JS  = path.join(ROOT, 'js', 'songs.js');
const DATA_DIR  = path.join(ROOT, 'data', 'songs');

// ── eval songs.js in a sandbox ────────────────────────────────────────────────
const src = fs.readFileSync(SONGS_JS, 'utf8');
const sandbox = Object.create(null);
vm.createContext(sandbox);
// songs.js declares `const Songs = {…}` — rebind so the sandbox can capture it
vm.runInContext(src.replace(/\bconst\s+Songs\b/, 'Songs'), sandbox);
const Songs = sandbox.Songs;
if (!Songs || !Array.isArray(Songs.library)) {
  console.error('ERROR: could not parse Songs.library from songs.js');
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });

const durations = {};

for (const song of Songs.library) {
  const notes  = song.notes  || [];
  const melody = song.melody || [];

  // Compute durationSec (all songs are lyricsMode — times already in seconds)
  let durationSec = 0;
  if (notes.length > 0) {
    const last = notes[notes.length - 1];
    durationSec = Math.round((last.start + last.dur) * 10) / 10;
  }
  durations[song.id] = durationSec;

  // Write per-song data file
  const outPath = path.join(DATA_DIR, `${song.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ notes, melody }));

  const sizeKB = (Buffer.byteLength(JSON.stringify({ notes, melody })) / 1024).toFixed(1);
  console.log(`  ${song.id.padEnd(36)} notes=${String(notes.length).padStart(3)}  melody=${String(melody.length).padStart(3)}  dur=${durationSec}s  ${sizeKB}KB`);
}

// Write summary for the Python text-stripper
fs.writeFileSync(
  path.join(ROOT, 'data', 'durations.json'),
  JSON.stringify(durations, null, 2)
);

const total = Object.values(durations).length;
console.log(`\n✓ Wrote ${total} songs to data/songs/  +  data/durations.json`);
