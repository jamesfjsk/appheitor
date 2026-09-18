#!/usr/bin/env python3
"""Tema original da Vila do Heitor — loop quente de RPG, sem copiar OST nenhuma."""
from __future__ import annotations

from pathlib import Path

import lameenc
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
BPM = 84.0
BEAT = 60.0 / BPM
BARS = 32
N = int(round(BARS * 4 * BEAT * SR))
RNG = np.random.default_rng(18)

NOTE = {
    n: 440.0 * (2.0 ** ((m - 69) / 12.0))
    for n, m in {
        'G2': 43, 'A2': 45, 'B2': 47, 'C3': 48, 'D3': 50, 'E3': 52, 'F3': 53, 'Fs3': 54, 'G3': 55,
        'A3': 57, 'B3': 59, 'C4': 60, 'D4': 62, 'E4': 64, 'Fs4': 66, 'G4': 67, 'A4': 69, 'B4': 71,
        'C5': 72, 'D5': 74, 'E5': 76, 'Fs5': 78, 'G5': 79, 'A5': 81, 'B5': 83, 'C6': 84, 'D6': 86,
        'G6': 91,
    }.items()
}

CHORDS = {
    'G':  ['G2', 'B2', 'D3', 'G3', 'B3', 'D4'],
    'Em': ['E3', 'G3', 'B3', 'E4', 'G4', 'B4'],
    'C':  ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'],
    'D':  ['D3', 'Fs3', 'A3', 'D4', 'Fs4', 'A4'],
    'Bm': ['B2', 'D3', 'Fs3', 'B3', 'D4', 'Fs4'],
    'Am': ['A2', 'C3', 'E3', 'A3', 'C4', 'E4'],
}

PROG = (
    ['G', 'Em', 'C', 'D'] * 2
    + ['Em', 'C', 'G', 'D', 'C', 'D', 'G', 'G']
    + ['G', 'Em', 'C', 'D', 'G', 'Bm', 'Am', 'D']
    + ['Em', 'C', 'G', 'D', 'C', 'D', 'G', 'G']
)


def midi_env(n: int, attack=0.012, release=0.08) -> np.ndarray:
    t = np.arange(n) / SR
    dur = n / SR
    att = np.minimum(t / max(attack, 1e-4), 1.0)
    rel = np.minimum(np.maximum(dur - t, 0.0) / max(release, 1e-4), 1.0)
    return att * rel


def flute(freq: float, dur: float, amp: float) -> np.ndarray:
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    env = midi_env(n, 0.04, 0.12) * (1 - np.exp(-t * 18))
    vib = 1.0 + 0.0038 * np.sin(2 * np.pi * 5.05 * t)
    f = freq * vib
    mod = np.sin(2 * np.pi * f * t)
    car = np.sin(2 * np.pi * f * t + 1.65 * mod * env)
    breath = 0.03 * RNG.standard_normal(n) * env
    return (amp * env * (car + breath)).astype(np.float64)


def pluck(freq: float, dur: float, amp: float, decay=3.4) -> np.ndarray:
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    env = np.exp(-t * decay) * (1 - np.exp(-t * 90))
    sig = np.zeros(n)
    for k, a in enumerate((1.0, 0.42, 0.18, 0.08), 1):
        det = 1.0 + 0.0012 * (k - 1)
        sig += a * np.sin(2 * np.pi * freq * k * det * t)
    return amp * env * sig


def bass(freq: float, dur: float, amp: float) -> np.ndarray:
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    env = midi_env(n, 0.02, 0.18) * np.exp(-t * 0.55)
    sine = np.sin(2 * np.pi * freq * t)
    tri = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * freq * t))
    return amp * env * (0.78 * sine + 0.22 * tri)


def pad_saw(freq: float, n: int) -> np.ndarray:
    t = np.arange(n) / SR
    s = np.zeros(n)
    for det in (1.0, 1.004, 0.996):
        s += 2 * ((t * freq * det) % 1.0) - 1.0
    return s / 3.0


def butter_lp(x: np.ndarray, cutoff: float, order=3) -> np.ndarray:
    b, a = butter(order, cutoff / (SR * 0.5), btype='low')
    return lfilter(b, a, x)


