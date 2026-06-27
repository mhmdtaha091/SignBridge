"""
model.py — TensorFlow / Keras GRU model for ASL temporal word-sign recognition.

Input:  (batch, window_size, 159)
Output: (batch, num_classes) softmax

Architecture:
  GRU(128, return_sequences=True) → Dropout(0.3) → GRU(64) → Dropout(0.3) → Dense(num_classes, softmax)

~300K params, ~1.2 MB when exported to TF.js — fast load in the browser.
"""

import json
import os

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data", "temporal")


def build_model(
    window_size: int = 60,
    feature_size: int = 159,
    num_classes: int = 2,
) -> keras.Model:
    model = keras.Sequential([
        layers.Input(shape=(window_size, feature_size), name="landmarks"),
        layers.GRU(128, return_sequences=True, name="gru1"),
        layers.Dropout(0.3, name="drop1"),
        layers.GRU(64, name="gru2"),
        layers.Dropout(0.3, name="drop2"),
        layers.Dense(num_classes, activation="softmax", name="output"),
    ], name="signbridge_gru")

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def load_data(data_dir: str = DATA_DIR) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Load preprocessed data. Returns (X, y, label_names)."""
    npz_path = os.path.join(data_dir, "temporal_landmarks.npz")
    labels_path = os.path.join(data_dir, "temporal_labels.json")

    if not os.path.exists(npz_path) or not os.path.exists(labels_path):
        raise FileNotFoundError(
            f"Data not found at {npz_path} / {labels_path}. "
            "Run preprocess_temporal.py first."
        )

    X = np.load(npz_path)["X"]
    with open(labels_path) as f:
        labels = json.load(f)

    # Encode labels.
    unique = sorted(set(labels))
    label_to_idx = {l: i for i, l in enumerate(unique)}
    y = np.array([label_to_idx[l] for l in labels], dtype=np.int32)

    return X, y, unique


if __name__ == "__main__":
    # Quick smoke test: create a model and print summary.
    model = build_model(window_size=60, feature_size=159, num_classes=25)
    model.summary()
    print(f"\nTrainable params: {model.count_params():,}")
