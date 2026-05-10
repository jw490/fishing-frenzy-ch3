#!/usr/bin/env python3
"""
scrape_lyrics.py — Fetch Chinese lyrics from mojim.com and save as .txt for alignment.

Usage:
  python3 scrape_lyrics.py "<song title>" "<artist>" <output_file>

Example:
  python3 scrape_lyrics.py "七里香" "周杰倫" /tmp/lyrics/qi-li-xiang.txt

Output: plain text file with one lyric line per line, Chinese characters only.
"""

import sys, re, urllib.request, urllib.parse, time

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept-Language': 'zh-TW,zh;q=0.9',
}

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        raw = r.read()
    # mojim pages are typically Big5 or UTF-8
    for enc in ('utf-8', 'big5', 'gbk'):
        try:
            return raw.decode(enc)
        except Exception:
            continue
    return raw.decode('utf-8', errors='replace')

def search_mojim(title, artist):
    """Search mojim.com and return the first matching lyrics page URL."""
    query = urllib.parse.quote(f'{title} {artist} site:mojim.com')
    search_url = f'https://www.google.com/search?q={query}&hl=zh-TW'
    html = fetch(search_url)
    # Extract mojim.com URLs from Google results
    urls = re.findall(r'https://mojim\.com/[a-z]{2}\d+x\d+\.htm', html)
    if not urls:
        # Try direct mojim search
        q2 = urllib.parse.quote(f'{title} {artist}')
        mojim_search = f'https://mojim.com/twy100001x1x1.htm?t={q2}'
        urls = [mojim_search]
    return urls[0] if urls else None

def extract_lyrics_from_mojim(url):
    """Parse a mojim.com lyrics page and return clean lyric lines."""
    html = fetch(url)

    # Mojim stores lyrics in a div with id="fsZx2" or similar, or in <dl> tags
    # Try multiple patterns
    lyrics_text = ''

    # Pattern 1: lyrics in fsZx2 div
    m = re.search(r'id="fsZx2"[^>]*>(.*?)</dl>', html, re.DOTALL)
    if m:
        lyrics_text = m.group(1)

    # Pattern 2: lyrics in dd tags
    if not lyrics_text:
        m = re.search(r'<dl[^>]*class="[^"]*lyr[^"]*"[^>]*>(.*?)</dl>', html, re.DOTALL)
        if m:
            lyrics_text = m.group(1)

    # Pattern 3: find content between common mojim markers
    if not lyrics_text:
        m = re.search(r'更多歌詞(.*?)更多周杰倫', html, re.DOTALL)
        if m:
            lyrics_text = m.group(1)

    if not lyrics_text:
        # Fallback: grab all Chinese text blocks
        lyrics_text = html

    # Strip HTML tags
    lyrics_text = re.sub(r'<[^>]+>', '\n', lyrics_text)
    # Decode HTML entities
    lyrics_text = lyrics_text.replace('&nbsp;', ' ').replace('&#13;', '').replace('&amp;', '&')

    lines = []
    for raw_line in lyrics_text.split('\n'):
        # Keep only lines that are primarily Chinese characters
        line = raw_line.strip()
        chinese_chars = re.findall(r'[一-鿿㐀-䶿]', line)
        if len(chinese_chars) >= 3:  # at least 3 Chinese chars = a lyric line
            # Strip everything except Chinese chars
            clean = ''.join(chinese_chars)
            if clean and clean not in lines:
                lines.append(clean)

    return lines

def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)

    title  = sys.argv[1]
    artist = sys.argv[2]
    outfile = sys.argv[3]

    print(f'Searching for: {title} — {artist}')

    url = search_mojim(title, artist)
    if not url:
        print(f'ERROR: Could not find lyrics page for {title}')
        sys.exit(1)

    print(f'Found: {url}')
    time.sleep(0.5)

    lines = extract_lyrics_from_mojim(url)
    if not lines:
        print(f'ERROR: Could not extract lyrics from {url}')
        sys.exit(1)

    print(f'Extracted {len(lines)} lyric lines')

    with open(outfile, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f'Saved to {outfile}')
    print('\nFirst 5 lines:')
    for l in lines[:5]:
        print(f'  {l}')

if __name__ == '__main__':
    main()
