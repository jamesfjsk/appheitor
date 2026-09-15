import React, { useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ENGLISH_CATEGORIES, ENGLISH_WORDS } from '../../data/englishVocabulary';
import { ENGLISH_DAILY_REWARDED_ROUNDS, EnglishProgressDoc, GAME_INFO, isMastered, subscribeEnglishProgress } from '../../services/englishGameService';

const EnglishProgressPanel: React.FC = () => {
  const { childUid } = useAuth();
  const [progress, setProgress] = useState<EnglishProgressDoc | null>(null);

  useEffect(() => {
    if (!childUid) return;
    return subscribeEnglishProgress(childUid, setProgress);
  }, [childUid]);

  const stats = ENGLISH_WORDS.map((w) => ({ w, s: progress?.words[w.id] }));
  const mastered = stats.filter((x) => isMastered(x.s));
  const weak = stats.filter((x) => x.s && x.s.seen >= 2 && x.s.wrong >= x.s.correct).sort((a, b) => (b.s!.wrong - b.s!.correct) - (a.s!.wrong - a.s!.correct)).slice(0, 8);
  const unseen = stats.filter((x) => !x.s || x.s.seen === 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-1">
          <Gamepad2 className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">Arena de Inglês</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Três jogos com as {ENGLISH_WORDS.length} palavras do projeto Minecraft English (figura, tradução e áudio). Cada jogo paga XP e gold
          em até {ENGLISH_DAILY_REWARDED_ROUNDS} rodadas por dia; depois disso ele pode continuar jogando sem prêmio. Uma palavra fica "dominada" com 3 acertos seguidos.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Rodadas jogadas" value={progress?.sessions ?? 0} />
          <Stat label="Palavras dominadas" value={`${mastered.length}/${ENGLISH_WORDS.length}`} />
          <Stat label="Nunca vistas" value={unseen.length} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-3">Palavras que ele mais erra</h3>
          {weak.length === 0 ? (
            <p className="text-sm text-gray-500">Nada por enquanto.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {weak.map(({ w, s }) => (
                <li key={w.id} className="py-2 flex items-center gap-3">
                  {w.image && <img src={w.image} alt="" className="w-8 h-8 object-contain" />}
                  <span className="flex-1"><strong>{w.word}</strong> · {w.translation}</span>
                  <span className="text-red-600">{s!.wrong} erros</span>
                  <span className="text-green-700">{s!.correct} acertos</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-3">Últimas rodadas</h3>
          {(progress?.recent.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma rodada ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {progress!.recent.map((s, i) => (
                <li key={i} className="py-2 flex items-center gap-3">
                  <span className="w-12 text-gray-500">{s.date.slice(5).split('-').reverse().join('/')}</span>
                  <span className="flex-1">{(GAME_INFO as Partial<Record<string, { title: string }>>)[s.game]?.title ?? s.game} · {s.correct}/{s.total}</span>
                  <span className={s.rewarded ? 'text-green-700 font-semibold' : 'text-gray-400'}>{s.rewarded ? `+${s.xpEarned} XP, +${s.goldEarned} gold` : 'treino'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-3">Domínio por categoria</h3>
        <div className="space-y-3">
          {ENGLISH_CATEGORIES.map((c) => {
            const list = stats.filter((x) => x.w.category === c.id);
            const done = list.filter((x) => isMastered(x.s)).length;
            return (
              <div key={c.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-gray-700">{c.label}</span>
                  <span className="text-gray-500">{done}/{list.length}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${(done / list.length) * 100}%` }} />
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {list.map(({ w, s }) => (
                    <span key={w.id} className={`px-2 py-0.5 rounded text-xs ${isMastered(s) ? 'bg-emerald-100 text-emerald-800' : s && s.seen > 0 ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                      {w.word}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl border border-gray-200 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default EnglishProgressPanel;
