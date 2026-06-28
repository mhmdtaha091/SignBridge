"""
download_wlasl_hf.py — Download WLASL videos from HuggingFace mirror.

The Voxel51/WLASL dataset has 11,980 actual MP4 videos with labels.
Downloads videos matching our 25 target words, then writes a labels CSV
for preprocess_temporal.py.

Output: ml/data/wlasl_videos/<word_id>/<video_id>.mp4
        ml/data/wlasl_labels.csv
"""

import json
import os
import sys
from collections import Counter

from huggingface_hub import hf_hub_download

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
VOCAB_MAP_PATH = os.path.join(HERE, "colab", "vocab_map.json")
VIDEO_DIR = os.path.join(DATA_DIR, "wlasl_videos")
LABELS_CSV = os.path.join(DATA_DIR, "wlasl_labels.csv")

os.makedirs(VIDEO_DIR, exist_ok=True)

# Load vocab map
with open(VOCAB_MAP_PATH) as f:
    gloss_to_word = json.load(f)

# Download and parse samples.json
print("Loading WLASL samples from HuggingFace...")
samples_path = hf_hub_download("Voxel51/WLASL", "samples.json", repo_type="dataset")
with open(samples_path) as f:
    samples = json.load(f)["samples"]

print(f"Total samples: {len(samples)}")

# Filter to our target words
matching = []
for s in samples:
    gloss_label = s["gloss"]["label"].strip().upper()
    if gloss_label in gloss_to_word:
        matching.append((gloss_to_word[gloss_label], s["filepath"]))

print(f"Matching samples: {len(matching)}")
per_word = Counter(w for w, _ in matching)
print("Per-word:")
for w, c in per_word.most_common():
    print(f"  {w:20s} {c:4d}")
missing = [w for w in sorted(set(gloss_to_word.values())) if w not in per_word]
if missing:
    print(f"\nNot in WLASL HF: {missing}")
print()

# Download each video — first get actual file listing to avoid 404s
print("Getting actual file list from HF...")
from huggingface_hub import list_repo_files
actual_files = set(list_repo_files("Voxel51/WLASL", repo_type="dataset"))
print(f"  {len(actual_files)} files in repo")

# Filter matching samples to only those that exist on HF
existing_matches = [(w, fp) for w, fp in matching if fp in actual_files]
print(f"  {len(existing_matches)}/{len(matching)} samples exist on HF")
if len(existing_matches) < len(matching):
    not_found = set(fp for _, fp in matching) - actual_files
    print(f"  Missing: {len(not_found)} files (will skip)")
print()

downloaded = 0
failed = 0
label_rows = []
per_word_dl = Counter()

for i, (word_id, filepath) in enumerate(existing_matches):
    video_id = os.path.splitext(os.path.basename(filepath))[0]
    word_dir = os.path.join(VIDEO_DIR, word_id)
    os.makedirs(word_dir, exist_ok=True)
    out_path = os.path.join(word_dir, f"{video_id}.mp4")

    # Skip if already downloaded AND valid
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        # Verify it's an actual MP4
        with open(out_path, "rb") as f:
            head = f.read(8)
        if head[:4] == b"\x00\x00\x00" or head[4:8] == b"ftyp":
            label_rows.append((f"{word_id}/{video_id}.mp4", word_id))
            downloaded += 1
            per_word_dl[word_id] += 1
            continue
        else:
            # Remove corrupted file
            os.remove(out_path)

    try:
        local = hf_hub_download(
            "Voxel51/WLASL", filepath, repo_type="dataset",
        )
        # Verify the HF file is valid, then copy
        with open(local, "rb") as f:
            if f.read(4)[:4] != b"\x00\x00\x00":
                raise ValueError("Not a valid MP4")
        import shutil
        shutil.copy(local, out_path)
        label_rows.append((f"{word_id}/{video_id}.mp4", word_id))
        downloaded += 1
        per_word_dl[word_id] += 1
    except Exception as e:
        failed += 1
        if failed <= 5:
            print(f"  [WARN] {filepath}: {e}")

    if (i + 1) % 50 == 0:
        print(f"  {i+1}/{len(existing_matches)}  ok={downloaded} fail={failed}")

# Write labels CSV
with open(LABELS_CSV, "w") as f:
    for filename, label in label_rows:
        f.write(f"{filename},{label}\n")

print(f"\nDone: {downloaded} downloaded, {failed} failed")
print(f"Labels CSV: {LABELS_CSV}")
print("Per-word:")
for word, count in per_word_dl.most_common():
    print(f"  {word:20s} {count:4d}")
