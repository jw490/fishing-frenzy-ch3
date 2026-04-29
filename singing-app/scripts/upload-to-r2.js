#!/usr/bin/env node
/**
 * upload-to-r2.js
 * Upload VocalStar media files to Cloudflare R2 via Wrangler CLI.
 *
 * Usage:
 *   node scripts/upload-to-r2.js <local-file-path> [r2-key]
 *
 * If r2-key is omitted, uses the filename as the key.
 * Public URL: https://pub-7b37e1a1b08244c98f1735f2f95ab5f6.r2.dev/<r2-key>
 *
 * Examples:
 *   node scripts/upload-to-r2.js audio/jia-bin-mv.mp4
 *   node scripts/upload-to-r2.js /tmp/new-song-mv.mp4 new-song-mv.mp4
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUCKET     = 'vocalstar';
const PUBLIC_BASE = 'https://pub-7b37e1a1b08244c98f1735f2f95ab5f6.r2.dev';

const MIME = {
  '.mp4':  'video/mp4',
  '.mp3':  'audio/mpeg',
  '.json': 'application/json',
  '.webm': 'video/webm',
};

const [,, localPath, r2Key] = process.argv;
if (!localPath) {
  console.error('Usage: node scripts/upload-to-r2.js <local-file> [r2-key]');
  process.exit(1);
}

if (!fs.existsSync(localPath)) {
  console.error(`File not found: ${localPath}`);
  process.exit(1);
}

const key = r2Key || path.basename(localPath);
const ext = path.extname(localPath).toLowerCase();
const contentType = MIME[ext] || 'application/octet-stream';
const stat = fs.statSync(localPath);
const sizeMB = (stat.size / 1024 / 1024).toFixed(1);

console.log(`Uploading ${localPath} (${sizeMB} MB) → r2://${BUCKET}/${key}`);
console.log(`Content-Type: ${contentType}`);

try {
  execSync(
    `wrangler r2 object put ${BUCKET}/${key} --file="${localPath}" --content-type="${contentType}" --remote`,
    { stdio: 'inherit' }
  );
  console.log(`\n✓ Public URL: ${PUBLIC_BASE}/${key}`);
} catch (e) {
  console.error('Upload failed');
  process.exit(1);
}
