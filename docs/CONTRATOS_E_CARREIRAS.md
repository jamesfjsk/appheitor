# Encomendas e Carreiras

Documento de desenho, escrito em 27/09/2026 a partir do pedido do pai "Contratos e Carreiras". É a fonte de verdade deste sistema. O Cursor implementa pelos Pacotes 15a e 15b (`docs/etapas/PROMPT_CURSOR_2026-09-27.md`).

Sentimento alvo: "quero aquele prêmio, então pego uma encomenda, faço direito, entrego e guardo"; e, na bancada, "não funcionou, vou descobrir por quê".

## 0. Resumo

- **Três categorias, com regras diferentes.**
  - **Missões** são as responsabilidades de sempre e ficam como estão.
  - **Treinos** ensinam uma habilidade. Pagam XP, material e progresso de carreira, **nunca gold**.
  - **Encomendas** são trabalhos opcionais e úteis, com entrega, critérios, prazo e recompensa conhecida. **Gold só na aprovação do pai.**
- **"Encomenda" no lugar de "contrato".** "Contrato" já é a palavra da Mina: "Aceitar contrato", "Entregar contrato", "Quadro de contratos". A regra do roadmap é "um conceito, uma palavra, uma porta".
- **Onde fica.**
  - O Quadro de Encomendas é uma aba nova da Casa do Minerador, ao lado das Missões.
  - A Placa avisa "encomenda nova" e "entrega aprovada".
  - A carreira mora no **Laboratório**, obra nova no único lote livre da Vila (o `reserva`, que hoje diz "Esse lote espera outra obra").
- **Economia.**
  - Faixas medidas em dias de renda.
  - Encomendas curtas somam no máximo 2 dias de renda por semana, e só um projeto fica aceito por vez.
  - Fonte própria no livro-razão: `assignment`.
  - No painel, os ganhos aparecem em três grupos: missões da vida real, encomendas, jogos e aprendizado.
- **Carreira.** Estrutura genérica e uma carreira bem feita: **Engenheiro da Vila**, com títulos Aprendiz, Técnico, Engenheiro e Inventor. A progressão vem de competências demonstradas, não de XP.
- **Duas decisões do pai** estão no fim (§17).

## 1. O que existe e o que se reaproveita

Levantamento de 27/09 no código:

| Precisa | O que existe | Decisão |
|---|---|---|
| Fluxo entrega → conferência → pagamento | Nenhum. O mais parecido é o relatório de livro (`bookService.payBookReport`): o pai aprova e o pagamento sai numa transação com chave única. | Coleção nova `assignments`, com o padrão do livro (transação, chave `claimed`, linha no livro-razão). |
| Comprovante | Só no papel (`docs/MISSOES_COMPROVANTE.md`). Nada no código; o Storage só aceita `english/**`. | Tipo `Proof` e folha de entrega **compartilhados**: nascem aqui e servem às Missões com Comprovante quando elas forem feitas. |
| Modelos que o pai escolhe | `ChallengeManager` cria Desafios a partir de modelos. | Mesma ideia no painel: seis modelos de encomenda. |
| Transições protegidas por regra | `goals` tem as regras de status mais rígidas do arquivo (398-437). | Mesmo estilo de regra para `assignments`. |
| Conquistas | Catálogo `src/data/achievements.ts`, `bumpVillage` dentro da transação, `statSources.ts` testado. | 8 conquistas novas pelo mesmo caminho. |
| Avisos à criança | `notices` (Placa), no máximo 3 itens. | Tipo novo de aviso gerado pelo sistema. |
| Pendências do pai | `HojeCard` junta pedidos, metas, desafios. | Item novo "Entregas para conferir". |
| Economia | `progress.availableGold`, `goldTransactions`, `claimed`, R7 (`referenceIncome`), Balança, Extrato, relatório semanal, `scripts/econ-sim.mjs` (desatualizado desde a metade de 18/09). | Fonte nova, rótulos, três grupos de ganho e simulador atualizado. |
| Agendamento no servidor | Cloud Function agendada `agendaReminders` (`onSchedule`, fuso de São Paulo). | Função agendada nova para a recorrência. |
| Diário | Não existe; está planejado para o AP5. | Nesta versão, a reflexão do projeto fica gravada na encomenda; o Diário vai ler dali. |
| Aviso no celular do pai | O token do pai nunca é registrado; só a tela da criança pede permissão. | Fora da primeira versão. O pai vê a entrega no cartão Hoje. |

**Brecha antiga, que continua:** a criança pode escrever `progress` e criar linhas em `goldTransactions` (achado F03, `REVISAO_ETAPA_2_LANCAMENTO.md:327`). Este sistema não piora nada: **todo gold de encomenda é gravado pelo aparelho do pai**, na aprovação. Fechar a brecha de todo o jogo, levando os pagamentos para Cloud Functions, é outro pacote.

## 2. As três categorias

| | Missões (responsabilidades) | Treinos | Encomendas |
|---|---|---|---|
| Quem ganha com isso | a casa e ele, todo dia | ele, porque aprende | alguém: a casa, a oficina, o jogo |
| Obrigatória | sim (penalidade de 1 gold por perdida) | não | não |
| Gold | o de sempre | **nunca** | sim, só depois da aprovação |
| XP e material | como hoje | sim | sim |
| Quem cria | o pai (e a Agenda) | a carreira, que libera aos poucos | o pai, ou uma recorrência configurada por ele |
| Repetível | um por dia | cada treino, uma vez | cada instância, uma vez |

Nada muda nas missões. Treino e encomenda são entidades do mesmo motor (`assignments`), com `kind: 'training' | 'paid'`. A diferença de pagamento é garantida em três lugares:
- a função pura de recompensa, que devolve 0 gold para treino;
- a transação de aprovação;
- a regra do Firestore, em que treino nunca tem gold.

