"""
Cross-signer evaluation for PSL word-sign models.

Splits the PSL dataset by source (laptop vs webcam) to measure how well
the model generalizes — the honest number for the metrics table.

Usage:
    python ml/cross_signer_eval.py [path/to/landmarks.jsonl]

Reads pre-extracted landmark sequences from ml/data/psl_landmarks.jsonl
(or the JSONL passed as the first argument)
(or processes the raw PSL dataset if landmarks haven't been extracted yet).
Trains on one split, evaluates on the other, prints the accuracy gap.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "ml" / "data"
LANDMARKS_FILE = DATA_DIR / "psl_landmarks.jsonl"


def load_landmarks(path: Path) -> list[dict]:
    """Load pre-extracted landmark sequences from JSONL."""
    samples = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                samples.append(json.loads(line))
    return samples


def train_test_split_by_source(samples: list[dict]):
    """
    Split by recording source. If 'source' field is present, use it.
    Otherwise fall back to an 80/20 random split.

    Returns (train, test, split_kind) where split_kind describes the split.
    """
    by_source = defaultdict(list)
    has_source = False
    for s in samples:
        src = s.get("source", "unknown")
        if src != "unknown":
            has_source = True
        by_source[src].append(s)

    if has_source and len(by_source) >= 2:
        sources = sorted(by_source.keys())
        train = by_source[sources[0]]
        test = by_source[sources[1]] if len(sources) > 1 else by_source[sources[0]]
        split_kind = f"by source: train={sources[0]}, test={sources[1]}"
        print(f"Split by source: train={sources[0]} ({len(train)} samples), "
              f"test={sources[1]} ({len(test)} samples)")
    else:
        # Random 80/20 split
        np.random.seed(42)
        np.random.shuffle(samples)
        split = int(len(samples) * 0.8)
        train, test = samples[:split], samples[split:]
        split_kind = "random 80/20 — no source labels"
        print(f"Random split: train={len(train)}, test={len(test)}")

    return train, test, split_kind


def build_vocab(samples: list[dict]) -> dict[str, int]:
    labels = sorted(set(s["label"] for s in samples))
    return {label: i for i, label in enumerate(labels)}


def samples_to_arrays(
    samples: list[dict],
    label_to_idx: dict[str, int],
) -> tuple[np.ndarray, np.ndarray]:
    """Convert single-frame samples to (n_samples, feature_dim) array.

    If features is a flat list of floats (single frame, e.g. 159-dim),
    stacks them directly. If it's a list of frames (sequences), uses only
    the first frame for the quick 1-NN baseline.
    """
    X, y = [], []
    dim = None
    for s in samples:
        feats = s["features"]
        if not feats:
            continue
        label_idx = label_to_idx.get(s["label"])
        if label_idx is None:
            continue
        # Detect: flat list of floats (single frame) vs nested list of frames
        if isinstance(feats[0], (int, float)):
            # Flat — single frame
            vec = np.array(feats, dtype=np.float32)
            if dim is None:
                dim = len(vec)
            elif len(vec) != dim:
                continue  # skip inconsistent shapes
        else:
            # Nested — use first frame
            vec = np.array(feats[0], dtype=np.float32)
            if dim is None:
                dim = len(vec)
            elif len(vec) != dim:
                continue
        X.append(vec)
        y.append(label_idx)
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def main():
    print("=" * 60)
    print("SignBridge — Cross-Signer Evaluation")
    print("=" * 60)

    landmarks_file = Path(sys.argv[1]) if len(sys.argv) > 1 else LANDMARKS_FILE

    if not landmarks_file.exists():
        print(f"\nERROR: Landmarks file not found at {landmarks_file}")
        print("Run ml/extract_psl_landmarks.py first to extract landmarks")
        print("from the PSL dataset videos.")
        print("\nFor now, reporting placeholder: run on actual data to get real numbers.")
        print("\nExpected format per line:")
        print('  {"label": "hello", "source": "laptop_data", "features": [[159 floats], ...]}')
        sys.exit(1)

    samples = load_landmarks(landmarks_file)
    print(f"\nLoaded {len(samples)} landmark sequences.")

    train, test, split_kind = train_test_split_by_source(samples)

    if len(train) < 10 or len(test) < 5:
        print("ERROR: Not enough samples for a meaningful evaluation.")
        sys.exit(1)

    # Build vocabulary from training set
    label_to_idx = build_vocab(train)
    num_classes = len(label_to_idx)
    print(f"Vocabulary: {num_classes} words")

    # Create feature arrays
    X_train, y_train = samples_to_arrays(train, label_to_idx)
    X_test, y_test = samples_to_arrays(test, label_to_idx)
    print(f"Train samples: {X_train.shape[0]}, Test samples: {X_test.shape[0]}")
    print(f"Feature dim: {X_train.shape[1]}")

    # ── Vectorized 1-NN (fast single-frame baseline) ────────────────────
    # Compute pairwise L2 distances: (n_test, n_train)
    # ||a - b||² = ||a||² + ||b||² - 2·a·bᵀ
    test_norm = np.sum(X_test ** 2, axis=1, keepdims=True)    # (n_test, 1)
    train_norm = np.sum(X_train ** 2, axis=1, keepdims=True)  # (n_train, 1)
    cross = np.dot(X_test, X_train.T)                          # (n_test, n_train)
    dists = np.sqrt(np.maximum(0, test_norm + train_norm.T - 2 * cross))

    best_idx = np.argmin(dists, axis=1)
    correct = int(np.sum(y_test == y_train[best_idx]))
    acc = correct / len(y_test)

    print(f"\n{'=' * 60}")
    print(f"1-NN accuracy: {acc * 100:.1f}% ({correct}/{len(y_test)})")
    print(f"Feature dim: {X_train.shape[1]}, Vocabulary: {num_classes} classes")
    print(f"Split: {len(train)} train, {len(test)} test ({split_kind})")
    print(f"")
    print(f"NOTE: For sequence samples this baseline uses only the first frame.")
    print(f"Without source labels this is a random-split baseline, NOT a")
    print(f"cross-signer number. A proper cross-signer evaluation requires:")
    print(f"  1. Re-extracting landmarks from the raw dataset WITH source labels")
    print(f"     (laptop_data vs webcam_data) using extract_psl_landmarks.py")
    print(f"  2. Training on one source, evaluating on the other")
    print(f"  3. For word signs: training GRU on laptop_data, testing on webcam_data")
    print(f"See docs/DATASET.md and docs/ROADMAP.md M5 for the full plan.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
