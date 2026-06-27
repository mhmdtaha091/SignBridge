"""
export_tfjs.py — export the trained Keras GRU model to TF.js format.

Usage:
  python export_tfjs.py --model ml/models/signbridge_gru.h5 --output web/public/models/gru-word-signs
"""

import argparse
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    parser = argparse.ArgumentParser(description="Export Keras model to TF.js.")
    parser.add_argument("--model", required=True, help="Path to .h5 or .keras file.")
    parser.add_argument("--labels", help="Path to labels.json (from train_temporal.py).")
    parser.add_argument("--output", required=True, help="Output directory for TF.js model.")
    args = parser.parse_args()

    if not os.path.exists(args.model):
        print(f"ERROR: Model not found at {args.model}")
        sys.exit(1)

    os.makedirs(args.output, exist_ok=True)

    # 1. Convert via tensorflowjs_converter.
    print("Converting to TF.js…")
    result = subprocess.run(
        [
            sys.executable, "-m", "tensorflowjs.converters.converter",
            "--input_format=keras",
            "--output_format=tfjs_layers_model",
            args.model,
            args.output,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"ERROR during conversion:\n{result.stderr}")
        sys.exit(1)
    print(result.stdout)

    # 2. Copy labels if provided.
    if args.labels and os.path.exists(args.labels):
        import shutil
        dest = os.path.join(args.output, "vocab.json")
        shutil.copy(args.labels, dest)
        print(f"Copied labels to {dest}")
    else:
        print("⚠ No labels file provided — vocab.json not created.")

    # 3. Verify.
    model_json = os.path.join(args.output, "model.json")
    if os.path.exists(model_json):
        size = os.path.getsize(model_json)
        print(f"✅ TF.js model created: {model_json} ({size:,} bytes)")
    else:
        print("❌ model.json not found — conversion may have failed.")


if __name__ == "__main__":
    main()