## 3. Nomes

| Na tela da criança | No código | Observação |
|---|---|---|
| Encomenda | `Assignment`, `kind: 'paid'`, coleção `assignments` | "Contrato" continua sendo só da Mina |
| Treino | `Assignment`, `kind: 'training'` | |
| Quadro de Encomendas | aba `encomendas` da Casa | |
| Especialidade (Organizador, Testador, Catalogador, Pesquisador, Engenheiro, Inventor) | `specialty` | aparece em cada cartão |
| Carreira; título (Aprendiz, Técnico, Engenheiro, Inventor) | `careers/{uid}`, `rank` | primeira versão: só Engenheiro da Vila |
| Laboratório | construção `laboratorio` no lote `reserva` | a casa da carreira |
| Entregar / Entrega aprovada / Ainda não está pronto | status `submitted` / `approved` / `needs_changes` | |

Sem "salário", "chefe", "funcionário", "expediente" ou "produtividade". Nada de "você abandonou".

## 4. Economia

### 4.1 O que ele ganha hoje

Dados reais de 21 a 27/09, sem ajustes do pai e sem prêmios:

| Fonte | Semana |
|---|---|
| Missões | 91 |
| Baú do Dia | 25 |
| Prova | 42 |
| Mina | 22 |
| Conquistas | 9 |
| Penalidades | −32 |
| **Líquido** | **157 (R7 ≈ 22 por dia)** |

O saldo dele hoje é 0.

Os prêmios cadastrados vão de 20 a 1.000 gold. "Sessão de cinema" custa 150, uma semana inteira guardando tudo.

**Achado para o pai.** A regra fixa de 18/09 diz que a missão da vida real pesa mais que qualquer jogo, e ela só vale se o Baú do Dia contar como missão:
- Missões sozinhas deram 91 na semana; prova, Mina e conquistas deram 73; o Baú deu 25.
- O Baú só abre com missões feitas, então ele é pagamento das missões.
- No painel novo, o Baú entra no grupo "missões da vida real". Assim a regra vale (116 contra 73) e fica visível toda semana.

### 4.2 Faixas, em dias de renda (D = R7, hoje cerca de 22)

| Faixa | Tempo | Recompensa | Hoje, em gold | XP |
|---|---|---|---|---|
| Pequena | 10 a 15 min | 0,1 a 0,2 D | 2 a 4 | 10 |
| Normal | 20 a 30 min | 0,2 a 0,3 D | 4 a 7 | 15 |
| Sábado | 45 a 60 min | 0,4 a 0,65 D | 9 a 14 | 25 |
| Projeto | 1 a 2 semanas | até 1 D por semana de prazo | 20 a 40 | 50 |
| Projeto grande | 2 a 3 semanas | até 1 D por semana de prazo | 45 a 65 | 80 |

- O formulário do pai mostra a faixa já em gold, calculada com o R7 do dia, e a frase "cerca de meio dia de renda".
- O valor é gravado na encomenda quando ela é criada e não muda depois de aceita.
- Os limites ficam em `settings/economy`:
  - `assignmentBands`: as faixas acima;
  - `assignmentWeeklyCapDays`: 2;
  - `assignmentActiveMax`: 3;
  - `assignmentProjectMax`: 1.

### 4.3 Tetos, sem virar máquina de gold

1. **Encomendas curtas** (pequena, normal, sábado) somam no máximo **2 D por semana**, hoje cerca de 45, contadas pelas aprovações da semana ISO.
2. **Só um projeto aceito por vez.** O valor dele é limitado pelo prazo: até 1 D por semana.
3. **Na aprovação**, se o valor passa do teto, o painel avisa:

   > "Esta aprovação passa o teto da semana (45). Aprovar mesmo assim?"

   O pai decide. A aprovação fica gravada com `overCap: true`, e o painel mostra quantas vezes isso aconteceu no mês.
4. **Nada é repetível.** Toda encomenda paga é criada pelo pai ou por uma recorrência dele, e cada instância paga uma vez só (§6).
5. **Treino paga 0 gold**, em qualquer caminho.

**O efeito, medido.**

| Semana | Gold | Prêmio de 150 sai em |
|---|---|---|
| Normal | cerca de 157 | 7 dias |
| Com encomendas no teto | cerca de 200 (+30%) | 5 dias |
| Com projeto de duas semanas junto | cerca de 225 | pouco mais de 4 dias |

Duas encomendas normais somam no máximo 14 gold: ninguém compra em duas tardes o que custa uma semana.

### 4.4 A hierarquia: vida real, depois encomendas, depois jogos

- **Missões** pagam todo dia, cerca de 13 a 15 gold. **Encomendas**, no máximo cerca de 6,5 por dia de média (45 na semana). A missão continua sendo a base.
- **Encomenda contra jogo.** Todas as fontes de jogo têm cota diária e não se repetem: a prova paga uma vez, a Mina paga só os primeiros contratos, a Vagoneta paga 0 gold. Depois da cota do dia, **a única coisa que ainda rende gold é uma encomenda**. Nunca compensa mais jogar 20 minutos do que entregar algo útil.
- **Encomenda não entra no teto de gold de jogo** (`GAME_GOLD_SOURCES`), porque não é jogo.

### 4.5 Livro-razão e painel

- **Fonte nova.** `source: 'assignment'`, `type: 'earned'`, com `relatedId` (id da encomenda) e `relatedTitle`.
- **Chave de uma vez só.** `claimed['assignment:<id>']`, com o novo `ClaimKind` `'assignment'`.
- **Linha do livro-razão com id fixo**, `goldTransactions/assignment_<id>`. O `set` dentro da transação falha se a linha já existir.
- **Rótulo "Encomendas"** em `balance.ts`, `Extrato.tsx` e `GoldHistory.tsx`.
- **Função pura `incomeBucket(source)`**, com três grupos:
  - **missões da vida real:** `task_completion`, `late_task`, `task_reversal`, `chest`, `streak_chest`, `repair`;
  - **encomendas:** `assignment`;
  - **jogos e aprendizado:** `quiz`, `english_game`, `achievement`, `challenge`, `book_report`.

  A penalidade (`daily_penalty`) e os juros (`goal_interest`) aparecem numa linha à parte.
