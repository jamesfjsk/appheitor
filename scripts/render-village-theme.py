#!/usr/bin/env python3
"""Tema da Vila: piano com motivo que gruda. Sem baixo nem sanfona."""
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
RNG = np.random.default_rng(11)

MIDI = {
    'G3': 55, 'A3': 57, 'B3': 59, 'C4': 60, 'D4': 62, 'E4': 64, 'Fs4': 66,
    'G4': 67, 'A4': 69, 'B4': 71, 'C5': 72, 'D5': 74, 'E5': 76, 'Fs5': 78,
    'G5': 79, 'A5': 81, 'B5': 83, 'C6': 84, 'D6': 86, 'E6': 88, 'Fs6': 90,
    'G6': 91, 'A6': 93, 'B6': 95,
}
NOTE = {n: 440.0 * (2.0 ** ((m - 69) / 12.0)) for n, m in MIDI.items()}

CHORDS = {
    'G':  ['G3', 'B3', 'D4', 'G4', 'B4', 'D5', 'G5'],
    'C':  ['G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5'],
    'D':  ['A3', 'D4', 'Fs4', 'A4', 'D5', 'Fs5', 'A5'],
    'Em': ['G3', 'B3', 'E4', 'G4', 'B4', 'E5', 'G5'],
}

PROG = (
    ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'] * 2
    + ['G', 'C', 'G', 'D', 'Em', 'C', 'D', 'G'] * 2
    + ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'] * 2
)

# Motivo da Vila: salto D→G, sorriso E, volta pra casa. Dá para assobiar.
# (offset de compasso, beat, nota, duração)
HOOK = [
    (0, 0.0, 'D5', 1.0), (0, 1.0, 'G5', 1.0), (0, 2.0, 'E5', 2.0),
    (1, 0.0, 'D5', 1.0), (1, 1.0, 'B4', 1.0), (1, 2.0, 'A4', 1.0), (1, 3.0, 'G4', 1.0),
]
ANSWER = [
    (2, 0.0, 'D5', 1.0), (2, 1.0, 'G5', 0.5), (2, 1.5, 'A5', 0.5), (2, 2.0, 'G5', 2.0),
    (3, 0.0, 'E5', 1.0), (3, 1.0, 'D5', 1.0), (3, 2.0, 'B4', 1.0), (3, 3.0, 'D5', 1.0),
]
HOME = [
    (4, 0.0, 'D5', 1.0), (4, 1.0, 'G5', 1.0), (4, 2.0, 'E5', 2.0),
    (5, 0.0, 'D5', 1.0), (5, 1.0, 'B4', 1.0), (5, 2.0, 'A4', 1.0), (5, 3.0, 'G4', 1.0),
    (6, 0.0, 'G5', 0.5), (6, 0.5, 'E5', 0.5), (6, 1.0, 'D5', 1.0), (6, 2.0, 'B4', 1.0), (6, 3.0, 'A4', 1.0),
    (7, 0.0, 'G4', 0.5), (7, 0.5, 'B4', 0.5), (7, 1.0, 'D5', 1.0), (7, 2.0, 'G5', 2.0),
]
THEME = HOOK + ANSWER + HOME

THIRD = {
    'G4': 'B4', 'A4': 'C5', 'B4': 'D5', 'C5': 'E5', 'D5': 'Fs5', 'E5': 'G5',
    'G5': 'B5', 'A5': 'C6', 'B5': 'D6', 'C6': 'E6', 'D6': 'Fs6', 'E6': 'G6',
}


def butter_lp(x: np.ndarray, cutoff: float, order=3) -> np.ndarray:
    b, a = butter(order, min(cutoff, SR * 0.45) / (SR * 0.5), btype='low')
    return lfilter(b, a, x)


def butter_hp(x: np.ndarray, cutoff: float) -> np.ndarray:
    b, a = butter(2, cutoff / (SR * 0.5), btype='high')
    return lfilter(b, a, x)


