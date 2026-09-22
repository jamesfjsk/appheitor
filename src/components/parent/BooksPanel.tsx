// Painel do pai: Estante do Sábio (decisão 40). Cadastrar livros, responder, aprovar ou anular relatos.
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import type { BookDoc, BookReportDoc } from '../../types';
import { BOOK_GOLD_MAX, LIKED_LABELS, goldForBook, goldForSize, sizeForPages } from '../../services/village/books';
import { addBook, parentApproveReport, parentVoidReport, setBookGold, setParentReply, subscribeBookReports, subscribeBooks } from '../../services/bookService';

const VERDICT_LABEL: Record<string, string> = {
  aceito: 'Aceito',
  falta: 'Faltou parte',
  suspeito: 'Pediu reescrita',
  fora: 'Fora do tema',
  colado: 'Colado',
  repetido: 'Repetido',
};

const SUSPECT_LABEL: Record<string, string> = {
  nenhum: '',
  copiado: 'parece a sinopse',
  ia: 'texto de adulto/IA',
  fora_do_tema: 'não fala do livro',
};

const BooksPanel: React.FC = () => {
  const { childUid } = useAuth();
  const [books, setBooks] = useState<BookDoc[]>([]);
  const [reports, setReports] = useState<BookReportDoc[]>([]);
  const [title, setTitle] = useState('');
  const [pages, setPages] = useState('');
  const [gold, setGold] = useState('');          // valor digitado pelo pai; vazio = sugestão pelas páginas
  const [goldEdit, setGoldEdit] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!childUid) return;
    const a = subscribeBooks(childUid, setBooks, () => undefined);
    const b = subscribeBookReports(childUid, setReports, () => undefined);
    return () => { a(); b(); };
  }, [childUid]);

  const add = async () => {
    if (!childUid) return;
    setBusy('add');
    try {
      await addBook(childUid, { title, pages: Number(pages), addedBy: 'parent', gold: gold ? Number(gold) : undefined });
      toast.success('Livro na estante');
      setTitle('');
      setPages('');
      setGold('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para cadastrar');
    } finally {
      setBusy(null);
    }
  };

  const saveGold = async (b: BookDoc) => {
    const raw = (goldEdit[b.id] ?? '').trim();
    setBusy(`gold:${b.id}`);
    try {
      await setBookGold(b.id, raw ? Number(raw) : null);
      toast.success(raw ? `"${b.title}" vale ${Number(raw)} gold` : 'Voltou ao valor pelo tamanho');
      setGoldEdit((m) => { const n = { ...m }; delete n[b.id]; return n; });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não salvou');
    } finally {
      setBusy(null);
    }
  };

  const saveReply = async (b: BookDoc) => {
    setBusy(b.id);
    try {
      await setParentReply(b.id, replies[b.id] ?? '');
      toast.success('O Sábio entrega na próxima visita');
    } catch {
      toast.error('Não salvou');
    } finally {
      setBusy(null);
    }
  };

  const approve = async (r: BookReportDoc) => {
    if (!childUid) return;
    setBusy(r.id);
    try {
      const out = await parentApproveReport(childUid, r.id);
      if (out.paid) toast.success(`Pago: ${out.gold} gold`);
      else toast(out.reason === 'day' ? 'Hoje já teve um livro pago; o relato fica aprovado sem gold' : 'Esse livro já foi pago');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para aprovar');
    } finally {
      setBusy(null);
    }
  };

  const voidIt = async (r: BookReportDoc) => {
    if (!childUid) return;
    if (!window.confirm(`Anular "${r.title}"? Estorna ${r.paidGold} gold e libera o livro.`)) return;
    setBusy(r.id);
    try {
      await parentVoidReport(childUid, r.id);
      toast.success('Anulado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para anular');
    } finally {
      setBusy(null);
    }
  };

  const toRead = books.filter((b) => b.status === 'to_read');
  const done = books.filter((b) => b.status === 'done');
  const size = Number(pages) > 0 ? sizeForPages(Number(pages)) : null;
  const suggested = size ? goldForSize(size) : null;
  const goldPreview = gold ? Number(gold) : suggested;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Estante do Sábio</h3>
        <p className="text-sm text-gray-600">
          Quando um livro entra em casa, cadastre aqui. O Heitor conta o livro ao Sábio quando termina; aceito paga o gold do livro e 40 XP, um por dia, cada livro uma vez.
          <strong>Você define quanto vale</strong> (1 a {BOOK_GOLD_MAX}); as páginas só sugerem (curto até 60: 8 · médio até 150: 15 · longo: 25). Um livro curto e denso pode valer mais que um grosso e leve. Livro proposto por ele só paga com o seu ok abaixo.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm text-gray-700 flex-1 min-w-[200px]">
            Título
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" placeholder="ex.: O Menino Maluquinho" />
          </label>
          <label className="text-sm text-gray-700 w-32">
            Páginas
            <input value={pages} inputMode="numeric" onChange={(e) => setPages(e.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" placeholder="96" />
          </label>
          <label className="text-sm text-gray-700 w-32">
            Vale (gold)
            <input value={gold} inputMode="numeric" onChange={(e) => setGold(e.target.value.replace(/\D/g, '').slice(0, 3))} className="mt-1 w-full border border-gray-300 rounded px-3 py-2" placeholder={suggested ? String(suggested) : '15'} />
          </label>
          <button type="button" disabled={busy === 'add' || title.trim().length < 3 || !Number(pages) || (gold !== '' && (Number(gold) < 1 || Number(gold) > BOOK_GOLD_MAX))} onClick={() => void add()} className="px-4 py-2 rounded bg-green-600 text-white font-medium disabled:opacity-50">
            Pôr na estante{goldPreview ? ` (${goldPreview} gold)` : ''}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-2">
        <h4 className="font-semibold text-gray-900">Para ler ({toRead.length})</h4>
        {toRead.length === 0 && <p className="text-sm text-gray-500">Nenhum livro esperando.</p>}
        {toRead.map((b) => (
          <div key={b.id} className="border border-gray-200 rounded p-3 flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-xs text-gray-500">{b.pages} páginas · {b.size} · vale {goldForBook(b)} gold{b.gold ? ' (definido por você)' : ' (pelo tamanho)'} · na estante desde {b.addedOn}{b.addedBy === 'child' ? ' · proposto por ele' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={goldEdit[b.id] ?? ''}
                inputMode="numeric"
                placeholder={String(goldForBook(b))}
                onChange={(e) => setGoldEdit((m) => ({ ...m, [b.id]: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                aria-label={`Quanto vale ${b.title}`}
              />
              <button type="button" disabled={busy === `gold:${b.id}` || goldEdit[b.id] === undefined} onClick={() => void saveGold(b)} className="px-3 py-1 rounded bg-gray-800 text-white text-sm disabled:opacity-50">
                Salvar valor
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-2">
        <h4 className="font-semibold text-gray-900">Lidos ({done.length})</h4>
        {done.length === 0 && <p className="text-sm text-gray-500">Nenhum ainda.</p>}
        {done.map((b) => (
          <div key={b.id} className="border border-gray-200 rounded p-3 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-medium">{b.title}</p>
              <p className="text-xs text-gray-500">lido em {b.doneOn} · {b.pages} páginas</p>
            </div>
            <div className="flex gap-2 items-start">
              <textarea
                value={replies[b.id] ?? b.parentReply ?? ''}
                onChange={(e) => setReplies((r) => ({ ...r, [b.id]: e.target.value.slice(0, 240) }))}
                rows={2}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Uma linha sua. O Sábio entrega: 'Seu pai leu e disse: …'"
              />
              <button type="button" disabled={busy === b.id} onClick={() => void saveReply(b)} className="px-3 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50">
                Salvar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-2">
        <h4 className="font-semibold text-gray-900">Relatos ({reports.length})</h4>
        {reports.length === 0 && <p className="text-sm text-gray-500">Nenhum relato ainda.</p>}
        {reports.map((r) => {
          const j = r.judge;
          const suspect = j ? SUSPECT_LABEL[j.suspeito] : '';
          const tone = r.accepted ? 'border-green-300 bg-green-50' : r.needsParent || r.flagged ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200';
          return (
            <div key={r.id} className={`border rounded p-3 space-y-1 ${tone}`}>
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">
                  {r.title} <span className="text-xs text-gray-500">· {r.date} · tentativa {r.attempt}</span>
                </p>
                <p className="text-xs text-gray-700">
                  {VERDICT_LABEL[r.verdict] || r.verdict}
                  {j ? ` · leu ${j.leu}/3` : ''}
                  {suspect ? ` · ${suspect}` : ''}
                  {r.paidGold ? ` · pago ${r.paidGold} gold` : ''}
                  {r.parentDecision === 'approved' ? ' · aprovado por você' : r.parentDecision === 'voided' ? ' · anulado' : ''}
                </p>
              </div>
              <p className="text-xs text-gray-600">
                {LIKED_LABELS[r.liked]}{r.rating != null ? ` · nota ${r.rating}` : ''} · {r.words} palavras · na estante há {r.readingDays} dia(s){r.pasted ? ' · texto colado' : ''}
                {j?.motivo ? ` · ${j.motivo}` : ''}
                {j?.faltou?.length ? ` · faltou: ${j.faltou.join(', ')}` : ''}
              </p>
              {r.verify && (
                <p className="text-xs text-gray-600">Pergunta: {r.verify.question} · ele: "{r.verify.answer}" · {r.verify.ok ? 'bateu' : 'não bateu'}</p>
              )}
              <button type="button" className="text-xs text-blue-700 underline" onClick={() => setOpen(open === r.id ? null : r.id)}>
                {open === r.id ? 'esconder o texto' : 'ver o texto'}
              </button>
              {open === r.id && <p className="text-sm whitespace-pre-wrap bg-white border border-gray-200 rounded p-2">{r.text}</p>}
              <div className="flex gap-2 pt-1">
                {!r.accepted && r.parentDecision !== 'voided' && (
                  <button type="button" disabled={busy === r.id} onClick={() => void approve(r)} className="px-3 py-1.5 rounded bg-green-600 text-white text-sm font-medium disabled:opacity-50">
                    Aprovar e pagar
                  </button>
                )}
                {r.accepted && r.paidGold > 0 && r.parentDecision !== 'voided' && (
                  <button type="button" disabled={busy === r.id} onClick={() => void voidIt(r)} className="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-medium disabled:opacity-50">
                    Anular
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BooksPanel;
