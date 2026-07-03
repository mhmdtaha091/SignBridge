"""
train_psl_letters.py — train a PSL fingerspelling classifier and export it.

Reads ml/data/psl_landmarks.jsonl (from extract_psl_landmarks.py), trains an MLP
whose architecture handles 159-dim input (both hands + pose) and outputs 26 classes
(A-Z). Exports in the same signbridge-mlp-weights-v1 format as the ASL model so
the browser's starter.ts can load it.

PSL uses two-handed BANZSL fingerspelling → 159-dim features (vs ASL's 63-dim).
"""

import json
import os
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

HERE = Path(__file__).resolve().parent
LM_PATH = HERE / "data" / "psl_landmarks.jsonl"
WEB_PUBLIC = HERE.parent / "web" / "public"
MODEL_OUT = WEB_PUBLIC / "models" / "psl-default" / "model.json"
SEED_OUT = WEB_PUBLIC / "seed" / "psl-fingerspelling.json"

FEATURE_SIZE = 159  # Two hands (63+63) + pose upper (33)
SEED_PER_LETTER = 12
RNG = 42


def load() -> tuple[np.ndarray, list[str]]:
    feats, labels = [], []
    with open(LM_PATH) as f:
        for line in f:
            rec = json.loads(line)
            if len(rec["features"]) != FEATURE_SIZE:
                continue
            feats.append(rec["features"])
            labels.append(rec["label"])
    return np.asarray(feats, dtype=np.float32), labels


def main() -> None:
    X, y_raw = load()
    labels = sorted(set(y_raw))
    idx = {lbl: i for i, lbl in enumerate(labels)}
    y = np.asarray([idx[lbl] for lbl in y_raw])
    print(f"samples={len(X)} letters={len(labels)} ({''.join(labels)})")
    counts = {lbl: int((np.asarray(y_raw) == lbl).sum()) for lbl in labels}
    print("per-letter:", counts)

    if len(X) < 100:
        print(f"\n⚠ Only {len(X)} samples — model quality will be poor.")
        print("  Record more PSL samples or add more training data.")

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.15, random_state=RNG, stratify=y
    )
    clf = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation="relu",
        solver="adam",
        alpha=1e-4,
        batch_size=32,
        learning_rate_init=1e-3,
        max_iter=500,
        early_stopping=True,
        n_iter_no_change=25,
        random_state=RNG,
    )
    clf.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, clf.predict(X_te))
    print(f"\nheld-out accuracy: {acc:.3f}")

    # Per-letter recall
    cm = confusion_matrix(y_te, clf.predict(X_te))
    print("per-letter recall:")
    for i, lbl in enumerate(labels):
        tot = cm[i].sum()
        print(f"  {lbl}: {cm[i, i] / tot:.2f}" if tot else f"  {lbl}: n/a")

    # --- Export weights in tf.js setWeights order: [k1,b1,k2,b2,k3,b3] ---
    weights = []
    for w, b in zip(clf.coefs_, clf.intercepts_):
        weights.append(np.asarray(w, dtype=np.float32).tolist())
        weights.append(np.asarray(b, dtype=np.float32).tolist())

    model = {
        "format": "signbridge-mlp-weights-v1",
        "featureSize": FEATURE_SIZE,
        "labels": labels,
        "valAccuracy": round(float(acc), 4),
        "source": "Pakistan Sign Language dataset (Kaggle) + MediaPipe Hands (2-hand) + Pose",
        "architecture": [
            {"units": 128, "activation": "relu"},
            {"dropout": 0.3},
            {"units": 64, "activation": "relu"},
            {"units": len(labels), "activation": "softmax"},
        ],
        "weights": weights,
    }
    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
    with open(MODEL_OUT, "w") as f:
        json.dump(model, f)
    print(f"wrote {MODEL_OUT}  ({os.path.getsize(MODEL_OUT) // 1024} KB)")

    # --- Balanced seed for KNN + reference hand diagrams ---
    rng = np.random.default_rng(RNG)
    seed = []
    for lbl in labels:
        pool = [i for i, lab in enumerate(y_raw) if lab == lbl]
        pick = rng.choice(pool, size=min(SEED_PER_LETTER, len(pool)), replace=False)
        for i in pick:
            seed.append({"label": lbl, "features": X[i].tolist()})
    os.makedirs(os.path.dirname(SEED_OUT), exist_ok=True)
    with open(SEED_OUT, "w") as f:
        json.dump(seed, f)
    print(f"wrote {SEED_OUT}  ({len(seed)} samples, {os.path.getsize(SEED_OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