def mix_in(stereo: np.ndarray, start: float, wave: np.ndarray, pan=0.0):
    if start < 0:
        return
    i0 = int(round(start * SR))
    if i0 >= stereo.shape[0]:
        return
    n = min(wave.shape[0], stereo.shape[0] - i0)
    if n <= 0:
        return
    w = wave[:n]
    left = np.sqrt(0.5 * (1.0 - pan))
    right = np.sqrt(0.5 * (1.0 + pan))
    stereo[i0:i0 + n, 0] += w * left
    stereo[i0:i0 + n, 1] += w * right


def room(x: np.ndarray) -> np.ndarray:
    y = x.copy()
    y[881:] += 0.10 * x[:-881]
    y[1321:] += 0.06 * x[:-1321]
    y[2203:] += 0.03 * x[:-2203]
    return y


def piano(freq: float, dur: float, amp: float) -> np.ndarray:
    ring = dur + 0.85
    n = max(1, int(ring * SR))
    t = np.arange(n) / SR
    decay = 1.55 if dur >= 1.4 else 2.15
    env = (1.0 - np.exp(-t * 260)) * np.exp(-t * decay)
    sig = np.zeros(n)
    stretch = 0.00032
    for k, a in ((1, 1.0), (2, 0.26), (3, 0.11), (4, 0.05), (5, 0.025), (6, 0.012), (7, 0.006)):
        fk = k * freq * np.sqrt(1.0 + stretch * k * k)
        det = 1.0 + 0.00035 * (k % 2)
        sig += a * np.sin(2 * np.pi * fk * det * t) * np.exp(-t * (1.15 + 0.62 * k))
    duplex = 0.07 * np.sin(2 * np.pi * freq * 2.003 * t) * np.exp(-t * 3.2)
    hammer_n = min(n, int(0.012 * SR))
    hammer = np.zeros(n)
    hammer[:hammer_n] = RNG.standard_normal(hammer_n) * np.linspace(1.0, 0.0, hammer_n)
    hammer = butter_hp(butter_lp(hammer, 4200), 900) * 0.11
    body = butter_lp(amp * (env * (sig + duplex) + hammer), 6800)
    # corte suave no fim da nota
    tail = int(0.04 * SR)
    if tail < n:
        body[-tail:] *= np.linspace(1.0, 0.0, tail)
    return body


def bar_time(bar: float, beat: float = 0.0) -> float:
    return (bar * 4 + beat) * BEAT


def put(stereo, bar, beat, name, dur, amp, pan=0.0, human=True):
    when = bar_time(bar, beat)
    a = amp
    if human:
        when += float(RNG.uniform(-0.011, 0.011))
        a *= float(RNG.uniform(0.90, 1.10))
    mix_in(stereo, when, piano(NOTE[name], dur * BEAT, a), pan)


def up(name: str) -> str:
    return name[:-1] + str(int(name[-1]) + 1)


def play_theme(stereo, start_bar: int, lift: bool, amp: float):
    for off, beat, name, dur in THEME:
        n = up(name) if lift and up(name) in NOTE else name
        put(stereo, start_bar + off, beat, n, dur * 1.08, amp, pan=-0.05)
        if dur >= 1.4 and n in THIRD:
            put(stereo, start_bar + off, beat, THIRD[n], dur * 0.95, amp * 0.32, pan=0.22)
        # oitava alta só nas notas longas do motivo — o “brilho” de trilha de jogo
        hi = up(n)
        if dur >= 1.9 and hi in NOTE:
            put(stereo, start_bar + off, beat + 0.02, hi, dur * 0.7, amp * 0.22, pan=0.12)


