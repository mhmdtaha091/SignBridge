"""
train.py — train the default fingerspelling classifier and export it for the web app.

Reads ml/data/landmarks.jsonl (from extract_landmarks.py), trains an MLP whose
architecture matches the browser's tf.sequential in web/src/recognition/mlp.ts
(63 -> dense128 relu -> dropout -> dense64 relu -> softmax), and exports:

  web/public/models/asl-default/model.json   weights the app rebuilds into tf.js
  web/public/seed/asl-fingerspelling.json    a small balanced KNN/reference seed

Training uses scikit-learn (no TensorFlow needed on this side). The exported
weight matrices map 1:1 onto the tf.js dense layers via setWeights().
"""

import json
import os

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

HERE = os.path.dirname(os.path.abspath(__file__))
LM_PATH = os.path.join(HERE, "data", "landmarks.jsonl")
WEB_PUBLIC = os.path.normpath(os.path.join(HERE, "..", "web", "public"))
MODEL_OUT = os.path.join(WEB_PUBLIC, "models", "asl-default", "model.json")
SEED_OUT = os.path.join(WEB_PUBLIC, "seed", "asl-fingerspelling.json")

SEED_PER_LETTER = 12  # samples per letter kept for the in-browser KNN / reference poses
RNG = 42


def load() -> tuple[np.ndarray, list[str]]:
    feats, labels = [], []
    with open(LM_PATH) as f:
        for line in f:
            rec = json.loads(line)
            if len(rec["features"]) != 63:
                continue
            feats.append(rec["features"])
            labels.append(rec["label"])
    return np.asarray(feats, dtype=np.float32), labels


def main() -> None:
    X, y_raw = load()
    labels = sorted(set(y_raw))
    idx = {l: i for i, l in enumerate(labels)}
    y = np.asarray([idx[l] for l in y_raw])
    print(f"samples={len(X)} letters={len(labels)} ({''.join(labels)})")
    counts = {l: int((np.asarray(y_raw) == l).sum()) for l in labels}
    print("per-letter:", counts)

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

    # Per-letter recall, to spot the classic confusions (M/N/S/T, U/R/V).
    cm = confusion_matrix(y_te, clf.predict(X_te))
    print("per-letter recall:")
    for i, l in enumerate(labels):
        tot = cm[i].sum()
        print(f"  {l}: {cm[i, i] / tot:.2f}" if tot else f"  {l}: n/a")

    # --- export weights in tf.js setWeights order: [k1,b1,k2,b2,k3,b3] ---
    weights = []
    for w, b in zip(clf.coefs_, clf.intercepts_):
        weights.append(np.asarray(w, dtype=np.float32).tolist())
        weights.append(np.asarray(b, dtype=np.float32).tolist())
    model = {
        "format": "signbridge-mlp-weights-v1",
        "featureSize": 63,
        "labels": labels,
        "valAccuracy": round(float(acc), 4),
        "source": "Marxulia/asl_sign_languages_alphabets_v03 (CC, Hugging Face) + MediaPipe Hands",
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

    # --- balanced seed for KNN + reference hand diagrams ---
    rng = np.random.default_rng(RNG)
    seed = []
    for l in labels:
        pool = [i for i, lab in enumerate(y_raw) if lab == l]
        pick = rng.choice(pool, size=min(SEED_PER_LETTER, len(pool)), replace=False)
        for i in pick:
            seed.append({"label": l, "features": X[i].tolist()})
    os.makedirs(os.path.dirname(SEED_OUT), exist_ok=True)
    with open(SEED_OUT, "w") as f:
        json.dump(seed, f)
    print(f"wrote {SEED_OUT}  ({len(seed)} samples, {os.path.getsize(SEED_OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