- **Cartão novo "Ganhos da semana"**, na Balança e no relatório semanal:

  > Missões da vida real: 116 · Encomendas: 12 · Jogos e aprendizado: 73

  Uma frase aparece quando a regra de 18/09 falha: "Esta semana os jogos renderam mais que as missões."
- **Simulador.** `scripts/econ-sim.mjs` passa aos valores de hoje (renda de referência 22, missões e prova depois da metade) e ganha três perfis de encomenda: nenhuma, duas pequenas por semana e no teto. Ele imprime em quantos dias sai um prêmio de 150, de 300 e de 900.

## 5. Onde mora, no universo da Vila

### 5.1 Quadro de Encomendas: aba nova da Casa do Minerador

- A Casa passa a ter três abas: **Missões**, **Encomendas** e **Fechar o dia**.
- As missões e as encomendas ficam lado a lado, e a diferença se vê na forma:
  - a missão é uma linha com "Concluir";
  - a encomenda é um cartão de papel preso no quadro, com a especialidade no alto e a recompensa embaixo.
- A **Placa** só aponta para lá: "Encomenda nova na Casa: arrumar a caixa de cabos." Tocar no aviso abre a aba.
- A Placa também avisa "Entrega aprovada: +6 gold" e "Ajustes pedidos: veja na Casa".

### 5.2 Laboratório: a casa da carreira

- **Onde fica.** Obra nova no lote `reserva` (x468, y234).
- **Quando aparece.** Só depois que o pai aperta "Começar a carreira Engenheiro da Vila" no painel, quando o kit estiver com o Heitor. Antes disso, o lote segue vazio.
- **Nível da obra é o título da carreira:** n1 Aprendiz, n2 Técnico, n3 Engenheiro, n4 Inventor.
  - A obra não se compra com material: cresce quando ele é promovido, com a cerimônia de obra que já existe.
  - Arte: `buildings/laboratorio-1..4.png`, do líder, conferida numa prancha antes de entrar. Só a n1 é necessária para o 15b.
- **O que abre ao tocar:** a tela da carreira (§11.6), com os treinos, os projetos e as ferramentas.
- **Encomendas de engenharia** aparecem no Quadro da Casa, como todas as outras, e também numa lista "Projetos" dentro do Laboratório.

## 6. Estados e fluxo

### 6.1 Estados

`in_progress` não existe como status separado: é o mesmo que `accepted`.

| Status | Significado | Quem leva até ele |
|---|---|---|
| `available` | no quadro, ainda não aceita | pai (criação), recorrência, desistência da criança |
| `accepted` | em andamento | criança |
| `submitted` | entregue, esperando o pai | criança |
| `needs_changes` | ajustes pedidos | pai |
| `approved` | concluída e paga | pai (transação de pagamento) |
| `cancelled` | retirada pelo pai | pai |
| `expired` | o prazo passou antes da entrega | função agendada; a tela calcula antes dela |

Transições permitidas, e só estas:

```
available     -> accepted        criança (encomenda; respeita o limite de ativas)
available     -> submitted       criança (só treino: treino não precisa aceitar)
accepted      -> submitted       criança (com comprovante)
needs_changes -> submitted       criança (nova entrega)
accepted      -> available       criança (desistir; drops + 1)
needs_changes -> available       criança (desistir; drops + 1)
submitted     -> approved        pai (paga)
submitted     -> needs_changes   pai (lista o que falta)
qualquer uma, menos approved -> cancelled   pai
available/accepted/needs_changes -> expired   função agendada, quando o prazo passa
```

- **Função pura** `nextStatus(current, action, ctx)`: devolve o status novo ou um erro com o motivo.
- **Função pura** `effectiveStatus(a, today)`: mostra "o prazo passou" mesmo antes de a função agendada gravar `expired`.
- **Entrega depois do prazo.** Se ele já tinha entregue (`submitted`), o pai confere normalmente. Uma encomenda `expired` o pai pode reabrir com prazo novo.

### 6.2 O que a criança vê em cada estado

| Estado | Tela |
|---|---|
| Disponível | cartão "ENCOMENDA NOVA" · especialidade · título · uma linha de história · "Recompensa: 6 gold" · "20 a 30 min" · "Prazo: domingo" · [Ver encomenda] |
| Detalhe | "O que é pedido" (a entrega) · "Para ficar pronto" (os critérios, visíveis **antes** de aceitar) · "Como mostrar" (a prova) · prazo · recompensa (gold, XP, material) · faixa FAÇA COM UM ADULTO quando houver · [Aceitar encomenda] |
| Limite cheio | "Você já tem 3 encomendas em andamento. Termine ou desista de uma para pegar outra." |
| Em andamento | "Em andamento desde sábado" · os critérios · [Entregar] · link discreto "Desistir desta encomenda" |
| Desistir | confirmação: "Tudo bem. Ela volta para o quadro." Sem número de desistências na tela dele. |
| Entregue | "Entregue. O pai vai conferir." |
| Ajustes pedidos | "Ainda não está pronto. Veja o que precisa ajustar:" · os critérios que faltaram, marcados · a frase do pai · [Entregar de novo] |
| Aprovada | "Encomenda concluída" · "Entrega aprovada." · "+6 gold" · "Nova competência: Organização de componentes", quando houver. A celebração grande fica só para promoção de título. |
| Prazo passou | "O prazo desta passou." Sem cobrança. Sai do quadro no dia seguinte. |

