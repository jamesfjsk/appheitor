import React, { useEffect, useRef, useState } from 'react';
import ComicBackdrop from './common/ComicBackdrop';
import { createTeaserMusic, type TeaserMusic } from './teaserMusic';

// Página de "obras" mostrada quando VITE_MAINTENANCE=1 (deploy público enquanto o jogo é construído).
// Sem Firebase, sem login: só o clima do jogo e um bloco para minerar. O pai entra no app com ?dev=minerar.

const UI = '/assets/english/ui';
const HITS_TO_BREAK = 5;
// Aniversário do Heitor (18/09/2026, fuso de Brasília): dia da primeira versão jogável.
const OPENING_AT = new Date('2026-09-18T00:00:00-03:00').getTime();
const STORAGE_KEY = 'mm_teaser_diamonds';
const MUSIC_KEY = 'mm_teaser_music'; // '0' = ele desligou de propósito

const COMING = [
  { icon: `${UI}/miner.webp`, title: 'Seu minerador', text: 'Crie o personagem, escolha roupa, capacete e picareta.' },
  { icon: `${UI}/base/b_fornalha.webp`, title: 'A Vila', text: 'Cada missão do dia rende material para construir a sua base.' },
  { icon: `${UI}/chest.webp`, title: 'Baú do Dia', text: 'Fechou todas as missões? O baú abre à noite.' },
  { icon: `${UI}/minecart.webp`, title: 'A Mina', text: 'Contratos em inglês com o Comerciante, o Ferreiro e o Sábio.' },
  { icon: `${UI}/gold.webp`, title: 'Cofrinho', text: 'Guarde gold para algo grande e veja ele render.' },
];

type Sfx = { hit: () => void; win: () => void };

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const total = Math.max(0, Math.floor((target - now) / 1000));
  return {
    done: target - now <= 0,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const Countdown: React.FC = () => {
  const cd = useCountdown(OPENING_AT);
  if (cd.done) {
    return (
      <div className="mc-card rounded-lg p-4 text-center">
        <p className="mc-title text-sm sm:text-base">A mina abriu. Feliz aniversário, Heitor!</p>
      </div>
    );
  }
  const cells: Array<[number, string]> = [
    [cd.days, cd.days === 1 ? 'dia' : 'dias'],
    [cd.hours, 'horas'],
    [cd.minutes, 'min'],
    [cd.seconds, 'seg'],
  ];
  return (
    <div className="mc-card rounded-lg p-4 text-center">
      <p className="mc-lbl">A mina abre no seu aniversário</p>
      <div className="mt-3 flex justify-center gap-2 sm:gap-3">
        {cells.map(([v, l]) => (
          <div key={l} className="mc-slot rounded w-[66px] sm:w-[84px] py-2">
            <div className="mc-num" style={{ fontSize: 22 }}>{String(v).padStart(2, '0')}</div>
            <div className="text-xs mc-muted mt-1">{l}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-white/85">18 de setembro: a primeira versão jogável é o seu presente.</p>
    </div>
  );
};

function createSfx(): Sfx {
  let ctx: AudioContext | null = null;
  const get = () => {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };
  const tone = (freq: number, at: number, dur: number, type: OscillatorType, gain: number) => {
    const c = get();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime + at);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + at);
    o.stop(c.currentTime + at + dur);
  };
  return {
    hit: () => {
      const c = get();
      if (!c) return;
      const len = Math.floor(c.sampleRate * 0.08);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.value = 0.25;
      src.connect(g).connect(c.destination);
      src.start();
      tone(220, 0, 0.08, 'square', 0.08);
    },
    win: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.12));
    },
  };
}

