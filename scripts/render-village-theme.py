#!/usr/bin/env python3
"""Tema da Vila: piano de fundo + trecho mais animado no meio. Sem baixo nem sanfona."""
from __future__ import annotations

from pathlib import Path

import lameenc
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
BPM = 90.0
BEAT = 60.0 / BPM
BARS = 48
N = int(round(BARS * 4 * BEAT * SR))

NOTE = {
    n: 440.0 * (2.0 ** ((m - 69) / 12.0))
    for n, m in {
        'G3': 55, 'A3': 57, 'B3': 59, 'C4': 60, 'D4': 62, 'E4': 64, 'Fs4': 66,
        'G4': 67, 'A4': 69, 'B4': 71, 'C5': 72, 'D5': 74, 'E5': 76, 'Fs5': 78,
        'G5': 79, 'A5': 81, 'B5': 83, 'C6': 84, 'D6': 86, 'E6': 88, 'G6': 91, 'A6': 93, 'B6': 95,
    }.items()
}

CHORDS = {
    'G':  ['G3', 'B3', 'D4', 'G4', 'B4', 'D5', 'G5'],
    'C':  ['G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5'],
    'D':  ['A3', 'D4', 'Fs4', 'A4', 'D5', 'Fs5', 'A5'],
    'Em': ['G3', 'B3', 'E4', 'G4', 'B4', 'E5', 'G5'],
}

# A calmo (16) + B animado (16) + A' (16) para o loop fechar
PROG = (
    ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'] * 2
    + ['G', 'C', 'G', 'D', 'Em', 'C', 'D', 'G'] * 2
    + ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'] * 2
)


def butter_lp(x: np.ndarray, cutoff: float, order=3) -> np.ndarray:
    b, a = butter(order, min(cutoff, SR * 0.45) / (SR * 0.5), btype='low')
    return lfilter(b, a, x)


def butter_hp(x: np.ndarray, cutoff: float) -> np.ndarray:
    b, a = butter(2, cutoff / (SR * 0.5), btype='high')
    return lfilter(b, a, x)


def mix_in(stereo: np.ndarray, start: float, wave: np.ndarray, pan=0.0):
    i0 = int(round(start * SR))
    if i0 >= stereo.shape[0]:
        return
    n = min(wave.shape[0], stereo.shape[0] - i0)
    w = wave[:n]
    left = np.sqrt(0.5 * (1.0 - pan))
    right = np.sqrt(0.5 * (1.0 + pan))
    stereo[i0:i0 + n, 0] += w * left
    stereo[i0:i0 + n, 1] += w * right


def room(x: np.ndarray) -> np.ndarray:
    y = x.copy()
    y[881:] += 0.08 * x[:-881]
    y[1321:] += 0.05 * x[:-1321]
    return y


def piano(freq: float, dur: float, amp: float) -> np.ndarray:
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    env = (1.0 - np.exp(-t * 220)) * np.exp(-t * 2.1)
    sig = np.zeros(n)
    stretch = 0.00035
    for k, a in ((1, 1.0), (2, 0.22), (3, 0.09), (4, 0.04), (5, 0.018)):
        fk = k * freq * np.sqrt(1.0 + stretch * k * k)
        sig += a * np.sin(2 * np.pi * fk * t) * np.exp(-t * (1.4 + 0.55 * k))
    click = 0.08 * np.exp(-t * 90) * np.sin(2 * np.pi * freq * 6.5 * t)
    return butter_lp(amp * (env * sig + click), 6400)


def bar_time(bar: int, beat: float = 0.0) -> float:
    return (bar * 4 + beat) * BEAT


def put(stereo, bar, beat, name, dur, amp, pan=0.0):
    mix_in(stereo, bar_time(bar, beat), piano(NOTE[name], dur * BEAT, amp), pan)