### 6.3 Limite de ativas

- **Até 3 encomendas aceitas ao mesmo tempo**, das quais **no máximo 1 projeto**. Treinos não entram na conta. Três é o bastante para escolher sem virar lista de tarefas; o número fica configurável.
- **Onde se garante:**
  - o doc `assignmentBoards/{uid}` guarda `{ active: string[] }`;
  - aceitar e desistir mexem nele na mesma transação da encomenda;
  - a regra confere `getAfter(...).data.active.size() <= 3`.

### 6.4 Recorrência

- `assignmentRecurrences/{id}`, só do pai. Guarda o modelo inteiro, os dias da semana (`weekdays`, 0 = domingo), `dueAfterDays` (0 = no mesmo dia) e `active`.
- **Função agendada `assignmentRecurrences`** (`onSchedule`, `'5 0 * * *'`, fuso de São Paulo):
  - para cada recorrência ativa cujo dia bate com hoje, cria `assignments/{recurrenceId}_{AAAA-MM-DD}` só se ainda não existir. O id fixo garante uma instância por período;
  - marca como `expired` o que passou do prazo.
- **Callable `generateAssignmentsNow`** (só admin), para o botão "Gerar hoje" do painel. A lógica é a mesma, e rodar duas vezes não duplica.
- A instância de ontem que ninguém aceitou vira `expired`. A de hoje é outra.

## 7. Prova de entrega (compartilhada com as Missões com Comprovante)

O Heitor usa um PC sem câmera (`MISSOES_COMPROVANTE.md` §2). Por isso a prova da criança é o que ele escreve e marca, e a foto, quando houver, é do celular do pai.

| Tipo | A criança faz | O pai faz |
|---|---|---|
| `checklist` | marca, um a um, os critérios que estão prontos. **Só entrega com todos marcados**: ele aprende o que é "pronto" antes de chamar o pai | confere |
| `questions` | responde as perguntas curtas do modelo (ex.: QA: "O que testou?", "Algo confuso?", "Se achou um erro, como repetir?") | lê |
| `inPerson` | aparece a linha "Mostre ao pai quando ele vier conferir" | vê pessoalmente; marca "vi funcionando" |
| `photo` | nada | pode anexar foto pelo celular ao aprovar (Storage `proofs/{uid}/assignments/{id}/{n}.jpg`) |

- **Tipo `Proof`** em `src/types/proof.ts`: `{ kinds, checklist?: boolean[], answers?: { q: string; a: string }[], note?: string }`.
- **Componente `ProofSheet.tsx`**, em `src/components/hero/proof/`. Ele recebe critérios e perguntas e devolve um `Proof`. Quando as Missões com Comprovante forem feitas, usam os dois.
- **Storage.** `storage.rules` ganha `proofs/{uid}/**`: escrita só do admin, leitura do dono e do admin, imagem até 3 MB.
- **Metacognição leve**, só em projetos e treinos de erro (§11.5). Não em toda encomenda.

## 8. Modelo de dados

```ts
// assignments/{id}
interface Assignment {
  userId: string;
  kind: 'paid' | 'training';
  templateId?: string;             // modelo do painel ou treino da carreira
  specialty: 'organizador' | 'testador' | 'catalogador' | 'pesquisador' | 'engenheiro' | 'inventor';
  careerId?: 'engenheiro';
  title: string;                   // "Arrumar a caixa de cabos"
  story?: string;                  // "Os cabos da oficina estão todos misturados."
  deliverable: string;             // "25 cabos separados por tipo e guardados na caixa certa"
  criteria: string[];              // "Para ficar pronto"
  proof: { kinds: ('checklist' | 'questions' | 'inPerson' | 'photo')[]; questions?: string[] };
  size?: 'pequena' | 'normal' | 'sabado' | 'projeto' | 'grande';   // só paid
  reward: { gold: number; xp: number; materials?: Partial<Record<Material, number>> };  // training: gold 0
  competencies: string[];          // ids da carreira
  adult?: boolean;                 // FAÇA COM UM ADULTO
  status: 'available' | 'accepted' | 'submitted' | 'needs_changes' | 'approved' | 'cancelled' | 'expired';
  availableOn: string;             // AAAA-MM-DD
  dueOn?: string;                  // AAAA-MM-DD
  dueAt?: Timestamp;               // fim do dia dueOn em São Paulo (usado pela regra)
  recurrenceId?: string;
  periodKey?: string;              // AAAA-MM-DD da instância
  createdBy: 'admin' | 'system';
  acceptedAt?: Timestamp;
  plan?: string;                   // projetos: "O que você pretende fazer?"
  submissions: { at: Timestamp; proof: Proof; whatWentWrong?: string; whatChanged?: string }[];  // só cresce
  reviews: {
    at: Timestamp;
    verdict: 'approved' | 'needs_changes' | 'cancelled';
    missing?: number[];            // índices dos critérios que faltaram
    note?: string;                 // frase do pai para a criança
    photoPaths?: string[];
    competencies?: string[];       // competências que o pai viu demonstradas
    fixedAfterFailure?: boolean;   // houve falha e ele corrigiu
    sawItWorking?: boolean;
    overCap?: boolean;
  }[];
  drops: number;                   // desistências (só o painel mostra)
  payout?: { txId: string; gold: number; xp: number; materials?: Partial<Record<Material, number>>; at: Timestamp };
  createdAt: Timestamp; updatedAt: Timestamp;
}

// assignmentRecurrences/{id}: o modelo da encomenda + weekdays, dueAfterDays, active (só admin)
// assignmentBoards/{uid}: { userId, active: string[], updatedAt }
// careers/{uid}: §11.3
```

