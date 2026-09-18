#!/usr/bin/env python3
"""Tema da Vila: piano com motivo, forma de trilha de jogo. Sem baixo nem sanfona."""
from __future__ import annotations

from pathlib import Path

import lameenc
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
BPM = 88.0
BEAT = 60.0 / BPM
BARS = 48
N = int(round(BARS * 4 * BEAT * SR))
RNG = np.random.default_rng(23)

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

# Motivo: D longo, salto no G, sorriso no E que fica. Ritmo pontuado = carimbo.
HOOK = [
    (0, 0.0, 'D5', 1.5), (0, 1.5, 'G5', 0.5), (0, 2.0, 'E5', 2.0),
    (1, 0.0, 'D5', 1.0), (1, 1.0, 'B4', 1.0), (1, 2.0, 'A4', 1.0), (1, 3.0, 'G4', 1.0),
]
ANSWER = [
    (2, 0.0, 'D5', 1.5), (2, 1.5, 'G5', 0.5), (2, 2.0, 'A5', 1.0), (2, 3.0, 'G5', 1.0),
    (3, 0.0, 'E5', 1.0), (3, 1.0, 'D5', 1.5), (3, 2.5, 'B4', 0.5), (3, 3.0, 'D5', 1.0),
]
HOME = [
    (4, 0.0, 'D5', 1.5), (4, 1.5, 'G5', 0.5), (4, 2.0, 'E5', 2.0),
    (5, 0.0, 'D5', 1.0), (5, 1.0, 'B4', 1.0), (5, 2.0, 'A4', 1.0), (5, 3.0, 'G4', 1.0),
    (6, 0.0, 'B4', 0.5), (6, 0.5, 'D5', 0.5), (6, 1.0, 'E5', 1.0), (6, 2.0, 'G5', 2.0),
    (7, 0.0, 'D5', 1.0), (7, 1.0, 'B4', 1.0), (7, 2.0, 'G4', 2.0),
]
THEME = HOOK + ANSWER + HOME

# Ponte: o motivo sobe um degrau e desce andando — desenvolvimento, não outro tema.
BRIDGE = [
    (0, 0.0, 'E5', 1.5), (0, 1.5, 'A5', 0.5), (0, 2.0, 'G5', 2.0),
    (1, 0.0, 'E5', 1.0), (1, 1.0, 'D5', 1.0), (1, 2.0, 'B4', 1.0), (1, 3.0, 'A4', 1.0),
    (2, 0.0, 'G4', 0.5), (2, 0.5, 'A4', 0.5), (2, 1.0, 'B4', 0.5), (2, 1.5, 'D5', 0.5),
    (2, 2.0, 'E5', 1.0), (2, 3.0, 'D5', 1.0),
    (3, 0.0, 'B4', 1.0), (3, 1.0, 'A4', 1.0), (3, 2.0, 'G4', 2.0),
    (4, 0.0, 'D5', 1.0), (4, 1.0, 'G5', 1.0), (4, 2.0, 'E5', 2.0),
    (5, 0.0, 'D5', 1.0), (5, 1.0, 'B4', 1.0), (5, 2.0, 'A4', 1.0), (5, 3.0, 'G4', 1.0),
    (6, 0.0, 'G4', 0.5), (6, 0.5, 'B4', 0.5), (6, 1.0, 'D5', 1.0),
    (6, 2.0, 'E5', 1.0), (6, 3.0, 'G5', 1.0),
    (7, 0.0, 'D5', 1.0), (7, 1.0, 'B4', 1.0), (7, 2.0, 'G4', 2.0),
]

THIRD = {
    'G4': 'B4', 'A4': 'C5', 'B4': 'D5', 'C5': 'E5', 'D5': 'Fs5', 'E5': 'G5',
    'Fs5': 'A5', 'G5': 'B5', 'A5': 'C6', 'B5': 'D6', 'C6': 'E6', 'D6': 'Fs6', 'E6': 'G6',
}


def butter_lp(x: np.ndarray, cutoff: float, order=3) -> np.ndarray:
    b, a = butter(order, min(cutoff, SR * 0.45) / (SR * 0.5), btype='low')
    return lfilter(b, a, x)


def butter_hp(x: np.ndarray, cutoff: float) -> np.ndarray:
    b, a = butter(2, cutoff / (SR * 0.5), btype='high')
    return lfilter(b, a, x)


def mix_in(buf: np.ndarray, start: float, wave: np.ndarray, pan=0.0):
    if start < 0:
        return
    i0 = int(round(start * SR))
    if i0 >= buf.shape[0]:
        return
    n = min(wave.shape[0], buf.shape[0] - i0)
    if n <= 0:
        return
    w = wave[:n]
    left = np.sqrt(0.5 * (1.0 - pan))
    right = np.sqrt(0.5 * (1.0 + pan))
    buf[i0:i0 + n, 0] += w * left
    buf[i0:i0 + n, 1] += w * right


