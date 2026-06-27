"""
download_wlasl.py — Download WLASL videos for SignBridge target words.

Tries all URL types: YouTube (via yt-dlp), direct video URLs (via urllib),
and other hosting sites. Reports per-word availability.

Output: ml/data/wlasl_videos/<word_id>/<video_id>.mp4
        ml/data/wlasl_labels.csv
"""

import json
import os
import subprocess
import sys
import time
import random
import urllib.request
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
VOCAB_MAP_PATH = os.path.join(HERE, "colab", "vocab_map.json")
WLASL_JSON = os.path.join("D:", os.sep, "Projects", "WLASL", "start_kit", "WLASL_v0.3.json")

VIDEO_DIR = os.path.join(DATA_DIR, "wlasl_videos")
LABELS_CSV = os.path.join(DATA_DIR, "wlasl_labels.csv")

os.makedirs(VIDEO_DIR, exist_ok=True)

# Load vocab map
with open(VOCAB_MAP_PATH) as f:
    gloss_to_word = json.load(f)

# Load WLASL metadata
with open(WLASL_JSON) as f:
    wlasl_data = json.load(f)

# Build flat list of tasks
tasks = []
for entry in wlasl_data:
    gloss = entry["gloss"].strip().upper()
    if gloss not in gloss_to_word:
        continue
    word_id = gloss_to_word[gloss]
    for inst in entry["instances"]:
        tasks.append((gloss, word_id, inst))

print(f"Target videos: {len(tasks)} across {len(set(t[1] for t in tasks))} words")

# Download helpers
def download_direct(url, out_path):
    """Try direct HTTP download with a browser-like user-agent."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status == 200:
                data = resp.read()
                if len(data) > 1000:
                    with open(out_path, "wb") as f:
                        f.write(data)
                    return True
    except Exception:
        pass
    return False


def download_youtube(url, out_path):
    """Try yt-dlp for YouTube URLs."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "yt_dlp", "-q", "--no-warnings",
             "-f", "mp4", "-o", out_path, "--max-filesize", "50M", url],
            capture_output=True, text=True, timeout=45,
        )
        return result.returncode == 0 and os.path.exists(out_path) and os.path.getsize(out_path) > 1000
    except Exception:
        return False


# Process
downloaded = 0
failed = 0
label_rows = []
per_word = Counter()

for i, (gloss, word_id, inst) in enumerate(tasks):
    video_id = inst["video_id"]
    url = inst["url"]

    word_dir = os.path.join(VIDEO_DIR, word_id)
    os.makedirs(word_dir, exist_ok=True)
    out_path = os.path.join(word_dir, f"{video_id}.mp4")

    # Skip if already downloaded
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        label_rows.append((f"{word_id}/{video_id}.mp4", word_id))
        downloaded += 1
        per_word[word_id] += 1
        continue

    # Skip .swf files (ASLPro Flash)
    if url.lower().endswith(".swf"):
        failed += 1
        continue

    success = False

    # Strategy depends on URL type
    if "youtube.com" in url or "youtu.be" in url:
        success = download_youtube(url, out_path)
        if not success:
            # Try direct download as fallback (unlikely for YT but harmless)
            success = download_direct(url, out_path)
    else:
        # Direct video URL — try simple HTTP download
        success = download_direct(url, out_path)
        if not success:
            # Fall back to yt-dlp (handles many sites)
            success = download_youtube(url, out_path)

    if success:
        label_rows.append((f"{word_id}/{video_id}.mp4", word_id))
        downloaded += 1
        per_word[word_id] += 1
    else:
        failed += 1

    # Progress every 30
    if (i + 1) % 30 == 0:
        print(f"  {i+1}/{len(tasks)}  ok={downloaded} fail={failed}")

    time.sleep(random.uniform(0.1, 0.3))

# Write labels CSV
with open(LABELS_CSV, "w") as f:
    for filename, label in label_rows:
        f.write(f"{filename},{label}\n")

print()
print(f"Done: {downloaded} downloaded, {failed} failed")
print(f"Labels CSV: {LABELS_CSV}")
print()
print("Per-word:")
for word, count in per_word.most_common():
    print(f"  {word:20s} {count:4d}")
missing = [w for w in sorted(set(gloss_to_word.values())) if per_word.get(w, 0) == 0]
if missing:
    print(f"\nNo videos for ({len(missing)}): {missing}")
else:
    print(f"\nAll {len(set(gloss_to_word.values()))} words have at least 1 video!")
