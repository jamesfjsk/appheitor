// Rótulos curtos. A frase da criança mora em voice.ts.

import type { AssignmentSize, Specialty } from '../../types/assignment';

export const SPECIALTY_LABEL: Record<Specialty, string> = {
  organizador: 'Organizador',
  testador: 'Testador',
  catalogador: 'Catalogador',
  pesquisador: 'Pesquisador',
  engenheiro: 'Engenheiro',
  inventor: 'Inventor',
};

export const SIZE_LABEL: Record<AssignmentSize, string> = {
  pequena: 'Pequena',
  normal: 'Normal',
  sabado: 'Sábado',
  projeto: 'Projeto',
  grande: 'Projeto grande',
};

export const SIZE_TIME: Record<AssignmentSize, string> = {
  pequena: '10 a 15 min',
  normal: '20 a 30 min',
  sabado: '45 a 60 min',
  projeto: '1 a 2 semanas',
  grande: '2 a 3 semanas',
};

export const WEEKDAY_NAME = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;

export const COMPETENCY_LABEL: Record<string, string> = {
  'mb-basico': 'micro:bit básico',
  entradas: 'Entradas',
  saidas: 'Saídas',
  circuito: 'Circuito na protoboard',
  sensor: 'Sensores externos',
  atuador: 'Atuadores externos',
  debug: 'Encontrar o erro',
  bancada: 'Bancada organizada',
  projeto: 'Projeto do começo ao fim',
};

export function competencyName(id: string): string {
  return COMPETENCY_LABEL[id] || id;
}