def room(x: np.ndarray) -> np.ndarray:
    y = x.copy()
    y[881:] += 0.11 * x[:-881]
    y[1321:] += 0.07 * x[:-1321]
    y[2203:] += 0.035 * x[:-2203]
    return y


def piano(freq: float, dur: float, amp: float) -> np.ndarray:
    ring = dur + 1.05
    n = max(1, int(ring * SR))
    t = np.arange(n) / SR
    vel = float(np.clip(amp / 0.14, 0.35, 1.15))
    decay = (1.35 if dur >= 1.5 else 2.05) * (1.12 - 0.12 * vel)
    env = (1.0 - np.exp(-t * (200 + 80 * vel))) * np.exp(-t * decay)
    sig = np.zeros(n)
    stretch = 0.00028
    partials = (
        (1, 1.0), (2, 0.22 + 0.10 * vel), (3, 0.09 + 0.05 * vel),
        (4, 0.04 + 0.03 * vel), (5, 0.018 * vel), (6, 0.01 * vel), (7, 0.005 * vel),
    )
    for k, a in partials:
        fk = k * freq * np.sqrt(1.0 + stretch * k * k)
        det = 1.0 + 0.00028 * ((k % 2) * 2 - 1)
        sig += a * np.sin(2 * np.pi * fk * det * t) * np.exp(-t * (1.05 + 0.58 * k))
    duplex = 0.06 * vel * np.sin(2 * np.pi * freq * 2.002 * t) * np.exp(-t * 2.8)
    hammer_n = min(n, int((0.008 + 0.006 * vel) * SR))
    hammer = np.zeros(n)
    hammer[:hammer_n] = RNG.standard_normal(hammer_n) * np.linspace(1.0, 0.0, hammer_n)
    hammer = butter_hp(butter_lp(hammer, 3800 + 800 * vel), 700) * (0.08 + 0.05 * vel)
    body = butter_lp(amp * (env * (sig + duplex) + hammer), 5000 + 1400 * vel)
    tail = int(0.05 * SR)
    if tail < n:
        body[-tail:] *= np.linspace(1.0, 0.0, tail)
    return body


def bar_time(bar: float, beat: float = 0.0) -> float:
    return (bar * 4 + beat) * BEAT


def put(buf, bar, beat, name, dur, amp, pan=0.0, human=True, rubato=0.0):
    when = bar_time(bar, beat) + rubato
    a = amp
    if human:
        when += float(RNG.uniform(-0.009, 0.009))
        a *= float(RNG.uniform(0.92, 1.08))
    mix_in(buf, when, piano(NOTE[name], dur * BEAT, a), pan)


def up(name: str) -> str:
    return name[:-1] + str(int(name[-1]) + 1)


def nearest(prev: str, options: list[str]) -> str:
    return min(options, key=lambda n: abs(MIDI[n] - MIDI[prev]))


def voicings() -> list[list[str]]:
    out: list[list[str]] = []
    prev: list[str] | None = None
    for name in PROG:
        opts = CHORDS[name][:6]
        if prev is None:
            cur = [CHORDS[name][i] for i in (1, 2, 3, 4)]
        else:
            used: set[str] = set()
            cur = []
            for p in prev:
                cand = [o for o in opts if o not in used] or opts
                n = nearest(p, cand)
                used.add(n)
                cur.append(n)
        out.append(cur)
        prev = cur
    return out


def play_line(lead, notes, start_bar: int, amp: float, lift=False, thirds=False, sparkle=False, rubato_end=True):
    last_i = len(notes) - 1
    for i, (off, beat, name, dur) in enumerate(notes):
        n = up(name) if lift and up(name) in NOTE else name
        late = 0.022 if (rubato_end and i == last_i) else 0.0
        if name == 'G5' and dur <= 0.6:
            grace = 'D6' if lift and 'D6' in NOTE else 'D5'
            put(lead, start_bar + off, beat - 0.12, grace, 0.14, amp * 0.35, pan=-0.08)
        put(lead, start_bar + off, beat, n, dur * 1.08, amp, pan=-0.04, rubato=late)
        if thirds and name == 'E5' and dur >= 1.8 and n in THIRD:
            put(lead, start_bar + off, beat + 0.04, THIRD[n], dur * 0.7, amp * 0.22, pan=0.26)
        hi = up(n)
        if sparkle and name == 'G5' and dur >= 1.8 and hi in NOTE:
            put(lead, start_bar + off, beat + 0.04, hi, dur * 0.55, amp * 0.16, pan=0.10)