- **Nunca gravar `undefined`** (invariante 8): usar `omitUndefined`.
- **Nada disso vai para `englishBase`** (invariante 10). O material pago entra por `increment` em `englishBase/{uid}.materials`, como `completeTaskWithRewards` já faz, sem reescrever o documento.

## 9. Pagamento: atômico e de uma vez só

`approveAssignment(uid, id, review)` roda no aparelho do pai (admin), numa `runTransaction`:

1. Lê a encomenda.
   - Se o status não é `submitted`, termina sem escrever nada.
   - Se já é `approved`, avisa "já aprovada".
2. Lê `progress/{uid}`, `village/{uid}` (`claimed`) e `careers/{uid}`.
3. Se `claimed['assignment:<id>']` já existe, grava só o status `approved`, se faltar, e termina.
4. Calcula a recompensa com a função pura `assignmentReward(a, config)`:
   - **treino:** o valor vem do `src/config/careers.ts` pelo `templateId`, nunca do documento, e o gold é sempre 0;
   - **encomenda:** `a.reward`.
5. Grava tudo na mesma transação:
   - a encomenda, com status `approved`, `payout` e a revisão;
   - o gold em `progress`: `availableGold` absoluto, com `totalGoldEarned` e `totalXP` por `increment`;
   - `goldTransactions/assignment_<id>` por `set`, com `balanceBefore`/`balanceAfter`; o id fixo faz a segunda tentativa falhar;
   - `claimed['assignment:<id>']`;
   - os materiais, por `increment` em `englishBase`;
   - `careers/{uid}`: competências, contadores e promoção (função pura `applyApproval`);
   - as estatísticas da Vila, por `bumpVillage` (o que abre as conquistas);
   - a retirada do id de `assignmentBoards.active`.
6. Depois da transação, cria o aviso da Placa.

Cenários obrigatórios, todos com teste:

| Cenário | Resultado |
|---|---|
| "Entregar" apertado duas vezes | a segunda escrita encontra `submitted` e a regra recusa `submitted -> submitted` |
| "Aprovar" apertado duas vezes, ou em dois aparelhos | a segunda transação vê `approved` e não escreve nada |
| Internet cai durante a aprovação | a transação grava tudo ou nada; ao repetir, vê o estado certo |
| Recarregar a página | a tela vem do Firestore, nada fica só na memória |
| Recorrência rodada de novo | o id fixo impede a segunda instância |
| Prazo vencido | não aceita (regra `request.time < dueAt`) e não entrega |
| Ajuste e nova entrega | `submissions` cresce, `reviews` cresce, e paga uma vez na aprovação final |
| Treino com gold no documento | a transação ignora o valor do documento e paga 0 gold |

## 10. Regras do Firestore

```
match /assignments/{id} {
  allow read: if isAdmin() || (signedIn() && (resource == null || resource.data.userId == request.auth.uid));
  allow create, delete: if isAdmin();
  allow update: if isAdmin() || childMove();
}
```

`childMove()` só aceita, com `resource.data.userId == request.auth.uid`:
- **aceitar:**
  - condições: `kind == 'paid'`, de `available` para `accepted`, antes de `dueAt`;
  - campos alterados: `status`, `acceptedAt`, `plan`, `updatedAt`;
  - o quadro: `getAfter(assignmentBoards/uid).data.active` contém o id e tem no máximo 3 itens.
- **entregar:**
  - condições: de `accepted` ou `needs_changes` (ou `available`, se `kind == 'training'`) para `submitted`, antes de `dueAt`;
  - campos alterados: `status`, `submissions`, `updatedAt`;
  - `submissions.size() == resource.data.submissions.size() + 1`.
- **desistir:**
  - condições: de `accepted` ou `needs_changes` para `available`, com `drops == resource.data.drops + 1`;
  - campos alterados: `status`, `acceptedAt`, `drops`, `updatedAt`;
  - o quadro: o id sai de `active`.

A criança nunca altera `reward`, `criteria`, `kind`, `reviews`, `payout` nem `competencies`.

Outras coleções:
- `assignmentRecurrences`: leitura e escrita só do admin; a criança não precisa ler.
- `assignmentBoards/{uid}`: o dono lê. Na escrita, o dono só altera `active` e `updatedAt`, com `active.size() <= 3`; o admin pode tudo.
- `careers/{uid}`: o dono lê; só o admin escreve. A promoção acontece na transação de aprovação, então a criança nunca se promove.
- `notices` de tipo `assignment`: criados pelo aparelho do pai, como os avisos que ele já escreve.

## 11. Carreiras

### 11.1 Estrutura genérica (`src/config/careers.ts`, puro)

```ts
interface CareerDef {
  id: string; name: string; icon: string; description: string;
  ranks: { id: string; name: string; requirements: RankRequirement[] }[];   // o primeiro não tem requisito
  competencies: { id: string; name: string; description: string }[];
  trainings: TrainingDef[];      // conteúdo em docs/conteudo/ENGENHEIRO_TREINOS.md
  tools: { id: string; name: string; unlockAfterTraining: string }[];
}
type RankRequirement =
  | { type: 'competency'; id: string; level: 'praticando' | 'domina' }
  | { type: 'projects'; count: number }
  | { type: 'projectsFixed'; count: number }         // projeto com correção depois de uma falha
  | { type: 'ownProblemProjects'; count: number };   // projeto nascido de um "Problema da casa"
```

- **Adicionar uma carreira** (Testador, Organizador, Pesquisador...) é acrescentar um `CareerDef` e um lote.
- **Na primeira versão, só `engenheiro`.** As outras especialidades existem como rótulo e contador nas encomendas, sem título.

### 11.2 Competência: três estados, sem porcentagem

