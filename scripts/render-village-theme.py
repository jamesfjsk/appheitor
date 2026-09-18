#!/usr/bin/env python3
"""Tema da Vila: piano + flauta leve. Sem baixo nem sanfona."""
from __future__ import annotations

from pathlib import Path

import lameenc
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
BPM = 90.0
BEAT = 60.0 / BPM
BARS = 64
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
    + ['G', 'C', 'G', 'D', 'Em', 'C', 'D', 'G']
    + ['G', 'C', 'G', 'D', 'Em', 'C', 'D', 'G']
    + ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'] * 2
)

# Motivo no grid: D (1.5) G (0.5) E (2.0) — o E acaba exatamente no 1 do próximo.
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

BRIDGE = [
    (0, 0.0, 'E5', 1.5), (0, 1.5, 'A5', 0.5), (0, 2.0, 'G5', 2.0),
    (1, 0.0, 'E5', 1.0), (1, 1.0, 'D5', 1.0), (1, 2.0, 'B4', 1.0), (1, 3.0, 'A4', 1.0),
    (2, 0.0, 'G4', 0.5), (2, 0.5, 'A4', 0.5), (2, 1.0, 'B4', 0.5), (2, 1.5, 'D5', 0.5),
    (2, 2.0, 'E5', 1.0), (2, 3.0, 'D5', 1.0),
    (3, 0.0, 'B4', 1.0), (3, 1.0, 'A4', 1.0), (3, 2.0, 'G4', 2.0),
    (4, 0.0, 'D5', 1.5), (4, 1.5, 'G5', 0.5), (4, 2.0, 'E5', 2.0),
    (5, 0.0, 'D5', 1.0), (5, 1.0, 'B4', 1.0), (5, 2.0, 'A4', 1.0), (5, 3.0, 'G4', 1.0),
    (6, 0.0, 'G4', 0.5), (6, 0.5, 'B4', 0.5), (6, 1.0, 'D5', 1.0),
    (6, 2.0, 'E5', 1.0), (6, 3.0, 'G5', 1.0),
    (7, 0.0, 'D5', 1.0), (7, 1.0, 'B4', 1.0), (7, 2.0, 'G4', 2.0),
]

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


def mix_in(buf: np.ndarray, start: float, wave: np.ndarray, pan=0.0):
    length = buf.shape[0]
    n = int(wave.shape[0])
    if n <= 0 or length <= 0:
        return
    i0 = int(round(start * SR)) % length
    left = np.sqrt(0.5 * (1.0 - pan))
    right = np.sqrt(0.5 * (1.0 + pan))
    first = min(n, length - i0)
    buf[i0:i0 + first, 0] += wave[:first] * left
    buf[i0:i0 + first, 1] += wave[:first] * right
    rest = n - first
    if rest > 0:
        take = min(rest, length)
        buf[:take, 0] += wave[first:first + take] * left
        buf[:take, 1] += wave[first:first + take] * right


def room(x: np.ndarray) -> np.ndarray:
    y = x.copy()
    y += 0.11 * np.roll(x, 881)
    y += 0.07 * np.roll(x, 1321)
    y += 0.035 * np.roll(x, 2203)
    return y


def circ_iir(x: np.ndarray, fn) -> np.ndarray:
    pad = 16384
    ext = np.concatenate([x[-pad:], x, x[:pad]])
    return fn(ext)[pad:-pad]


def piano(freq: float, dur: float, amp: float) -> np.ndarray:
    ring = dur + (1.4 if dur >= 1.8 else 0.95)
    n = max(1, int(ring * SR))
    t = np.arange(n) / SR
    vel = float(np.clip(amp / 0.14, 0.35, 1.15))
    decay = (1.05 if dur >= 1.8 else 1.45 if dur >= 1.5 else 2.05) * (1.12 - 0.12 * vel)
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
    tail = int(0.04 * SR)
    if tail < n:
        body[-tail:] *= np.linspace(1.0, 0.0, tail)
    return body


def flute(freq: float, dur: float, amp: float) -> np.ndarray:
    n = max(1, int((dur + 0.2) * SR))
    t = np.arange(n) / SR
    att = np.minimum(t / 0.055, 1.0)
    rel = np.clip((dur + 0.04 - t) / 0.14, 0.0, 1.0)
    env = att * rel
    vib = 1.0 + 0.0015 * np.sin(2 * np.pi * 5.1 * t) * np.clip((t - 0.07) * 10, 0.0, 1.0)
    f = freq * vib
    tone = 0.90 * np.sin(2 * np.pi * f * t) + 0.08 * np.sin(2 * np.pi * 2 * f * t)
    air = butter_hp(RNG.standard_normal(n) * 0.012 * env, 1600)
    return butter_lp(amp * (env * tone + air), 3200)