def render() -> np.ndarray:
    acc = np.zeros((N, 2), dtype=np.float64)
    lead = np.zeros((N, 2), dtype=np.float64)
    voices = voicings()

    for bar, tones in enumerate(voices):
        pickup = 12 <= bar < 16
        lively = 16 <= bar < 32
        bridge = 32 <= bar < 40
        if pickup:
            order = (0, 1, 2, 3, 2, 1, 3, 2)
            for i, idx in enumerate(order):
                put(acc, bar, i * 0.5, tones[idx], 1.1, 0.042, pan=-0.16 if i % 2 == 0 else 0.18)
        elif lively:
            order = (0, 1, 2, 3, 2, 1, 3, 2)
            for i, idx in enumerate(order):
                put(acc, bar, i * 0.5, tones[idx], 1.15, 0.032, pan=-0.18 if i % 2 == 0 else 0.20)
            if bar % 4 == 0:
                put(acc, bar, 0.00, tones[0], 3.5, 0.024, pan=-0.10)
                put(acc, bar, 0.08, tones[1], 3.3, 0.020, pan=0.00)
                put(acc, bar, 0.16, tones[3], 2.9, 0.018, pan=0.12)
        elif bridge:
            order = (1, 2, 3, 2)
            for i, idx in enumerate(order):
                put(acc, bar, i, tones[idx], 2.2, 0.044, pan=-0.10 if i % 2 == 0 else 0.12)
        else:
            order = (0, 1, 2, 1) if (bar // 8) % 2 else (0, 1, 2, 3)
            for i, idx in enumerate(order):
                put(acc, bar, i, tones[idx], 2.45, 0.062 if i in (0, 2) else 0.046, pan=-0.12 if i % 2 == 0 else 0.14)

    # antecipação: o mesmo ritmo pontuado, ainda baixo
    put(lead, 14, 2.0, 'D5', 1.5, 0.07, pan=-0.06)
    put(lead, 15, 0.0, 'D5', 1.5, 0.10, pan=-0.05)
    put(lead, 15, 1.5, 'G5', 0.5, 0.12, pan=-0.04)
    put(lead, 15, 2.0, 'E5', 2.0, 0.11, pan=-0.04)

    play_line(lead, THEME, 16, 0.168, thirds=True, sparkle=True)
    play_line(lead, THEME, 24, 0.138, lift=True, thirds=True, sparkle=True)
    play_line(lead, BRIDGE, 32, 0.122, thirds=False, sparkle=False)

    put(acc, 17, 0.05, 'D4', 2.0, 0.038, pan=-0.22)
    put(acc, 17, 2.05, 'G4', 2.0, 0.034, pan=-0.18)
    put(acc, 25, 0.05, 'D5', 2.0, 0.026, pan=-0.20)
    put(acc, 25, 2.05, 'G5', 2.0, 0.022, pan=-0.16)

    # recap limpo: motivo, casa, motivo de novo para o loop
    play_line(lead, HOOK, 40, 0.13)
    put(lead, 42, 0.0, 'D5', 1.0, 0.10, pan=-0.04)
    put(lead, 42, 1.0, 'B4', 1.0, 0.09, pan=-0.04)
    put(lead, 42, 2.0, 'A4', 1.0, 0.09, pan=-0.04)
    put(lead, 42, 3.0, 'G4', 2.0, 0.10, pan=-0.04)
    play_line(lead, HOOK, 44, 0.12)
    play_line(lead, HOOK, 46, 0.13)

    acc[:, 0] = butter_lp(acc[:, 0], 2400)
    acc[:, 1] = butter_lp(acc[:, 1], 2400)
    lead[:, 0] = butter_hp(lead[:, 0], 220)
    lead[:, 1] = butter_hp(lead[:, 1], 220)

    # piano stereo: canal direito uns 0.7 ms atrás
    delay = int(0.0007 * SR)
    wide = np.zeros_like(lead)
    wide[:, 0] = lead[:, 0]
    wide[delay:, 1] = lead[:-delay, 1]
    mix = 0.62 * acc + 1.12 * wide
    wet = np.stack([room(mix[:, 0]), room(mix[:, 1])], axis=1)
    mix = 0.90 * mix + 0.10 * wet

    # arco: A contido, B abre, ponte respira, recap assenta
    dyn = np.ones(N)
    for bar in range(BARS):
        i0 = int(bar_time(bar) * SR)
        i1 = int(bar_time(bar + 1) * SR)
        i1 = min(i1, N)
        if bar < 12:
            g = 0.84
        elif bar < 16:
            g = 0.84 + 0.14 * ((bar - 11) / 4)
        elif bar < 32:
            g = 1.0
        elif bar < 40:
            g = 0.90
        else:
            g = 0.86
        dyn[i0:i1] = g
    mix *= dyn[:, None]

    mix[:, 0] = butter_hp(mix[:, 0], 165)
    mix[:, 1] = butter_hp(mix[:, 1], 165)
    mix[:, 0] = butter_lp(mix[:, 0], 9000)
    mix[:, 1] = butter_lp(mix[:, 1], 9000)

    peak = np.max(np.abs(mix)) or 1.0
    mix = np.tanh(mix * (0.80 / peak))
    fade = int(0.05 * SR)
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