const Teaser: React.FC = () => {
  const [hits, setHits] = useState(0);
  const [broken, setBroken] = useState(false);
  const [diamonds, setDiamonds] = useState(0);
  const [shake, setShake] = useState(false);
  const [music, setMusic] = useState(false);
  const sfx = useRef<Sfx | null>(null);
  const track = useRef<TeaserMusic | null>(null);

  const musicOn = () => {
    if (!track.current) track.current = createTeaserMusic();
    track.current.start();
    setMusic(track.current.playing());
  };
  const musicOff = () => {
    track.current?.stop();
    setMusic(false);
  };
  const toggleMusic = () => {
    if (music) {
      musicOff();
      try { localStorage.setItem(MUSIC_KEY, '0'); } catch { /* sem armazenamento */ }
    } else {
      musicOn();
      try { localStorage.removeItem(MUSIC_KEY); } catch { /* sem armazenamento */ }
    }
  };
  useEffect(() => () => track.current?.stop(), []);

  useEffect(() => {
    try {
      setDiamonds(Number(localStorage.getItem(STORAGE_KEY)) || 0);
    } catch {
      /* sem armazenamento */
    }
  }, []);

  const mine = () => {
    if (broken) return;
    if (!sfx.current) sfx.current = createSfx();
    sfx.current.hit();
    let wantsMusic = true;
    try { wantsMusic = localStorage.getItem(MUSIC_KEY) !== '0'; } catch { /* sem armazenamento */ }
    if (wantsMusic && !music) musicOn();
    setShake(true);
    window.setTimeout(() => setShake(false), 200);
    const next = hits + 1;
    if (next >= HITS_TO_BREAK) {
      setHits(0);
      setBroken(true);
      sfx.current.win();
      setDiamonds((d) => {
        const v = d + 1;
        try {
          localStorage.setItem(STORAGE_KEY, String(v));
        } catch {
          /* sem armazenamento */
        }
        return v;
      });
      window.setTimeout(() => setBroken(false), 1400);
    } else {
      setHits(next);
    }
  };

  const crack = hits / HITS_TO_BREAK;

  return (
    <div className="mn-page relative overflow-hidden">
      <ComicBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-[760px] px-4 py-6 sm:py-10">
        <div className="mc-panel rounded-lg overflow-hidden text-white">
          <div className="relative h-36 sm:h-48 overflow-hidden border-b-4 border-[#17130f]">
            <img src={`${UI}/banner.webp`} alt="" className="absolute inset-0 w-full h-full object-cover mc-pixel" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2f2a27] via-[#2f2a27]/30 to-transparent" />
            <button
              type="button"
              onClick={toggleMusic}
              aria-pressed={music}
              className="mc-btn mc-btn-dark absolute top-3 right-3 z-10 flex items-center gap-2 text-xs"
              style={{ minHeight: 44, padding: '0 14px' }}
            >
              <img src={`${UI}/${music ? 'torch' : 'moon'}.webp`} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
              {music ? 'Som ligado' : 'Ligar som'}
            </button>
            <div className="absolute inset-x-0 bottom-0 px-5 pb-4 flex items-end gap-3">
              <img src={`${UI}/pickaxe.webp`} alt="" className="w-14 h-14 sm:w-16 sm:h-16 mc-pixel" draggable={false} />
              <div>
                <p className="mc-lbl text-white/80">Flash Missions, nova versão</p>
                <h1 className="mc-title text-base sm:text-xl mt-1">Miner Missions</h1>
                <p className="text-sm sm:text-base text-white/85 mt-1">A mina está sendo escavada. Abre no dia 18.</p>
              </div>
            </div>
          </div>

          <div className="px-5 pt-5 sm:px-6">
            <Countdown />
          </div>

          <div className="p-5 sm:p-6 grid gap-6 md:grid-cols-[1fr_260px] items-start">
            <div>
              <p className="text-lg leading-snug">
                Heitor, o Flash Missions que você conhece está virando um jogo de verdade: o Miner Missions. Suas missões continuam, mas agora com vila, minerador e base para construir. Enquanto a obra acontece, a entrada fica fechada.
              </p>
              <div className="mt-5">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="mc-lbl">Obras</span>
                  <span className="mc-num">Etapa 1 de 5</span>
                </div>
                <div className="mc-bar"><div className="mc-bar-fill" style={{ width: '20%' }} /></div>
              </div>
              <h2 className="mc-h mt-6"><img src={`${UI}/map.webp`} alt="" className="mc-pixel" />O que vem por aí</h2>
              <ul className="mt-3 space-y-2">
                {COMING.map((c) => (
                  <li key={c.title} className="mc-slot rounded flex items-center gap-3 p-2">
                    <img src={c.icon} alt="" className="w-10 h-10 mc-pixel shrink-0" draggable={false} />
                    <span className="min-w-0">
                      <span className="block font-bold">{c.title}</span>
                      <span className="block text-sm mc-muted">{c.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mc-card rounded-lg p-4 text-center">
              <p className="mc-lbl">Enquanto isso</p>
              <p className="font-bold mt-1">Minere um bloco</p>
              <button
                type="button"
                onClick={mine}
                aria-label="Minerar o bloco"
                className={`relative mx-auto mt-3 block w-32 h-32 mc-slot rounded ${shake ? 'mc-shake' : ''} ${broken ? 'mc-pop' : ''}`}
              >
                {broken ? (
                  <img src={`${UI}/diamond.webp`} alt="" className="w-20 h-20 mx-auto mc-pixel" draggable={false} />
                ) : (
                  <>
                    <img src={`${UI}/base/mat_pedra.webp`} alt="" className="w-24 h-24 mx-auto mc-pixel" draggable={false} style={{ filter: `brightness(${1 - crack * 0.35})` }} />
                    {crack > 0 && (
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `repeating-linear-gradient(45deg, transparent 0 ${18 - crack * 12}px, rgba(0,0,0,${0.25 + crack * 0.4}) ${18 - crack * 12}px ${20 - crack * 12}px)`,
                        }}
                      />
                    )}
                  </>
                )}
              </button>
              <img src={`${UI}/miner.webp`} alt="" className="w-16 h-16 mx-auto mt-2 mc-pixel mc-flicker" draggable={false} />
              <p className="mt-2 text-sm mc-muted">{broken ? 'Diamante!' : `${HITS_TO_BREAK - hits} ${HITS_TO_BREAK - hits === 1 ? 'golpe' : 'golpes'} para quebrar`}</p>
              <p className="mc-num mc-diamond mt-2">{diamonds} {diamonds === 1 ? 'diamante' : 'diamantes'}</p>
              <p className="text-xs mc-muted mt-3">Eles vão contar quando a mina abrir.</p>
            </div>
          </div>

          <div className="px-5 pb-5 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-xs mc-muted">
            <span>Feito para o Heitor.</span>
            <span className="mc-lbl">Em construção</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teaser;
