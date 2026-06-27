"""
train_temporal.py — train the GRU word-sign model on preprocessed data.

Expects preprocess_temporal.py to have been run first, producing:
  data/temporal/temporal_landmarks.npz
  data/temporal/temporal_labels.json

Outputs:
  ml/models/signbridge_gru.h5        (Keras HDF5)
  ml/models/labels.json               (vocabulary, for export_tfjs.py)
"""

import argparse
import json
import os

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

import tensorflow as tf
from tensorflow import keras

from model import build_model, load_data

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(HERE, "models")


def main():
    parser = argparse.ArgumentParser(description="Train the GRU word-sign model.")
    parser.add_argument("--data_dir", default=os.path.join(HERE, "data", "temporal"))
    parser.add_argument("--output_dir", default=MODELS_DIR)
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--window_size", type=int, default=60)
    parser.add_argument("--feature_size", type=int, default=159)
    parser.add_argument("--val_split", type=float, default=0.15)
    args = parser.parse_args()

    # Load data.
    X, y, label_names = load_data(args.data_dir)
    print(f"Loaded {X.shape[0]} samples, {len(label_names)} classes: {label_names}")

    # Train / val split (stratified).
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=args.val_split, stratify=y, random_state=42,
    )
    print(f"Train: {X_train.shape[0]}, Val: {X_val.shape[0]}")

    # Class weights for imbalance.
    class_weights = compute_class_weight("balanced", classes=np.unique(y), y=y)
    cw_dict = dict(enumerate(class_weights))

    # Build model.
    model = build_model(
        window_size=args.window_size,
        feature_size=args.feature_size,
        num_classes=len(label_names),
    )
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=args.lr),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    # Callbacks.
    os.makedirs(args.output_dir, exist_ok=True)
    ckpt_path = os.path.join(args.output_dir, "signbridge_gru.keras")
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=15, restore_best_weights=True,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=1e-5,
        ),
        keras.callbacks.ModelCheckpoint(
            ckpt_path, monitor="val_accuracy", save_best_only=True,
        ),
    ]

    # Train.
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=args.epochs,
        batch_size=args.batch_size,
        class_weight=cw_dict,
        callbacks=callbacks,
        verbose=1,
    )

    # Eval.
    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    print(f"\nValidation accuracy: {val_acc:.4f}")

    # Save.
    h5_path = os.path.join(args.output_dir, "signbridge_gru.h5")
    model.save(h5_path)
    print(f"Model saved to {h5_path}")

    # Save label names.
    labels_path = os.path.join(args.output_dir, "labels.json")
    with open(labels_path, "w") as f:
        json.dump({"labels": label_names, "val_accuracy": float(val_acc)}, f)
    print(f"Labels saved to {labels_path}")


if __name__ == "__main__":
    main()