def put_flute(buf, bar, beat, name, dur, amp, pan=0.12):
    mix_in(buf, bar_time(bar, beat), flute(NOTE[name], dur * BEAT, amp), pan)


def play_flute(buf, notes, start_bar: int, amp: float):
    for off, beat, name, dur in notes:
        # flauta fica no registro da frase (D5–G5), não sobe oitava
        put_flute(buf, start_bar + off, beat, name, dur, amp)


def bar_time(bar: float, beat: float = 0.0) -> float:
    return (bar * 4 + beat) * BEAT


def put(buf, bar, beat, name, dur, amp, pan=0.0, human=False):
    when = bar_time(bar, beat)
    a = amp
    if human:
        when += float(RNG.uniform(-0.003, 0.003))
    mix_in(buf, when, piano(NOTE[name], dur * BEAT, a), pan)


def up(name: str) -> str:
    return name[:-1] + str(int(name[-1]) + 1)


def nearest(prev: str, options: list[str]) -> str:
    return min(options, key=lambda n: abs(MIDI[n] - MIDI[prev]))


def voicings() -> list[list[str]]:
    out: list[list[str]] = []
    prev: list[str] | None = None
    cycle = list(PROG) + list(PROG)
    for name in cycle:
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
    return out[len(PROG):]


def play_line(lead, notes, start_bar: int, amp: float, lift=False, thirds=False, sparkle=False, tight=False):
    for off, beat, name, dur in notes:
        n = up(name) if lift and up(name) in NOTE else name
        if (not tight) and name == 'G5' and dur <= 0.6:
            grace = 'D6' if lift and 'D6' in NOTE else 'D5'
            put(lead, start_bar + off, beat - 0.0625, grace, 0.125, amp * 0.32, pan=-0.08)
        put(lead, start_bar + off, beat, n, dur, amp, pan=-0.04, human=not tight)
        if (not tight) and name == 'E5' and dur >= 1.8:
            pedal = 'G4' if not lift else 'G5'
            put(lead, start_bar + off, beat, pedal, dur, amp * 0.14, pan=-0.22)
        if thirds and name == 'E5' and dur >= 1.8 and n in THIRD:
            put(lead, start_bar + off, beat, THIRD[n], dur * 0.7, amp * 0.18, pan=0.24)
        hi = up(n)
        if sparkle and name == 'G5' and dur >= 1.8 and hi in NOTE:
            put(lead, start_bar + off, beat, hi, dur * 0.5, amp * 0.14, pan=0.10)


def acc_pattern(acc, bar, tones, kind: str):
    if kind == 'sparse':
        for i, idx in enumerate((0, 2)):
            put(acc, bar, (0.0, 2.0)[i], tones[idx], 3.0, 0.056, pan=-0.12 if i == 0 else 0.14)
    elif kind == 'walk':
        for i, idx in enumerate((0, 1, 2, 3)):
            put(acc, bar, float(i), tones[idx], 2.4, 0.058 if i % 2 == 0 else 0.044, pan=-0.12 if i % 2 == 0 else 0.14)
    elif kind == 'run':
        order = (0, 1, 2, 3, 2, 1, 3, 2)
        for i, idx in enumerate(order):
            put(acc, bar, i * 0.5, tones[idx], 1.1, 0.038, pan=-0.16 if i % 2 == 0 else 0.18)
    elif kind == 'peak':
        order = (0, 1, 2, 3, 2, 1, 3, 2)
        for i, idx in enumerate(order):
            put(acc, bar, i * 0.5, tones[idx], 1.05, 0.046, pan=-0.16 if i % 2 == 0 else 0.18)
        if bar % 2 == 0:
            put(acc, bar, 0.0, tones[1], 3.4, 0.028, pan=-0.08)
            put(acc, bar, 0.0, tones[3], 3.2, 0.024, pan=0.10)


