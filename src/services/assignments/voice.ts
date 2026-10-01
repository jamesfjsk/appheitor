// Frases da criança. O número muda; a boca é a do desenho (§6.2).

import type { ProofKind } from '../../types/proof';
import { WEEKDAY_NAME } from './labels';

export function newCardKicker(): string {
  return 'Encomenda nova';
}

export function rewardLine(gold: number): string {
  return `Recompensa: ${gold} gold`;
}

export function timeLine(label: string): string {
  return label;
}

export function dueLine(weekday: number): string {
  const name = WEEKDAY_NAME[weekday] ?? 'o dia combinado';
  return `Prazo: ${name}`;
}

export function limitLine(max: number): string {
  return `Você já tem ${max} encomendas em andamento. Termine ou desista de uma para pegar outra.`;
}

export function projectLimitLine(): string {
  return 'Já tem um projeto em andamento. Termine ou desista dele para pegar outro.';
}

export function sinceLine(weekdayName: string): string {
  return `Em andamento desde ${weekdayName}`;
}

export function dropLine(): string {
  return 'Tudo bem. Ela volta para o quadro.';
}

export function submittedLine(): string {
  return 'Entregue. O pai vai conferir.';
}

export function changesLead(): string {
  return 'Ainda não está pronto. Veja o que precisa ajustar:';
}

export function approvedKicker(): string {
  return 'Encomenda concluída';
}

export function approvedLine(): string {
  return 'Entrega aprovada.';
}

export function goldGainLine(gold: number): string {
  return `+${gold} gold`;
}

export function competencyLine(name: string): string {
  return `Nova competência: ${name}`;
}

export function expiredLine(): string {
  return 'O prazo desta passou.';
}

export function emptyBoardLine(): string {
  return 'O quadro está limpo. O pai ainda não pregou encomenda nenhuma.';
}

export function showHow(kinds: readonly ProofKind[]): string {
  const bits: string[] = [];
  if (kinds.includes('checklist')) bits.push('marca o que ficou pronto');
  if (kinds.includes('questions')) bits.push('responde as perguntas');
  if (kinds.includes('inPerson')) bits.push('mostra ao pai quando ele vier conferir');
  if (kinds.includes('photo')) bits.push('a foto fica com o pai, na hora de conferir');
  if (bits.length === 0) return 'Mostra o que ficou pronto.';
  const text = bits.join(', ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export function materialLine(label: string, qty: number): string {
  return `Também entra ${qty} de ${label.toLowerCase()}.`;
}

export function showFatherLine(): string {
  return 'Mostre ao pai quando ele vier conferir.';
}

export function photoFatherLine(): string {
  return 'A foto fica com o pai, na hora de conferir.';
}

export function planAsk(): string {
  return 'O que você pretende fazer?';
}

export function failAsk(): string {
  return 'Deu algum problema antes de funcionar?';
}

export function changeAsk(): string {
  return 'O que você mudou para funcionar?';
}

export function adultBand(): string {
  return 'FAÇA COM UM ADULTO';
}

export function pesquisaWarning(): string {
  return 'Pesquise com o pai por perto e não compre nada.';
}

export function offlineLine(): string {
  return 'O quadro não abriu agora. Tenta de novo daqui a pouco.';
}

export function placaNew(title: string): string {
  return `Encomenda nova na Casa: ${title}`;
}

export function placaApproved(gold: number): string {
  return `Entrega aprovada: +${gold} gold`;
}

export function placaChanges(): string {
  return 'Ajustes pedidos: veja na Casa';
}

export function capWarn(cap: number): string {
  return `Esta aprovação passa o teto da semana (${cap}). Aprovar mesmo assim?`;
}

export function gamesBeatMissions(): string {
  return 'Esta semana os jogos renderam mais que as missões.';
}