| Estado | Quando | Na tela |
|---|---|---|
| Ainda não explorou | nenhuma demonstração aprovada | círculo vazio |
| Praticando | 1 demonstração aprovada | círculo pela metade |
| Já domina | 2 demonstrações aprovadas em atividades diferentes | círculo cheio |

- **Quem decide o que foi demonstrado é o pai.** Na aprovação, ele marca as competências que viu, já pré-marcadas pela encomenda ou pelo treino.
- **Ajuste manual.** O pai pode mudar o estado de uma competência no painel. Serve quando ele viu algo fora do app.
- **Invariante 14(d):** nenhuma nota, nenhuma porcentagem, nenhum "fraco".

### 11.3 Progresso (`careers/{uid}`)

```ts
{
  userId,
  engenheiro: {
    startedAt: string;                        // o pai começou a carreira
    rank: 'aprendiz' | 'tecnico' | 'engenheiro' | 'inventor';
    competencies: Record<string, { level: 'praticando' | 'domina'; evidence: string[] }>;  // ids de assignments
    trainingsDone: string[];
    projects: number; projectsFixed: number; ownProblemProjects: number;
    promotions: Record<string, string>;       // título -> data
    celebrate?: string;                       // título novo ainda não celebrado na tela
    tools: string[];                          // 'metodo'
  }
}
```

### 11.4 Engenheiro da Vila

**Competências:**

| id | Nome | O que é |
|---|---|---|
| `mb-basico` | micro:bit básico | ligar, baixar um programa, usar a matriz de LEDs |
| `entradas` | Entradas | botões A e B, movimento, luz |
| `saidas` | Saídas | matriz, som |
| `circuito` | Circuito na protoboard | LED com resistor, fios, ligação certa |
| `sensor` | Sensores externos | LDR, botão externo |
| `atuador` | Atuadores externos | buzzer, LED externo |
| `debug` | Encontrar o erro | o Método do Engenheiro: descobrir por que não funciona |
| `bancada` | Bancada organizada | peças guardadas, bancada limpa no fim |
| `projeto` | Projeto do começo ao fim | entender o problema, montar, testar, corrigir, mostrar |

**Títulos e requisitos:**

| Título | Para chegar |
|---|---|
| Aprendiz | começar a carreira |
| Técnico | `mb-basico`, `entradas` e `saidas` em Já domina; `circuito`, `sensor`, `atuador`, `debug` e `bancada` pelo menos em Praticando |
| Engenheiro | `circuito`, `sensor`, `atuador` e `debug` em Já domina; 2 projetos aprovados; 1 deles com correção depois de uma falha |
| Inventor | 1 projeto aprovado que nasceu de um "Problema da casa" dele; `projeto` em Já domina |

- **Promoção** na transação de aprovação, pela função pura `nextRank(progress, career)`.
- **Na tela:** "Você agora é Técnico da Vila." com a cerimônia de obra do Laboratório (n2) e a fala do Ferreiro. É a única celebração grande do sistema.

### 11.5 Treinos, Método do Engenheiro e metacognição

**Treinos.** São 14, mais um marco, liberados aos poucos. O conteúdo está em `docs/conteudo/ENGENHEIRO_TREINOS.md` e passa pela amostra do pai.
- Primeiro dia: 1 a 3.
- Cada aprovação libera os próximos, pelo campo `unlocks` do treino.
- A instância do treino seguinte é criada pela transação de aprovação do pai, porque a criança nunca cria documento.
- **Cada treino tem:**
  - objetivo e o que vai usar;
  - passos no MakeCode, com o link "Abrir o MakeCode" (`makecode.microbit.org`, em aba nova);
  - "Funciona quando...": a demonstração;
  - pistas em degraus;
  - competências, tempo, FAÇA COM UM ADULTO quando couber;
  - recompensa: XP e 1 redstone. Redstone é o circuito do mundo dele; a Vagoneta já paga redstone.
- **Entrega do treino:** "Mostrar ao pai". A prova é `inPerson`, com uma frase opcional: "O que você aprendeu?".

**Pistas em degraus.** Cada treino tem até 5, sempre na mesma ordem, e ele abre uma por vez, só se quiser:
1. alimentação;
2. ligação;
3. entrada e saída;
4. código;
5. pista específica.

Nunca "ligue o fio no P0" de cara. Pista é grátis e não muda a recompensa (decisão 43). A tela grava `hintsUsed`, para o pai ver, sem mostrar à criança.

**Método do Engenheiro**, ferramenta da carreira.
- **Quando libera:** ao aprovar o treino 7, o primeiro circuito externo. Aparece como "Ferramenta nova: Método do Engenheiro".
- **Onde aparece:** vira o botão "Não funcionou?" nos treinos e nos projetos, que abre um cartão com os passos, sem popup em todo erro:
  1. O que deveria acontecer?
  2. O que aconteceu de verdade?
  3. Confira as ligações.
  4. Confira a alimentação.
  5. Confira o código.
  6. Mude uma coisa só.
  7. Teste de novo.
  8. Se ainda não funcionar, conte o que já tentou.
- **Embaixo do cartão,** as pistas em degraus do treino.

**Metacognição leve**, só em projetos e no treino 12 ("Encontre o erro"):
- ao aceitar um projeto: "O que você pretende fazer?" (uma linha, opcional), gravada em `plan`;
- na entrega: "Deu algum problema antes de funcionar?" (sim/não) e, se sim, "O que você mudou para funcionar?" (uma linha). Ficam em `submissions[].whatWentWrong` e `whatChanged`;
- na aprovação, o pai marca "houve falha e ele corrigiu" (`fixedAfterFailure`), que conta para o título de Engenheiro. **Erro corrigido conta a favor.**

### 11.6 Tela da carreira (Laboratório)

