// Prova de entrega compartilhada (CONTRATOS_E_CARREIRAS.md §7).
// Nasce nas Encomendas e serve às Missões com Comprovante quando elas forem feitas.

export type ProofKind = 'checklist' | 'questions' | 'inPerson' | 'photo';

export interface ProofAnswer {
  q: string;
  a: string;
}

/** O que a criança devolve. */
export interface Proof {
  kinds: ProofKind[];
  checklist?: boolean[];
  answers?: ProofAnswer[];
  note?: string;
}

/** O que o modelo pede. */
export interface ProofSpec {
  kinds: ProofKind[];
  questions?: string[];
}
