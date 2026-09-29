import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Assignment, AssignmentDraft, AssignmentSize, Specialty } from '../../types/assignment';
import type { ProofKind } from '../../types/proof';
import type { EconomySettings } from '../../types/village';
import type { Material } from '../../types/english';
import { DEFAULT_ECONOMY } from '../../config/village';
import { subscribeSettings } from '../../services/settingsService';
import { createAssignment } from '../../services/assignmentsService';
import { bandFor, countsTowardWeeklyCap, suggestedGold, weeklyCapGold } from '../../services/assignments/rewards';
import { SIZE_LABEL, SPECIALTY_LABEL, WEEKDAY_NAME, COMPETENCY_LABEL } from '../../services/assignments/labels';
import { ASSIGNMENT_TEMPLATES, templateById, templateDraft } from '../../services/assignments/templates';
import { comingWeekday } from '../../services/assignments/recurrence';
import { getTodayBrazil, isoWeekOf, nowBrazil } from '../../utils/clock';

const SIZES: AssignmentSize[] = ['pequena', 'normal', 'sabado', 'projeto', 'grande'];
const KINDS: ProofKind[] = ['checklist', 'questions', 'inPerson', 'photo'];
const MATERIALS: Material[] = ['madeira', 'pedra', 'ferro', 'redstone'];

function bandTalk(size: AssignmentSize): string {
  if (size === 'normal') return 'cerca de meio dia de renda';
  if (size === 'pequena') return 'um pedaço curto do dia';
  if (size === 'sabado') return 'quase um dia de renda';
  return 'até um dia de renda por semana de prazo';
}

function dayOf(iso: string | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? nowBrazil(ms).date : null;
}

