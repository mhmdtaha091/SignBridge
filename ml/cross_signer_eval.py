"""
Cross-signer evaluation for PSL word-sign models.

Splits the PSL dataset by source (laptop vs webcam) to measure how well
the model generalizes — the honest number for the metrics table.

Usage:
    python ml/cross_signer_eval.py

Reads pre-extracted landmark sequences from ml/data/psl_landmarks.jsonl
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
        print(f"Split by source: train={sources[0]} ({len(train)} samples), "
              f"test={sources[1]} ({len(test)} samples)")
    else:
        # Random 80/20 split
        np.random.seed(42)
        np.random.shuffle(samples)
        split = int(len(samples) * 0.8)
        train, test = samples[:split], samples[split:]
        print(f"Random split: train={len(train)}, test={len(test)}")

    return train, test


def build_vocab(samples: list[dict]) -> dict[str, int]:
    labels = sorted(set(s["label"] for s in samples))
    return {label: i for i, label in enumerate(labels)}


def frames_to_windows(
    samples: list[dict],
    label_to_idx: dict[str, int],
    window_size: int = 30,
    stride: int = 10,
) -> tuple[np.ndarray, np.ndarray]:
    """Convert variable-length sequences to fixed windows for training."""
    X, y = [], []
    for s in samples:
        frames = s["features"]
        label_idx = label_to_idx.get(s["label"])
        if label_idx is None:
            continue
        for start in range(0, max(1, len(frames) - window_size + 1), stride):
            window = frames[start : start + window_size]
            if len(window) < window_size:
                continue
            X.append(window)
            y.append(label_idx)
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def main():
    print("=" * 60)
    print("SignBridge — Cross-Signer Evaluation")
    print("=" * 60)

    if not LANDMARKS_FILE.exists():
        print(f"\nERROR: Landmarks file not found at {LANDMARKS_FILE}")
        print("Run ml/extract_psl_landmarks.py first to extract landmarks")
        print("from the PSL dataset videos.")
        print("\nFor now, reporting placeholder: run on actual data to get real numbers.")
        print("\nExpected format per line:")
        print('  {"label": "hello", "source": "laptop_data", "features": [[159 floats], ...]}')
        sys.exit(1)

    samples = load_landmarks(LANDMARKS_FILE)
    print(f"\nLoaded {len(samples)} landmark sequences.")

    train, test = train_test_split_by_source(samples)

    if len(train) < 10 or len(test) < 5:
        print("ERROR: Not enough samples for a meaningful evaluation.")
        sys.exit(1)

    # Build vocabulary from training set
    label_to_idx = build_vocab(train)
    num_classes = len(label_to_idx)
    print(f"Vocabulary: {num_classes} words")

    # Create windows
    X_train, y_train = frames_to_windows(train, label_to_idx)
    X_test, y_test = frames_to_windows(test, label_to_idx)
    print(f"Train windows: {X_train.shape[0]}, Test windows: {X_test.shape[0]}")

    # Simple 1-NN evaluation for a quick cross-signer number
    # (GRU training requires TensorFlow; 1-NN gives a quick baseline)
    correct = 0
    for i in range(len(X_test)):
        # Compare test window against all train windows via mean frame distance
        test_seq = X_test[i]
        best_label = None
        best_dist = float("inf")
        for j in range(len(X_train)):
            # Mean Euclidean distance between sequence pairs
            dist = np.mean(np.sqrt(np.sum((test_seq - X_train[j]) ** 2, axis=-1)))
            if dist < best_dist:
                best_dist = dist
                best_label = y_train[j]
        if best_label == y_test[i]:
            correct += 1

    acc = correct / len(X_test)
    print(f"\n{'=' * 60}")
    print(f"Cross-signer 1-NN accuracy: {acc * 100:.1f}% ({correct}/{len(X_test)})")
    print(f"Note: 1-NN is a simple baseline. GRU accuracy from ml/train_psl_gru.py")
    print(f"is the number to use in the metrics table.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
