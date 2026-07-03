"""
train_psl_gru.py — Train PSL word-sign GRU model from Kaggle Dynamic Word-Level dataset.
Optimized for CPU training: uses subset of recordings, efficient batch loading.
"""
import os, json, glob
import numpy as np
from collections import Counter
from sklearn.model_selection import train_test_split
import tensorflow as tf

# Config
BASE = 'data/psl_words/PakistanSignLanguageDatasetV2/PakistanSignLanguageDatasetV2/laptop_data'
WINDOW_SIZE = 30
STRIDE = 15
FEATURE_SIZE = 159
MAX_RECORDINGS = 8      # recordings per word (down from 50)
MAX_FRAMES = 60          # frames per recording
EPOCHS = 50
BATCH_SIZE = 32
LEARNING_RATE = 1e-3

# ── Load data ──────────────────────────────────────────────────────────
words = sorted(os.listdir(BASE))
print(f'Found {len(words)} words')

X_list, y_list = [], []
label_counts = Counter()

for wi, word in enumerate(words):
    word_path = os.path.join(BASE, word)
    if not os.path.isdir(word_path): continue

    person_dirs = sorted(os.listdir(word_path))[:MAX_RECORDINGS]

    for person_dir in person_dirs:
        person_path = os.path.join(word_path, person_dir)
        if not os.path.isdir(person_path): continue

        npy_files = sorted(
            glob.glob(os.path.join(person_path, '*.npy')),
            key=lambda x: int(os.path.splitext(os.path.basename(x))[0])
        )[:MAX_FRAMES]

        if len(npy_files) < WINDOW_SIZE: continue

        # Fast batch load
        frames = np.zeros((len(npy_files), FEATURE_SIZE), dtype=np.float32)
        for fi, nf in enumerate(npy_files):
            f = np.load(nf).astype(np.float32)
            n = min(len(f), FEATURE_SIZE)
            frames[fi, :n] = f[:n]

        # Window
        for start in range(0, len(frames) - WINDOW_SIZE + 1, STRIDE):
            window = frames[start:start + WINDOW_SIZE].copy()
            X_list.append(window)
            y_list.append(word)
            label_counts[word] += 1

    if (wi + 1) % 10 == 0:
        print(f'  Loaded {wi+1}/{len(words)} words, {len(X_list)} windows so far...')

print(f'\nTotal: {len(X_list)} windows, {len(set(y_list))} unique words')

# Filter sparse words (< 10 windows)
keepers = {w for w, c in label_counts.items() if c >= 10}
filtered = [(x, lbl) for x, lbl in zip(X_list, y_list) if lbl in keepers]
X = np.array([f[0] for f in filtered], dtype=np.float32)
y_raw = [f[1] for f in filtered]
unique_labels = sorted(set(y_raw))
label_to_idx = {l: i for i, l in enumerate(unique_labels)}
y_enc = np.array([label_to_idx[l] for l in y_raw], dtype=np.int32)
print(f'After filtering: {len(X)} windows, {len(unique_labels)} words')

# Save labels for TF.js
os.makedirs('data', exist_ok=True)
with open('data/psl_word_labels.json', 'w') as f:
    json.dump({'labels': unique_labels}, f)

# ── Train/val split ────────────────────────────────────────────────────
X_tr, X_val, y_tr, y_val = train_test_split(
    X, y_enc, test_size=0.15, random_state=42, stratify=y_enc
)
print(f'Train: {len(X_tr)}, Val: {len(X_val)}')

# ── Build GRU ──────────────────────────────────────────────────────────
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(WINDOW_SIZE, FEATURE_SIZE), name='landmarks'),
    tf.keras.layers.GRU(128, return_sequences=True, name='gru1'),
    tf.keras.layers.Dropout(0.3, name='drop1'),
    tf.keras.layers.GRU(64, name='gru2'),
    tf.keras.layers.Dropout(0.3, name='drop2'),
    tf.keras.layers.Dense(len(unique_labels), activation='softmax', name='output'),
], name='signbridge_gru')

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy'],
)
model.summary()

# ── Train ──────────────────────────────────────────────────────────────
callbacks = [
    tf.keras.callbacks.EarlyStopping(
        monitor='val_accuracy', patience=12, restore_best_weights=True, min_delta=0.002
    ),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor='val_loss', factor=0.5, patience=5, min_lr=1e-5
    ),
]

print(f'\nTraining on {len(X_tr)} windows, {len(unique_labels)} words...\n')
history = model.fit(
    X_tr, y_tr,
    validation_data=(X_val, y_val),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=callbacks,
    verbose=2,
)

best_acc = max(history.history['val_accuracy'])
print(f'\nBest val accuracy: {best_acc:.4f} ({best_acc*100:.1f}%)')

# ── Save ───────────────────────────────────────────────────────────────
os.makedirs('models', exist_ok=True)
model.save('models/signbridge_psl_gru.h5')
model.save('models/signbridge_psl_gru.keras')

labels_json = {
    'labels': unique_labels,
    'val_accuracy': float(best_acc),
    'num_classes': len(unique_labels),
    'feature_size': FEATURE_SIZE,
    'window_size': WINDOW_SIZE,
}
with open('models/psl_labels.json', 'w') as f:
    json.dump(labels_json, f, indent=2)

print(f'Model saved to models/signbridge_psl_gru.h5')
print('Done!')
