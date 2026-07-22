"""
cross_source_gru_eval.py — The honest generalization number for PSL word signs.

Trains the exact GRU architecture from train_psl_gru.py on ONE capture source
(laptop_data) and evaluates on the OTHERS (webcam_data, mobile_data) — i.e.
recordings the model has never seen from capture setups it has never seen.

This is the number the README metrics table cites as "cross-source"; the
in-source val accuracy (random split) is NOT a generalization claim.

Usage (from repo root):
    ml/.venv/Scripts/python.exe ml/cross_source_gru_eval.py

Writes results + config to ml/results/cross_source_gru_<timestamp>.json so the
published number always traces to a run captured on disk (workspace rule).
"""
import os, json, glob, random, sys, time
from pathlib import Path
from collections import Counter, defaultdict

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
BASE = SCRIPT_DIR / 'data' / 'psl_words' / 'PakistanSignLanguageDatasetV2' / 'PakistanSignLanguageDatasetV2'
RESULTS_DIR = SCRIPT_DIR / 'results'

TRAIN_SOURCE = 'laptop_data'
TEST_SOURCES = ['webcam_data', 'mobile_data']

# Mirror train_psl_gru.py exactly so the comparison is apples-to-apples.
WINDOW_SIZE = 30
STRIDE = 15
FEATURE_SIZE = 159
MAX_RECORDINGS = 8       # per word, per source (same budget as the shipped model)
MAX_FRAMES = 60
EPOCHS = 50
BATCH_SIZE = 32
LEARNING_RATE = 1e-3
SEED = 42


def load_source(source: str, words: list[str]):
    """Load windowed sequences for one capture source.

    Returns (windows, window_labels, rec_windows) where rec_windows maps a
    recording id -> list of window indices (for per-recording majority vote).
    """
    X, y = [], []
    rec_windows = defaultdict(list)
    src_path = BASE / source
    for word in words:
        word_path = src_path / word
        if not word_path.is_dir():
            continue
        person_dirs = sorted(os.listdir(word_path))[:MAX_RECORDINGS]
        for person_dir in person_dirs:
            person_path = word_path / person_dir
            if not person_path.is_dir():
                continue
            npy_files = sorted(
                glob.glob(str(person_path / '*.npy')),
                key=lambda x: int(os.path.splitext(os.path.basename(x))[0])
            )[:MAX_FRAMES]
            if len(npy_files) < WINDOW_SIZE:
                continue
            frames = np.zeros((len(npy_files), FEATURE_SIZE), dtype=np.float32)
            for fi, nf in enumerate(npy_files):
                f = np.load(nf).astype(np.float32)
                n = min(len(f), FEATURE_SIZE)
                frames[fi, :n] = f[:n]
            rec_id = f'{source}/{word}/{person_dir}'
            for start in range(0, len(frames) - WINDOW_SIZE + 1, STRIDE):
                rec_windows[rec_id].append(len(X))
                X.append(frames[start:start + WINDOW_SIZE].copy())
                y.append(word)
    return X, y, rec_windows