def butter_hp(x: np.ndarray, cutoff: float) -> np.ndarray:
    b, a = butter(2, cutoff / (SR * 0.5), btype='high')
    return lfilter(b, a, x)


def mix_in(stereo: np.ndarray, start: float, wave: np.ndarray, pan=0.0, widen=0.0):
    i0 = int(round(start * SR))
    if i0 >= stereo.shape[0]:
        return
    n = min(wave.shape[0], stereo.shape[0] - i0)
    w = wave[:n]
    left = np.sqrt(0.5 * (1.0 - pan))
    right = np.sqrt(0.5 * (1.0 + pan))
    stereo[i0:i0 + n, 0] += w * left
    stereo[i0:i0 + n, 1] += w * right
    if widen > 0:
        d = int(widen * SR)
        j0 = i0 + d
        m = min(n, stereo.shape[0] - j0)
        if m > 0:
            stereo[j0:j0 + m, 1] += w[:m] * right * 0.35


def comb_reverb(x: np.ndarray) -> np.ndarray:
    y = x.copy()
    for delay, g in ((1553, 0.28), (1613, 0.26), (1493, 0.24), (2053, 0.18)):
        y[delay:] += g * x[:-delay]
    return y


FLUTE_A = [
    (0, 1.0, 'G4', 1.0), (0, 2.0, 'A4', 1.0), (0, 3.0, 'B4', 1.0),
    (1, 0.0, 'D5', 2.0), (1, 2.0, 'B4', 1.0), (1, 3.0, 'A4', 1.0),
    (2, 0.0, 'G4', 1.0), (2, 1.0, 'E4', 1.0), (2, 2.0, 'D4', 2.0),
    (3, 0.0, 'E4', 1.0), (3, 1.0, 'G4', 1.0), (3, 2.0, 'A4', 2.0),
    (4, 0.0, 'B4', 2.0), (4, 2.0, 'D5', 1.0), (4, 3.0, 'E5', 1.0),
    (5, 0.0, 'D5', 2.0), (5, 2.0, 'B4', 1.0), (5, 3.0, 'G4', 1.0),
    (6, 0.0, 'A4', 1.5), (6, 1.5, 'B4', 0.5), (6, 2.0, 'G4', 2.0),
    (7, 0.0, 'D4', 3.0),
]
FLUTE_B = [
    (0, 0.0, 'G5', 1.0), (0, 1.0, 'E5', 1.0), (0, 2.0, 'D5', 1.0), (0, 3.0, 'B4', 1.0),
    (1, 0.0, 'A4', 1.0), (1, 1.0, 'G4', 1.0), (1, 2.0, 'E4', 2.0),
    (2, 0.0, 'E4', 1.0), (2, 1.0, 'G4', 1.0), (2, 2.0, 'A4', 1.0), (2, 3.0, 'D5', 1.0),
    (3, 0.0, 'B4', 3.0),
    (4, 0.0, 'C5', 1.0), (4, 1.0, 'B4', 1.0), (4, 2.0, 'A4', 1.0), (4, 3.0, 'G4', 1.0),
    (5, 0.0, 'E4', 1.0), (5, 1.0, 'G4', 1.0), (5, 2.0, 'D4', 2.0),
    (6, 0.0, 'A3', 1.0), (6, 1.0, 'B3', 1.0), (6, 2.0, 'D4', 1.0), (6, 3.0, 'E4', 1.0),
    (7, 0.0, 'G4', 3.5),
]


def shift(phrase, bar0: int):
    return [(bar + bar0, beat, name, dur) for bar, beat, name, dur in phrase]


MELODY = shift(FLUTE_A, 0) + shift(FLUTE_B, 8) + shift(FLUTE_A, 16) + shift(FLUTE_B, 24)


def bar_time(bar: int, beat: float = 0.0) -> float:
    return (bar * 4 + beat) * BEAT


