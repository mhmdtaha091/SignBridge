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

# Work around tensorflowjs ecosystem conflicts on Windows.
# tensorflowjs 4.22 expects tf_keras (standalone package), but TF 2.16+
# ships Keras 3 as tensorflow.keras. Alias it before tensorflowjs imports.
import tensorflow.keras as _keras
sys.modules["tf_keras"] = _keras
sys.modules["tf_keras.layers"] = _keras.layers

# tensorflowjs eagerly imports many optional backends (JAX, TF-DF, TF-Hub, etc.)
# that aren't needed for Keras .h5 conversion. Provide stubs for any that are
# missing so the converter can load without installing the entire ecosystem.
class _FakeModule:
    """Placeholder module that supports arbitrary submodule access and imports."""
    __path__ = []  # Makes it look like a package (supports 'from X.Y import Z')

    def __init__(self, _name: str = ""):
        self.__name__ = _name
        self.__all__ = []

    def __getattr__(self, name: str):
        if name.startswith("_"):
            raise AttributeError(name)
        child = _FakeModule(f"{self.__name__}.{name}")
        setattr(self, name, child)
        # Also register in sys.modules so 'from parent.child import X' works
        sys.modules[child.__name__] = child
        return child

_FAKE_ROOTS = [
    "tensorflow_decision_forests",
    "tensorflow_hub",
    "jax",
    "flax",
    "tf2onnx",
]
for _mod in _FAKE_ROOTS:
    if _mod not in sys.modules:
        sys.modules[_mod] = _FakeModule(_mod)

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

    # 1. Convert via tensorflowjs_converter (in-process to inherit monkey-patches).
    print("Converting to TF.js…")
    from tensorflowjs.converters import converter
    converter.convert([
        "--input_format=keras",
        "--output_format=tfjs_layers_model",
        args.model,
        args.output,
    ])
    print("Conversion complete.")

    # 2. Copy labels if provided.
    if args.labels and os.path.exists(args.labels):
        import shutil
        dest = os.path.join(args.output, "vocab.json")
        shutil.copy(args.labels, dest)
        print(f"Copied labels to {dest}")
    else:
        print("[WARN] No labels file provided — vocab.json not created.")

    # 3. Verify.
    model_json = os.path.join(args.output, "model.json")
    if os.path.exists(model_json):
        size = os.path.getsize(model_json)
        print(f"[OK] TF.js model created: {model_json} ({size:,} bytes)")
    else:
        print("[ERROR] model.json not found — conversion may have failed.")


if __name__ == "__main__":
    main()