def render() -> np.ndarray:
    acc = np.zeros((N, 2), dtype=np.float64)
    lead = np.zeros((N, 2), dtype=np.float64)
    wind = np.zeros((N, 2), dtype=np.float64)
    voices = voicings()

    for bar, tones in enumerate(voices):
        if bar < 8:
            acc_pattern(acc, bar, tones, 'sparse')
        elif bar < 12:
            acc_pattern(acc, bar, tones, 'walk')
        elif bar < 16:
            acc_pattern(acc, bar, tones, 'run')
        elif bar < 32:
            acc_pattern(acc, bar, tones, 'run')
        elif bar < 40:
            acc_pattern(acc, bar, tones, 'run')
        elif bar < 48:
            acc_pattern(acc, bar, tones, 'peak')
        elif bar < 52:
            acc_pattern(acc, bar, tones, 'walk')
        else:
            acc_pattern(acc, bar, tones, 'sparse')

    put(lead, 6, 2.0, 'E5', 2.0, 0.04, pan=0.08)
    put_flute(wind, 6, 2.0, 'E5', 2.0, 0.055, pan=0.16)
    put(lead, 14, 2.0, 'D5', 1.5, 0.08, pan=-0.06)
    put(lead, 15, 0.0, 'D5', 1.5, 0.11, pan=-0.05)
    put(lead, 15, 1.5, 'G5', 0.5, 0.13, pan=-0.04)
    put(lead, 15, 2.0, 'E5', 2.0, 0.12, pan=-0.04)
    play_flute(wind, HOOK[:3], 15, 0.06)

    play_line(lead, THEME, 16, 0.17, thirds=True)
    play_flute(wind, HOOK, 16, 0.048)
    play_line(lead, THEME, 24, 0.145, lift=True, thirds=True)
    play_flute(wind, THEME, 24, 0.07)
    play_line(lead, BRIDGE, 32, 0.135)
    play_flute(wind, BRIDGE, 32, 0.065)

    play_line(lead, THEME, 40, 0.19, thirds=True, sparkle=True, tight=True)
    play_line(lead, THEME, 40, 0.11, lift=True, tight=True)
    play_flute(wind, THEME, 40, 0.10)

    play_line(lead, HOOK, 48, 0.13)
    put(lead, 50, 0.0, 'D5', 1.0, 0.10, pan=-0.04)
    put(lead, 50, 1.0, 'B4', 1.0, 0.09, pan=-0.04)
    put(lead, 50, 2.0, 'A4', 1.0, 0.09, pan=-0.04)
    put(lead, 50, 3.0, 'G4', 2.0, 0.10, pan=-0.04)
    play_flute(wind, HOOK, 48, 0.055)
    # últimas 8 = primeiras 8: o sorriso na mesma barra (6 e 62)
    put(lead, 62, 2.0, 'E5', 2.0, 0.04, pan=0.08)
    put_flute(wind, 62, 2.0, 'E5', 2.0, 0.055, pan=0.16)

    acc[:, 0] = circ_iir(acc[:, 0], lambda x: butter_lp(x, 2400))
    acc[:, 1] = circ_iir(acc[:, 1], lambda x: butter_lp(x, 2400))
    lead[:, 0] = circ_iir(lead[:, 0], lambda x: butter_hp(x, 220))
    lead[:, 1] = circ_iir(lead[:, 1], lambda x: butter_hp(x, 220))
    wind[:, 0] = circ_iir(wind[:, 0], lambda x: butter_hp(x, 380))
    wind[:, 1] = circ_iir(wind[:, 1], lambda x: butter_hp(x, 380))

    delay = int(0.0007 * SR)
    wide = np.zeros_like(lead)
    wide[:, 0] = lead[:, 0]
    wide[:, 1] = np.roll(lead[:, 1], delay)
    mix = 0.62 * acc + 1.12 * wide + 0.90 * wind
    wet = np.stack([room(mix[:, 0]), room(mix[:, 1])], axis=1)
    mix = 0.90 * mix + 0.10 * wet

    dyn = np.ones(N)
    for bar in range(BARS):
        i0 = int(bar_time(bar) * SR)
        i1 = min(int(bar_time(bar + 1) * SR), N)
        if bar < 12 or bar >= 56:
            g = 0.84
        elif bar < 16:
            g = 0.84 + 0.12 * ((bar - 11) / 4)
        elif bar < 32:
            g = 1.0
        elif bar < 40:
            g = 1.04
        elif bar < 48:
            g = 1.14
        else:
            g = 0.90
        dyn[i0:i1] = g
    mix *= dyn[:, None]

    mix[:, 0] = circ_iir(mix[:, 0], lambda x: butter_hp(x, 165))
    mix[:, 1] = circ_iir(mix[:, 1], lambda x: butter_hp(x, 165))
    mix[:, 0] = circ_iir(mix[:, 0], lambda x: butter_lp(x, 9000))
    mix[:, 1] = circ_iir(mix[:, 1], lambda x: butter_lp(x, 9000))

    peak = np.max(np.abs(mix)) or 1.0
    mix = np.tanh(mix * (0.80 / peak))
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
    seam = min(audio.shape[0] // 4, int(0.4 * SR))
    join = np.concatenate([audio[-seam:], audio[:seam]])
    jump = float(np.max(np.abs(audio[-1] - audio[0])))
    size = encode_mp3(audio, out)
    print(f'ok {out}  {dur:.1f}s  rms={rms:.3f}  seam={jump:.4f}  {size // 1024}kb')


if __name__ == '__main__':
    main()