def render() -> np.ndarray:
    stereo = np.zeros((N, 2), dtype=np.float64)

    for bar, name in enumerate(PROG):
        tones = CHORDS[name]
        dur = 4 * BEAT + 0.08
        n = int(dur * SR)
        chord = np.zeros(n)
        for i, tn in enumerate(tones[:4]):
            chord += pad_saw(NOTE[tn], n) * (0.22 if i < 2 else 0.14)
        chord = butter_lp(chord, 720) * midi_env(n, 0.08, 0.2) * 0.11
        mix_in(stereo, bar_time(bar), chord, pan=0.0, widen=0.013)

    fifth = {'G': 'D3', 'Em': 'B2', 'C': 'G2', 'D': 'A2', 'Bm': 'Fs3', 'Am': 'E3'}
    for bar, name in enumerate(PROG):
        mix_in(stereo, bar_time(bar, 0), bass(NOTE[CHORDS[name][0]], 2.05 * BEAT, 0.22), pan=-0.08)
        mix_in(stereo, bar_time(bar, 2), bass(NOTE[fifth[name]], 1.95 * BEAT, 0.16), pan=-0.08)

    arp_idx = (0, 3, 4, 5, 4, 3, 2, 3)
    for bar, name in enumerate(PROG):
        tones = CHORDS[name]
        for i, ai in enumerate(arp_idx):
            note = tones[min(ai, len(tones) - 1)]
            amp = 0.07 if i % 2 == 0 else 0.055
            mix_in(
                stereo,
                bar_time(bar, i * 0.5),
                pluck(NOTE[note], 1.15 * BEAT, amp, decay=3.8),
                pan=0.18 if i % 2 else -0.12,
            )

    for bar, beat, name, dur in MELODY:
        amp = 0.20 if bar < 16 else 0.22
        mix_in(stereo, bar_time(bar, beat), flute(NOTE[name], dur * BEAT * 1.02, amp), pan=-0.16)

    echo = [
        (9, 2.0, 'G5', 1.0), (11, 2.0, 'D5', 1.5),
        (13, 0.0, 'E5', 1.0), (15, 1.0, 'B4', 2.0),
        (25, 2.0, 'G5', 1.0), (27, 2.0, 'D5', 1.5),
        (29, 0.0, 'E5', 1.0), (31, 1.0, 'B4', 2.0),
    ]
    for bar, beat, name, dur in echo:
        mix_in(stereo, bar_time(bar, beat), pluck(NOTE[name], dur * BEAT, 0.045, decay=2.6), pan=0.35)

    for bar in range(0, BARS, 2):
        mix_in(stereo, bar_time(bar, 2.5), pluck(NOTE['G6'], 0.55, 0.028, decay=7.0), pan=0.22)

    wet = np.stack([comb_reverb(stereo[:, 0]), comb_reverb(stereo[:, 1])], axis=1)
    mix = 0.72 * stereo + 0.28 * wet
    mix[:, 0] = butter_hp(mix[:, 0], 42)
    mix[:, 1] = butter_hp(mix[:, 1], 42)
    mix[:, 0] = butter_lp(mix[:, 0], 11800)
    mix[:, 1] = butter_lp(mix[:, 1], 11800)

    peak = np.max(np.abs(mix)) or 1.0
    mix = np.tanh(mix * (0.92 / peak))
    return mix.astype(np.float32)


def encode_mp3(stereo: np.ndarray, path: Path):
    pcm = np.clip(stereo * 32767.0, -32767, 32767).astype(np.int16)
    interleaved = np.empty(pcm.size, dtype=np.int16)
    interleaved[0::2] = pcm[:, 0]
    interleaved[1::2] = pcm[:, 1]
    enc = lameenc.Encoder()
    enc.set_bit_rate(128)
    enc.set_in_sample_rate(SR)
    enc.set_channels(2)
    enc.set_quality(2)
    mp3 = enc.encode(interleaved.tobytes()) + enc.flush()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(mp3)
    return path.stat().st_size


def main():
    out = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'village' / 'music' / 'vila.mp3'
    audio = render()
    dur = audio.shape[0] / SR
    rms = float(np.sqrt(np.mean(audio ** 2)))
    size = encode_mp3(audio, out)
    print(f'ok {out}  {dur:.1f}s  rms={rms:.3f}  {size // 1024}kb')


if __name__ == '__main__':
    main()