```
Engenheiro da Vila                                    Aprendiz

Competências
  ● micro:bit básico          Já domina
  ◐ Entradas                  Praticando
  ○ Circuito na protoboard    Ainda não explorou
  ...

Próximo título: Técnico
Para chegar lá:
  ✓ micro:bit básico, entradas e saídas dominados
  ○ montar um circuito na protoboard
  ○ usar um sensor externo
  ○ resolver uma falha
  ○ guardar a bancada arrumada

Treinos            Projetos            Ferramentas
```

- Os marcadores são ícones pixel do próprio jogo, sem emoji.
- A aba Treinos mostra os liberados, os feitos e "o próximo abre quando o pai aprovar este".

### 11.7 Segurança da carreira

- **Só baixa tensão:** micro:bit por USB ou pilhas AA (3 V), componentes de 3,3 V, LEDs com resistor e o que vier no kit ELECFREAKS.
- **Proibido em qualquer conteúdo, treino ou modelo de encomenda:**
  - tomada, 127 ou 220 V, rede elétrica da casa;
  - fonte aberta, capacitor grande;
  - bateria estufada ou danificada, carregar bateria de lítio solta;
  - ferro de solda sem adulto.
- **Faixa "FAÇA COM UM ADULTO"** (`adult: true`) quando houver ferramenta de corte, cola quente, furadeira ou qualquer montagem fora da protoboard.
- O painel mostra essa faixa também ao pai, na aprovação.

## 12. Painel do pai (Tailwind branco e azul, invariante 11)

Aba nova **Encomendas**, no grupo Jogo, com cinco partes:

1. **Para conferir.** As entregas, com:
   - a prova: critérios marcados, respostas e a frase dele;
   - o que ele respondeu sobre falhas;
   - as pistas que abriu.

   Botões:
   - **Aprovar:** competências pré-marcadas, "vi funcionando", "houve falha e ele corrigiu", foto opcional e o aviso de teto;
   - **Pedir ajuste:** marca os critérios que faltaram e escreve uma frase curta. A tela da criança mostra essa frase como está, então ela deve dizer o que fazer, sem bronca;
   - **Cancelar.**
2. **Criar encomenda.** Seis modelos (§13) preenchem tudo, e ele só ajusta.
   - Campos: título, história, entrega, critérios, prova, especialidade, faixa (com o valor em gold e em dias), XP, material, competências, prazo, FAÇA COM UM ADULTO.
   - "Salvar como recorrente": dias da semana e prazo em dias.
   - Um medidor mostra o que já foi oferecido e aprovado na semana contra o teto.
3. **Recorrentes.** Lista com pausar, editar e "Gerar hoje".
4. **Carreira.**
   - "Começar Engenheiro da Vila": cria `careers/{uid}` e os treinos 1 a 3.
   - O progresso, com os estados das competências editáveis.
   - O histórico de promoções.
5. **Como ele trabalha.** Quatro respostas em frase, sem gráfico:
   - "Aceita e termina?": aceitas e aprovadas nos últimos 30 dias, mais as desistências, que só o pai vê.
   - "Precisa de muita intervenção?": média de ajustes por entrega aprovada e pistas abertas por treino.
   - "Está corrigindo sozinho?": projetos com correção depois de falha e o que ele respondeu em "O que você mudou".
   - "O que desperta interesse?": encomendas aceitas por especialidade.
   - O tempo entre aceitar e entregar aparece só como contexto ("levou 3 dias"). **Nunca vira nota ou comparação** (§32 do pedido).

Mais:
- **Hoje:** item "N entregas para conferir".
- **Balança e relatório semanal:** o cartão "Ganhos da semana" (§4.5).

## 13. Modelos de encomenda (conteúdo em `docs/conteudo/ENCOMENDAS_MODELOS.md`)

| Modelo | Especialidade | Faixa sugerida | Prova | Recorrência sugerida |
|---|---|---|---|---|
| Teste do Miner Missions | Testador | normal | perguntas | terça e sábado |
| Almoxarifado (organizar) | Organizador | normal ou sábado | checklist + foto do pai | quando precisar |
| Inventário | Catalogador | sábado | perguntas (tabela curta) | sábado |
| Pesquisa de compra | Pesquisador | normal | perguntas | quando precisar |
| Projeto de engenharia | Engenheiro | projeto | checklist + ver funcionando + metacognição | não |
| Problema da casa | Inventor | pequena | perguntas | domingo |

- **Teste do Miner Missions paga pela qualidade da sessão, nunca por erro encontrado.** "Não achei nenhum erro" é uma entrega válida. Os critérios falam de testar pelo tempo combinado, anotar o que testou e descrever como repetir, não de quantos erros achou.
- **Problema da casa aprovado** ganha o botão "Transformar em encomenda de execução", já preenchido. É o caminho para o título de Inventor.

## 14. Torre e Diário

**Torre:** 8 conquistas, pelo caminho que já existe (catálogo, `statSources.ts`, `bumpVillage`), cada uma marcando algo memorável.

| Conquista | Quando | Estatística |
|---|---|---|
| Primeira entrega | primeira encomenda aprovada | `assignmentsApproved` |
| Entrega corrigida | encomenda aprovada depois de um ajuste | `assignmentsFixed` |
| Primeiro circuito | treino 7 aprovado | `trainingsDone` (com id) |
| Primeiro erro encontrado | treino 12 aprovado ou projeto com correção | `bugsFixed` |
| Primeiro projeto | projeto de engenharia aprovado | `projectsDone` |
| Técnico da Vila | promoção | `careerRank` |
| Engenheiro da Vila | promoção | `careerRank` |
| Inventor da Vila | promoção | `careerRank` |

Recompensa em XP, material e raro, como as outras. Gold só se a categoria for vida real, dentro do teto de conquistas.

**Diário.** Ainda não existe (AP5). Os projetos aprovados guardam `plan`, `whatWentWrong` e `whatChanged`. Quando o Diário for feito, ele cria a entrada "Hoje terminei meu projeto..." a partir deles. Nesta versão não há tela nova para isso.

