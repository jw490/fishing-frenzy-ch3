#!/usr/bin/env python3
"""
upload-to-r2.py  —  Upload VocalStar media to Cloudflare R2

Usage:
  python3 scripts/upload-to-r2.py <local-file> [r2-key]

Public base: https://pub-7b37e1a1b08244c98f1735f2f95ab5f6.r2.dev/
"""

import sys, os, boto3
from botocore.config import Config

ACCOUNT   = '5866e30e229c29870e6dc0d3f9d45b51'
BUCKET    = 'vocalstar'
KEY_ID    = '0bcd4a8f0c7bc7cff747fc538c22a9b4'
SECRET    = '150e1b39c5048dce12bc358099b0a9d31a410bec739d417a760a6e183b0ef75c'
PUB_BASE  = 'https://pub-7b37e1a1b08244c98f1735f2f95ab5f6.r2.dev'

MIME = {
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.json': 'application/json',
    '.webm': 'video/webm',
}

def upload(local_path, r2_key):
    if not os.path.exists(local_path):
        print(f"File not found: {local_path}"); sys.exit(1)

    ext = os.path.splitext(local_path)[1].lower()
    content_type = MIME.get(ext, 'application/octet-stream')
    size_mb = os.path.getsize(local_path) / 1024 / 1024

    print(f"Uploading {local_path} ({size_mb:.1f} MB) → r2://{BUCKET}/{r2_key}")

    s3 = boto3.client(
        's3',
        endpoint_url=f'https://{ACCOUNT}.r2.cloudflarestorage.com',
        aws_access_key_id=KEY_ID,
        aws_secret_access_key=SECRET,
        config=Config(signature_version='s3v4')
    )

    with open(local_path, 'rb') as f:
        s3.upload_fileobj(
            f, BUCKET, r2_key,
            ExtraArgs={'ContentType': content_type},
            Callback=lambda b, total=os.path.getsize(local_path): print(
                f"\r  {b/total*100:.0f}%", end='', flush=True
            )
        )

    print(f"\n✓ {PUB_BASE}/{r2_key}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/upload-to-r2.py <local-file> [r2-key]")
        sys.exit(1)
    local = sys.argv[1]
    key   = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(local)
    upload(local, key)