# Melodia saltitante, só piano agudo. (bar_offset, beat, nota, duração em beats)
TUNE = [
    (0, 0.0, 'G4', 0.5), (0, 0.5, 'B4', 0.5), (0, 1.0, 'D5', 0.5), (0, 1.5, 'G5', 0.5),
    (0, 2.0, 'E5', 1.0), (0, 3.0, 'D5', 1.0),
    (1, 0.0, 'B4', 0.5), (1, 0.5, 'A4', 0.5), (1, 1.0, 'G4', 1.0),
    (1, 2.0, 'A4', 0.5), (1, 2.5, 'B4', 0.5), (1, 3.0, 'D5', 1.0),
    (2, 0.0, 'G5', 0.5), (2, 0.5, 'D5', 0.5), (2, 1.0, 'E5', 0.5), (2, 1.5, 'G5', 0.5),
    (2, 2.0, 'A5', 1.0), (2, 3.0, 'G5', 1.0),
    (3, 0.0, 'E5', 0.5), (3, 0.5, 'D5', 0.5), (3, 1.0, 'B4', 1.0),
    (3, 2.0, 'A4', 0.5), (3, 2.5, 'B4', 0.5), (3, 3.0, 'G4', 1.0),
    (4, 0.0, 'D5', 0.5), (4, 0.5, 'E5', 0.5), (4, 1.0, 'G5', 1.0),
    (4, 2.0, 'B5', 1.0), (4, 3.0, 'A5', 1.0),
    (5, 0.0, 'G5', 0.5), (5, 0.5, 'E5', 0.5), (5, 1.0, 'D5', 1.0),
    (5, 2.0, 'C5', 1.0), (5, 3.0, 'B4', 1.0),
    (6, 0.0, 'A4', 0.5), (6, 0.5, 'B4', 0.5), (6, 1.0, 'D5', 0.5), (6, 1.5, 'E5', 0.5),
    (6, 2.0, 'G5', 2.0),
    (7, 0.0, 'D5', 1.0), (7, 1.0, 'B4', 1.0), (7, 2.0, 'G4', 2.0),
]


def up(name: str) -> str:
    return name[:-1] + str(int(name[-1]) + 1)


def render() -> np.ndarray:
    stereo = np.zeros((N, 2), dtype=np.float64)

    for bar, name in enumerate(PROG):
        tones = CHORDS[name]
        lively = 16 <= bar < 32
        if lively:
            steps = (2, 3, 4, 5, 4, 3, 5, 4)
            for i, idx in enumerate(steps):
                note = tones[min(idx, len(tones) - 1)]
                amp = 0.055 if i % 2 == 0 else 0.042
                put(stereo, bar, i * 0.5, note, 1.15, amp, pan=-0.16 if i % 2 == 0 else 0.18)
        else:
            steps = (2, 3, 4, 3)
            for i, idx in enumerate(steps):
                note = tones[min(idx, len(tones) - 1)]
                amp = 0.085 if i in (0, 2) else 0.065
                put(stereo, bar, i, note, 2.3, amp, pan=-0.12 if i % 2 == 0 else 0.14)

    for turn, lift, amp in ((16, False, 0.13), (24, True, 0.11)):
        for off, beat, name, dur in TUNE:
            n = up(name) if lift and up(name) in NOTE else name
            put(stereo, turn + off, beat, n, dur * 1.05, amp, pan=-0.06)

    # A' : uns toques agudos de vez em quando, para não voltar idêntico
    sparkle = [
        (35, 3.0, 'G5'), (39, 2.0, 'D5'), (43, 3.0, 'E5'), (47, 2.0, 'G5'),
        (47, 3.0, 'D5'),
    ]
    for bar, beat, name in sparkle:
        put(stereo, bar, beat, name, 1.8, 0.07, pan=0.22)

    wet = np.stack([room(stereo[:, 0]), room(stereo[:, 1])], axis=1)
    mix = 0.94 * stereo + 0.06 * wet
    mix[:, 0] = butter_hp(mix[:, 0], 180)
    mix[:, 1] = butter_hp(mix[:, 1], 180)
    mix[:, 0] = butter_lp(mix[:, 0], 8200)
    mix[:, 1] = butter_lp(mix[:, 1], 8200)

    peak = np.max(np.abs(mix)) or 1.0
    mix = mix * (0.64 / peak)
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
