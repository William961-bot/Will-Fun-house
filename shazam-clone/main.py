# Shazam Clone - Local Audio Fingerprint Matcher
#
# What it does:
#   1) Scans a folder of songs and builds simple fingerprints
#   2) Records a few seconds from your microphone
#   3) Prints the best matching song from your library
#
# Limitation: this cannot identify arbitrary radio hits.
# It is a learning tool. Extend it to get closer to real Shazam.
#
# Usage:
#   pip install -r requirements.txt
#   Place MP3/WAV files in library/
#   python main.py

import os
import sys
import time
import hashlib
import librosa
import numpy as np
import sounddevice as sd
from scipy.spatial.distance import cityblock
from collections import Counter

# Make sure ffmpeg is available for librosa
# Ubuntu: sudo apt install ffmpeg

LIBRARY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "library")
SAMPLE_RATE = 22050
RECORD_SECONDS = 5
MATCH_TOP_K = 3


def fingerprint_file(path):
    """Build a simple fingerprint from an audio file."""
    y, sr = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    # Trim silence so we compare actual sound
    y, _ = librosa.effects.trim(y, top_db=30)

    # MFCCs are a compact representation of timbre
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
    # Take the mean across time so every file is a fixed-size vector
    vec = np.mean(mfcc, axis=1)
    # Normalize to [0, 1] for fair distance comparison
    vec = (vec - vec.min()) / (vec.max() - vec.min() + 1e-9)
    return vec, np.linalg.norm(y)


def record_mic():
    """Record a few seconds from the default input device."""
    print(f"[*] Listening for {RECORD_SECONDS}s from your mic...")
    audio = sd.rec(
        int(RECORD_SECONDS * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
    )
    sd.wait()
    y = np.squeeze(audio)
    # Trim silence
    y, _ = librosa.effects.trim(y, top_db=30)
    return y


def quick_fingerprint(y):
    """Build a quick fingerprint from raw samples."""
    mfcc = librosa.feature.mfcc(y=y, sr=SAMPLE_RATE, n_mfcc=20)
    vec = np.mean(mfcc, axis=1)
    vec = (vec - vec.min()) / (vec.max() - vec.min() + 1e-9)
    return vec, np.linalg.norm(y)


def build_library():
    """Scan library/ and return {filename: fingerprint}."""
    db = {}
    print("[*] Building local library fingerprints...")
    exts = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}
    files = sorted(
        f
        for f in os.listdir(LIBRARY_DIR)
        if os.path.splitext(f)[1].lower() in exts
    )
    if not files:
        print(f"[!] Drop audio files into {LIBRARY_DIR} and run again.")
        sys.exit(1)

    for fname in files:
        path = os.path.join(LIBRARY_DIR, fname)
        try:
            vec, energy = fingerprint_file(path)
            db[fname] = {"vec": vec, "energy": energy}
            print(f"    Indexed: {fname}")
        except Exception as e:
            print(f"    Skipped {fname}: {e}")

    return db


def match(query_vec, query_energy, db):
    """Return best match using simple vector distance + energy heuristic."""
    scored = []
    qv = query_vec.astype(np.float64)
    for name, info in db.items():
        v = info["vec"].astype(np.float64)
        dist = cityblock(qv, v)
        # Heavily penalize huge energy mismatches
        energy_ratio = abs(query_energy - info["energy"]) / (info["energy"] + 1e-9)
        score = dist + energy_ratio
        scored.append((score, name))
    scored.sort()
    return scored[:MATCH_TOP_K]


def main():
    db = build_library()

    print("\nPress ENTER to record and match, or Ctrl+C to quit.")
    while True:
        try:
            input()
        except KeyboardInterrupt:
            print("\nBye.")
            break

        try:
            y = record_mic()
        except Exception as e:
            print(f"[!] Mic recording failed: {e}")
            continue

        if y.size == 0:
            print("[!] Recorded silence. Try again.")
            continue

        qvec, qenergy = quick_fingerprint(y)
        top = match(qvec, qenergy, db)

        print("\nGuesses:")
        for score, name in top:
            print(f"  {score:.4f}  ->  {name}")

        best = top[0][1]
        print(f"\nBest guess: {best}\n")


if __name__ == "__main__":
    main()