def render() -> np.ndarray:
    stereo = np.zeros((N, 2), dtype=np.float64)

    for bar, name in enumerate(PROG):
        tones = CHORDS[name]
        lively = 16 <= bar < 32
        if lively:
            steps = (2, 3, 4, 5, 4, 3, 5, 4)
            for i, idx in enumerate(steps):
                note = tones[min(idx, len(tones) - 1)]
                amp = 0.048 if i % 2 == 0 else 0.036
                put(stereo, bar, i * 0.5, note, 1.2, amp, pan=-0.18 if i % 2 == 0 else 0.20)
            # acorde rolado no 1, bem piano, sem drone
            if bar % 4 == 0:
                put(stereo, bar, 0.00, tones[1], 3.4, 0.034, pan=-0.08)
                put(stereo, bar, 0.07, tones[2], 3.2, 0.030, pan=0.04)
                put(stereo, bar, 0.14, tones[4], 2.8, 0.028, pan=0.12)
        else:
            # A / A': arpejo, com inversão a cada 8 compassos pra não cravar
            invert = (bar // 8) % 2 == 1
            steps = (3, 2, 4, 2) if invert else (2, 3, 4, 3)
            for i, idx in enumerate(steps):
                note = tones[min(idx, len(tones) - 1)]
                amp = 0.080 if i in (0, 2) else 0.060
                put(stereo, bar, i, note, 2.4, amp, pan=-0.12 if i % 2 == 0 else 0.14)

    # B: o tema, depois o tema uma oitava acima
    play_theme(stereo, 16, False, 0.148)
    play_theme(stereo, 24, True, 0.122)

    # eco do motivo (pergunta e resposta), 2 tempos depois, bem baixo
    for off, beat, name, dur in HOOK:
        put(stereo, 16 + off, beat + 2.0, name, dur * 0.9, 0.045, pan=0.28)
        hi = up(name)
        if hi in NOTE:
            put(stereo, 24 + off, beat + 2.0, hi, dur * 0.9, 0.038, pan=0.30)

    # A': o motivo volta em pedaços — é isso que marca memória
    for bar, beat, name, dur, amp in (
        (35, 0.0, 'D5', 1.0, 0.09),
        (35, 1.0, 'G5', 1.0, 0.10),
        (35, 2.0, 'E5', 2.0, 0.09),
        (39, 0.0, 'D5', 1.0, 0.08),
        (39, 2.0, 'G4', 2.0, 0.08),
        (43, 0.0, 'D5', 1.0, 0.09),
        (43, 1.0, 'G5', 1.0, 0.10),
        (43, 2.0, 'E5', 1.0, 0.09),
        (43, 3.0, 'D5', 1.0, 0.08),
        (46, 0.0, 'D5', 1.0, 0.10),
        (46, 1.0, 'G5', 1.0, 0.11),
        (46, 2.0, 'E5', 2.0, 0.10),
        (47, 0.0, 'D5', 1.0, 0.09),
        (47, 1.0, 'B4', 1.0, 0.08),
        (47, 2.0, 'A4', 1.0, 0.08),
        (47, 3.0, 'G4', 1.0, 0.09),
    ):
        put(stereo, bar, beat, name, dur, amp, pan=-0.04)

    wet = np.stack([room(stereo[:, 0]), room(stereo[:, 1])], axis=1)
    mix = 0.90 * stereo + 0.10 * wet
    mix[:, 0] = butter_hp(mix[:, 0], 170)
    mix[:, 1] = butter_hp(mix[:, 1], 170)
    mix[:, 0] = butter_lp(mix[:, 0], 8600)
    mix[:, 1] = butter_lp(mix[:, 1], 8600)

    peak = np.max(np.abs(mix)) or 1.0
    mix = np.tanh(mix * (0.78 / peak))
    # fade de 40 ms nas pontas, loop sem clique
    fade = int(0.04 * SR)
    mix[:fade] *= np.linspace(0.0, 1.0, fade)[:, None]
    mix[-fade:] *= np.linspace(1.0, 0.0, fade)[:, None]
    return mix.astype(np.float32)


def encode_mp3(stereo: np.ndarray, path: Path):
    pcm = np.clip(stereo * 32767.0, -32767, 32767).astype(np.int16)
    interleaved = np.empty(pcm.size, dtype=np.int16)
    interleaved[0::2] = pcm[:, 0]
    interleaved[1::2] = pcm[:, 1]
    enc = lameenc.Encoder()
    enc.set_bit_rate(160)
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