const EncomendasCriar: React.FC<{
  uid: string;
  rows: Assignment[];
  seed: AssignmentDraft | null;
  onSeedUsed: () => void;
}> = ({ uid, rows, seed, onSeedUsed }) => {
  const today = getTodayBrazil();
  const [economy, setEconomy] = useState<EconomySettings>(DEFAULT_ECONOMY);
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [criteria, setCriteria] = useState('');
  const [questions, setQuestions] = useState('');
  const [kinds, setKinds] = useState<ProofKind[]>(['checklist']);
  const [specialty, setSpecialty] = useState<Specialty>('organizador');
  const [size, setSize] = useState<AssignmentSize>('normal');
  const [gold, setGold] = useState(6);
  const [xp, setXp] = useState(15);
  const [mats, setMats] = useState<Partial<Record<Material, number>>>({});
  const [comps, setComps] = useState<string[]>([]);
  const [adult, setAdult] = useState(false);
  const [dueOn, setDueOn] = useState(comingWeekday(today, 0));
  const [recurring, setRecurring] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [dueAfterDays, setDueAfterDays] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeSettings(
    'economy',
    DEFAULT_ECONOMY as unknown as Record<string, unknown>,
    (value) => setEconomy(value as unknown as EconomySettings),
  ), []);

  const apply = (draft: AssignmentDraft) => {
    setTemplateId(draft.templateId || '');
    setTitle(draft.title);
    setStory(draft.story || '');
    setDeliverable(draft.deliverable);
    setCriteria(draft.criteria.join('\n'));
    setQuestions((draft.proof.questions || []).join('\n'));
    setKinds(draft.proof.kinds.length ? draft.proof.kinds : ['checklist']);
    setSpecialty(draft.specialty);
    setSize(draft.size);
    const band = bandFor(draft.size, economy.incomeDayGold, economy.assignmentBands);
    setGold(draft.reward.gold > 0 ? draft.reward.gold : suggestedGold(draft.size, economy.incomeDayGold));
    setXp(draft.reward.xp > 0 ? draft.reward.xp : band.xp);
    setMats(draft.reward.materials || {});
    setComps(draft.competencies);
    setAdult(Boolean(draft.adult));
    setDueOn(draft.dueOn || comingWeekday(today, 0));
    setWeekdays(draft.weekdays || []);
    setDueAfterDays(draft.dueAfterDays ?? 0);
    setRecurring(Boolean(draft.recurring));
  };

  useEffect(() => {
    if (!seed) return;
    apply(seed);
    onSeedUsed();
    // seed is applied once; onSeedUsed clears it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const pickTemplate = (id: string) => {
    const template = templateById(id);
    if (!template) return;
    const band = bandFor(template.size, economy.incomeDayGold, economy.assignmentBands);
    const draft = templateDraft(template, comingWeekday(today, 0), suggestedGold(template.size, economy.incomeDayGold), band.xp);
    apply({ ...draft, recurring: template.recurring === 'suggest', weekdays: template.weekdays });
    if (template.recurring === 'suggest') setRecurring(true);
  };

  const onSize = (next: AssignmentSize) => {
    setSize(next);
    const band = bandFor(next, economy.incomeDayGold, economy.assignmentBands);
    setGold(suggestedGold(next, economy.incomeDayGold));
    setXp(band.xp);
  };

  const band = bandFor(size, economy.incomeDayGold, economy.assignmentBands);
  const week = isoWeekOf(today);
  const offered = rows.reduce((sum, row) => {
    if (!countsTowardWeeklyCap(row.size) || row.status === 'cancelled' || row.status === 'expired') return sum;
    if (row.availableOn && isoWeekOf(row.availableOn) === week) return sum + row.reward.gold;
    return sum;
  }, 0);
  const approved = rows.reduce((sum, row) => {
    if (!countsTowardWeeklyCap(row.size) || row.status !== 'approved') return sum;
    const day = dayOf(row.payout?.at);
    if (day && isoWeekOf(day) === week) return sum + (row.payout?.gold ?? 0);
    return sum;
  }, 0);
  const cap = weeklyCapGold(economy.incomeDayGold, economy.assignmentWeeklyCapDays);

  const save = async () => {
    setBusy(true);
    try {
      const materials = Object.fromEntries(
        MATERIALS.map((name) => [name, Math.floor(Number(mats[name]) || 0)]).filter(([, n]) => Number(n) > 0),
      ) as Partial<Record<Material, number>>;
      const draft: AssignmentDraft = {
        templateId: templateId || undefined,
        specialty,
        title,
        story,
        deliverable,
        criteria: criteria.split('\n').map((line) => line.trim()).filter(Boolean),
        proof: {
          kinds,
          questions: questions.split('\n').map((line) => line.trim()).filter(Boolean),
        },
        size,
        reward: { gold, xp, ...(Object.keys(materials).length ? { materials } : {}) },
        competencies: comps,
        adult,
        dueOn,
        recurring,
        weekdays,
        dueAfterDays,
      };
      await createAssignment(uid, draft, today);
      toast.success('Encomenda no quadro.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu para criar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3" data-testid="encomendas-criar">
      <h2 className="text-xl font-bold text-gray-900">Criar encomenda</h2>
      <p className="text-sm text-gray-600">Nesta semana: oferecido {offered} · aprovado {approved} · teto {cap}</p>
      <label className="block text-sm text-gray-700">
        Modelo
        <select className="mt-1 w-full border rounded px-2 py-2" value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
          <option value="">Escolher um modelo</option>
          {ASSIGNMENT_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <label className="block text-sm">Título
        <input className="mt-1 w-full border rounded px-2 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="block text-sm">História
        <input className="mt-1 w-full border rounded px-2 py-2" value={story} onChange={(e) => setStory(e.target.value)} />
      </label>
      <label className="block text-sm">Entrega
        <input className="mt-1 w-full border rounded px-2 py-2" value={deliverable} onChange={(e) => setDeliverable(e.target.value)} />
      </label>
      <label className="block text-sm">Para ficar pronto, um por linha
        <textarea className="mt-1 w-full border rounded px-2 py-2 min-h-[96px]" value={criteria} onChange={(e) => setCriteria(e.target.value)} />
      </label>
      <label className="block text-sm">Perguntas, uma por linha
        <textarea className="mt-1 w-full border rounded px-2 py-2 min-h-[72px]" value={questions} onChange={(e) => setQuestions(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-3 text-sm">
        {KINDS.map((kind) => (
          <label key={kind} className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={kinds.includes(kind)}
              onChange={() => setKinds((prev) => prev.includes(kind) ? prev.filter((item) => item !== kind) : [...prev, kind])}
            />
            {kind === 'checklist' ? 'checklist' : kind === 'questions' ? 'perguntas' : kind === 'inPerson' ? 'ver funcionando' : 'foto do pai'}
          </label>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">Especialidade
          <select className="mt-1 w-full border rounded px-2 py-2" value={specialty} onChange={(e) => setSpecialty(e.target.value as Specialty)}>
            {(Object.keys(SPECIALTY_LABEL) as Specialty[]).map((id) => <option key={id} value={id}>{SPECIALTY_LABEL[id]}</option>)}
          </select>
        </label>
        <label className="text-sm">Faixa
          <select className="mt-1 w-full border rounded px-2 py-2" value={size} onChange={(e) => onSize(e.target.value as AssignmentSize)}>
            {SIZES.map((id) => <option key={id} value={id}>{SIZE_LABEL[id]}</option>)}
          </select>
        </label>
      </div>
      <p className="text-sm text-gray-700">{band.minGold} a {band.maxGold} gold · {bandTalk(size)}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Gold
          <input type="number" min={0} className="mt-1 w-full border rounded px-2 py-2" value={gold} onChange={(e) => setGold(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
        </label>
        <label className="text-sm">XP
          <input type="number" min={0} className="mt-1 w-full border rounded px-2 py-2" value={xp} onChange={(e) => setXp(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
        </label>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MATERIALS.map((name) => (
          <label key={name} className="text-sm capitalize">{name}
            <input type="number" min={0} className="mt-1 w-full border rounded px-2 py-2" value={mats[name] || 0} onChange={(e) => setMats((prev) => ({ ...prev, [name]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {Object.keys(COMPETENCY_LABEL).map((id) => (
          <label key={id} className="inline-flex items-center gap-1">
            <input type="checkbox" checked={comps.includes(id)} onChange={() => setComps((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])} />
            {COMPETENCY_LABEL[id]}
          </label>
        ))}
      </div>
      <label className="text-sm">Prazo
        <input type="date" className="mt-1 block border rounded px-2 py-2" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        FAÇA COM UM ADULTO
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
        Salvar como recorrente
      </label>
      {recurring && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-sm">
            {WEEKDAY_NAME.map((name, index) => (
              <label key={name} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={weekdays.includes(index)}
                  onChange={() => setWeekdays((prev) => prev.includes(index) ? prev.filter((n) => n !== index) : [...prev, index])}
                />
                {name}
              </label>
            ))}
          </div>
          <label className="text-sm">Prazo em dias
            <input type="number" min={0} className="mt-1 block border rounded px-2 py-2 w-24" value={dueAfterDays} onChange={(e) => setDueAfterDays(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
          </label>
        </div>
      )}
      {(gold < band.minGold || gold > band.maxGold) && (
        <p className="text-sm text-amber-700">Este valor passa a faixa ({band.minGold} a {band.maxGold}).</p>
      )}
      <button type="button" data-testid="criar-encomenda" className="px-4 py-2 bg-blue-600 text-white rounded text-sm" disabled={busy} onClick={() => void save()}>
        Criar encomenda
      </button>
    </section>
  );
};

export default EncomendasCriar;
