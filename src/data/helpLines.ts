/** Falas de docs/conteudo/FALAS_APRENDER.md §1, copiadas literalmente. */

export interface HelpLine {
  id: string;
  text: string;
}

export const AREA_NUDGES: { id: string; skill: string; text: string }[] = [
  { id: 'av_mat_1', skill: 'MAT', text: 'Relê o fim da pergunta. Ela pede o resultado de qual conta?' },
  { id: 'av_mat_2', skill: 'MAT', text: 'Faz em dois pedaços. Qual é a primeira conta? E a segunda?' },
  { id: 'av_mat_3', skill: 'MAT', text: 'Confere os números do enunciado. Todos entraram na sua conta?' },
  { id: 'av_ing_1', skill: 'ING', text: 'Ouve de novo, devagar. A palavra que falta está na frase.' },
  { id: 'av_ing_2', skill: 'ING', text: 'Ouve de novo e presta atenção no pedaço antes do espaço.' },
  { id: 'av_ing_3', skill: 'ING', text: 'Ouve de novo e repete a frase baixinho. Qual opção cabe nela?' },
  { id: 'av_apl_1', skill: 'LIC.APLICA', text: 'Volta na ideia do dia. O que ela diz que funciona?' },
  { id: 'av_apl_2', skill: 'LIC.APLICA', text: 'Imagina a cena acontecendo. O que vem logo depois de cada escolha?' },
  { id: 'av_apl_3', skill: 'LIC.APLICA', text: 'Qual destas a ideia do dia mostra que não dá certo? Risca essa primeiro.' },
  { id: 'av_cau_1', skill: 'CIE.CAUSA', text: 'Pensa no que muda primeiro. O resto vem depois dele.' },
  { id: 'av_cau_2', skill: 'CIE.CAUSA', text: 'Imagina em câmera lenta. O que acontece antes de quê?' },
  { id: 'av_cau_3', skill: 'CIE.CAUSA', text: 'Testa cada opção na cabeça: se fosse assim, o que você veria?' },
  { id: 'av_ger_1', skill: 'GER', text: 'Relê a pergunta devagar. O que ela pede, exatamente?' },
  { id: 'av_ger_2', skill: 'GER', text: 'Risca a que você tem certeza que não é. O que sobra?' },
];

export const DESC_LINES = [
  'Descobriu.',
  'Achou. Olhou de novo e achou.',
  'Era isso. Você mudou e acertou.',
];

export const SEG_LINES = [
  'Essa engana. Olha como ela funciona.',
  'Ainda não. Olha o caminho: ela volta outro dia.',
];

export const FATO_LINES = [
  'Essa pega muita gente. Olha o porquê.',
  'A certa é outra. Guarda o porquê: ela volta.',
  'Não era essa. Lê o porquê com calma.',
];

export function areaNudgesFor(skill: string | undefined): { id: string; text: string }[] {
  const s = skill || '';
  const prefix = s.startsWith('MAT.') ? 'MAT' : s.startsWith('ING.') ? 'ING' : s === 'LIC.APLICA' || s === 'CIE.CAUSA' ? s : 'GER';
  const list = AREA_NUDGES.filter((line) => line.skill === prefix);
  return list.length ? list : AREA_NUDGES.filter((line) => line.skill === 'GER');
}

export function pickLine(lines: string[], seed: number): string {
  if (lines.length === 0) return '';
  const n = Math.abs(Math.trunc(seed)) % lines.length;
  return lines[n];
}
