/** Hash do enunciado: minúsculas, sem acento, sem pontuação, espaços únicos. */

export function normalizeQuestion(q: string): string {
  return q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