def main():
    random.seed(SEED)
    np.random.seed(SEED)
    import tensorflow as tf
    tf.random.set_seed(SEED)

    if not BASE.is_dir():
        print(f'ERROR: dataset not found at {BASE}')
        sys.exit(1)

    all_words = sorted(d for d in os.listdir(BASE / TRAIN_SOURCE)
                       if (BASE / TRAIN_SOURCE / d).is_dir())
    print(f'{len(all_words)} words in {TRAIN_SOURCE}')

    print(f'\nLoading train source: {TRAIN_SOURCE} ...')
    X_tr_raw, y_tr_raw, _ = load_source(TRAIN_SOURCE, all_words)
    print(f'  {len(X_tr_raw)} windows')

    test_raw = {}
    for src in TEST_SOURCES:
        if not (BASE / src).is_dir():
            print(f'  (skipping missing source {src})')
            continue
        print(f'Loading test source: {src} ...')
        test_raw[src] = load_source(src, all_words)
        print(f'  {len(test_raw[src][0])} windows')

    # Keep classes with enough training windows AND present in every test source
    # (same >=10-window floor as train_psl_gru.py).
    tr_counts = Counter(y_tr_raw)
    keep = {w for w, c in tr_counts.items() if c >= 10}
    for src, (_, y_te, _) in test_raw.items():
        keep &= set(y_te)
    labels = sorted(keep)
    label_to_idx = {l: i for i, l in enumerate(labels)}
    print(f'\nEvaluating on {len(labels)} classes present in all sources')

    def filt(X, y):
        pairs = [(x, label_to_idx[l]) for x, l in zip(X, y) if l in keep]
        Xa = np.array([p[0] for p in pairs], dtype=np.float32)
        ya = np.array([p[1] for p in pairs], dtype=np.int32)
        return Xa, ya

    X_tr, y_tr = filt(X_tr_raw, y_tr_raw)

    # Small in-source val split for early stopping only (not a reported metric).
    from sklearn.model_selection import train_test_split
    X_tr, X_val, y_tr, y_val = train_test_split(
        X_tr, y_tr, test_size=0.1, random_state=SEED, stratify=y_tr)
    print(f'Train: {len(X_tr)}  val(in-source): {len(X_val)}')

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(WINDOW_SIZE, FEATURE_SIZE), name='landmarks'),
        tf.keras.layers.GRU(128, return_sequences=True, name='gru1'),
        tf.keras.layers.Dropout(0.3, name='drop1'),
        tf.keras.layers.GRU(64, name='gru2'),
        tf.keras.layers.Dropout(0.3, name='drop2'),
        tf.keras.layers.Dense(len(labels), activation='softmax', name='output'),
    ], name='cross_source_gru')
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
                  loss='sparse_categorical_crossentropy', metrics=['accuracy'])

    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor='val_accuracy', patience=12,
                                         restore_best_weights=True, min_delta=0.002),
        tf.keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                                             patience=5, min_lr=1e-5),
    ]
    t0 = time.time()
    hist = model.fit(X_tr, y_tr, validation_data=(X_val, y_val), epochs=EPOCHS,
                     batch_size=BATCH_SIZE, callbacks=callbacks, verbose=2)
    train_secs = time.time() - t0
    in_source_val = float(max(hist.history['val_accuracy']))

    results = {
        'script': 'ml/cross_source_gru_eval.py',
        'train_source': TRAIN_SOURCE,
        'num_classes': len(labels),
        'train_windows': int(len(X_tr)),
        'in_source_val_accuracy': round(in_source_val, 4),
        'train_seconds': round(train_secs, 1),
        'config': {'window': WINDOW_SIZE, 'stride': STRIDE, 'feature_size': FEATURE_SIZE,
                   'max_recordings': MAX_RECORDINGS, 'max_frames': MAX_FRAMES,
                   'epochs': EPOCHS, 'batch': BATCH_SIZE, 'lr': LEARNING_RATE, 'seed': SEED},
        'test_sources': {},
    }

    print('\n' + '=' * 64)
    print(f'In-source val accuracy (random split, {TRAIN_SOURCE}): {in_source_val*100:.1f}%')
    for src, (X_raw, y_raw, rec_windows) in test_raw.items():
        X_te, y_te = filt(X_raw, y_raw)
        probs = model.predict(X_te, batch_size=128, verbose=0)
        preds = probs.argmax(axis=1)
        win_acc = float((preds == y_te).mean())

        # Per-recording majority vote — closer to what a user experiences.
        kept_idx = [i for i, l in enumerate(y_raw) if l in keep]
        old_to_new = {old: new for new, old in enumerate(kept_idx)}
        rec_correct = rec_total = 0
        for rec_id, idxs in rec_windows.items():
            new_idxs = [old_to_new[i] for i in idxs if i in old_to_new]
            if not new_idxs:
                continue
            vote = Counter(preds[new_idxs]).most_common(1)[0][0]
            rec_correct += int(vote == y_te[new_idxs[0]])
            rec_total += 1
        rec_acc = rec_correct / rec_total if rec_total else 0.0

        print(f'{src:>12}: window acc {win_acc*100:5.1f}%  ({len(X_te)} windows) | '
              f'recording majority-vote acc {rec_acc*100:5.1f}%  ({rec_total} recordings)')
        results['test_sources'][src] = {
            'window_accuracy': round(win_acc, 4), 'windows': int(len(X_te)),
            'recording_majority_vote_accuracy': round(rec_acc, 4),
            'recordings': rec_total,
        }
    print('=' * 64)

    RESULTS_DIR.mkdir(exist_ok=True)
    stamp = time.strftime('%Y%m%d_%H%M%S')
    out = RESULTS_DIR / f'cross_source_gru_{stamp}.json'
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print(f'\nResults written to {out}')


if __name__ == '__main__':
    main()