## 15. Recebe de e entrega para (universo conectado)

| Módulo | Recebe de | Entrega para |
|---|---|---|
| Quadro de Encomendas (Casa) | pai (modelos, recorrência); Placa (aviso) | gold (livro-razão `assignment`), XP, material; Torre (conquistas); Carreira (competências); Cofrinho e prêmios (destino do gold) |
| Laboratório (Carreira) | treinos e encomendas de engenharia aprovados | título (nível da obra), ferramentas (Método), conquistas, redstone (Ferraria, Vagoneta) |
| Painel "Ganhos da semana" | livro-razão | decisão do pai (preços, teto) |

## 16. Pacotes e aceite

A ordem é 15a e depois 15b, os dois depois dos Pacotes 11 e 12.

### 15a — Encomendas

- **Motor:**
  - tipos (`assignment.ts`, `proof.ts`);
  - puros: `nextStatus`, `effectiveStatus`, `assignmentReward`, `bandFor(D)`, `weeklyCapLeft`, `incomeBucket`;
  - serviço: criar, aceitar, entregar, desistir, aprovar, pedir ajuste, cancelar;
  - `assignmentBoards`.
- **Regras:** Firestore e Storage (`proofs/`).
- **Servidor:** Cloud Function agendada e callable de recorrência.
- **Tela da criança:**
  - aba Encomendas da Casa: quadro, detalhe, em andamento, entrega (`ProofSheet`), ajuste e aprovada;
  - avisos na Placa.
- **Painel:** aba Encomendas (conferir, criar com os seis modelos, recorrentes, "Como ele trabalha") e item no Hoje.
- **Economia:**
  - fonte `assignment`, `ClaimKind 'assignment'`;
  - rótulos em Balança, Extrato e GoldHistory;
  - cartão "Ganhos da semana";
  - `settings/economy` com os campos novos;
  - `econ-sim.mjs` atualizado.
- **Testes puros:**
  - transições permitidas e proibidas;
  - `effectiveStatus` com prazo;
  - treino nunca paga gold, mesmo com gold no documento;
  - encomenda paga o valor gravado;
  - teto semanal e `overCap`;
  - limite de ativas: 3, com projeto 1;
  - id da recorrência igual gera uma vez só;
  - `incomeBucket` com todas as fontes;
  - a aprovação feita duas vezes num armazenamento falso paga uma vez;
  - ajuste e nova entrega pagam uma vez.
- **Fotos** em 1280×720, 1920×1080 e 390×844 (celular), na conta de teste:
  1. quadro com encomendas;
  2. detalhe antes de aceitar;
  3. em andamento;
  4. entrega;
  5. ajuste pedido;
  6. aprovada;
  7. painel: para conferir;
  8. painel: criar com modelo;
  9. painel: aprovação com aviso de teto;
  10. Balança com "Ganhos da semana".
- **Aceite ponta a ponta na conta de teste**, com cada passo e o saldo antes e depois no relatório:
  1. o pai cria "Arrumar a caixa de cabos" (normal, 6 gold);
  2. a criança aceita e entrega;
  3. o pai pede ajuste;
  4. a criança entrega de novo;
  5. o pai aprova duas vezes seguidas;
  6. resultado: uma linha `assignment_<id>` e o saldo sobe 6.

### 15b — Engenheiro da Vila

- **Carreira:**
  - `careers.ts` genérico e o Engenheiro;
  - `careers/{uid}`;
  - puros `applyApproval`, `nextRank`, `competencyLevel`;
  - "Começar a carreira" no painel;
  - a transação de aprovação libera os treinos seguintes.
- **Laboratório no lote `reserva`:**
  - arte n1 do líder, conferida antes;
  - tela da carreira, com treinos, projetos e ferramentas;
  - tela do treino, com passos, "Funciona quando", pistas em degraus, "Mostrar ao pai" e faixa FAÇA COM UM ADULTO;
  - Método do Engenheiro, liberado no treino 7;
  - metacognição leve nos projetos.
- **Torre:** as 8 conquistas, com `statSources`.
- **Testes:**
  - competência vai de "não explorou" a Praticando e a Já domina, com evidências diferentes;
  - requisitos de cada título, nos dois lados;
  - projeto com correção conta para Engenheiro;
  - a promoção só acontece na aprovação;
  - o treino libera o seguinte;
  - o treino nunca paga gold.
- **Fotos** nas três resoluções:
  - tela Engenheiro da Vila;
  - treino com pistas;
  - Método do Engenheiro;
  - promoção a Técnico (conta de teste com o progresso preparado pelo script de teste).

Os dois pacotes terminam com a barra de sempre (`tsc`, `eslint`, testes, `vite build`), `docs/CONTRATOS_E_CARREIRAS_API.md` com todas as exportações, e a "conferência de conexões" do roadmap.

**Fora da primeira versão:**
- outras carreiras;
- aviso no celular do pai quando ele entrega;
- conferência por IA da prova;
- Diário;
- webcam;
- levar todos os pagamentos para Cloud Functions (brecha F03).

## 17. Decisões do pai

1. **Nome.** Recomendo "**Encomendas**": "Contrato" já é a palavra da Mina, com botões iguais ("Aceitar contrato", "Entregar contrato"), e a criança vê as duas coisas no mesmo dia. A alternativa é manter "Contratos" aqui e renomear os da Mina, por exemplo para "Trabalhos da Mina", o que mexe em telas que ele já usa.
2. **Laboratório no lote livre.** Recomendo: a carreira ganha um lugar na Vila, e o lote que hoje diz "espera outra obra" passa a ter função. A obra nasce quando você começar a carreira, com o kit já nas mãos dele. A arte é minha e passa pela sua prancha.
