# A Base: especificação da Etapa 1 (jogável), versão 2

Versão 2 incorpora a revisão adversarial de 14/09/2026 (três lentes: criança, pedagogia, engenharia). Decisões do pai: conceito "A Base" (ARENA_INGLES_REDESIGN.md); sem duelo; Heitor joga mais no PC (teclado desde o início); plano Blaze ativo. Interface em português do Brasil, sem emojis. O pai não escreve conteúdo: a IA gera, o pai vê, regenera ou ajusta.

## 1. O jogo em uma sessão (12 minutos)

1. **Mapa da Base**: 6 construções (Fornalha, Baú, Cerca, Torre, Mesa de Encantamento, Campinho), níveis 0 a 3, custo em materiais (madeira, pedra, ferro, redstone). Começa com a Fornalha "pela metade" (falta 1 pedra + 1 madeira). Torre, Mesa e Campinho aparecem só quando Fornalha e Baú chegam ao nível 1. Todo nível de construção exige pelo menos 1 ferro (ferro só vem do Recado). Fileira de tochas = dias seguidos jogados (só sobe, nunca apaga).
   Efeitos já na Etapa 1: **Fornalha n1** = +1 material no primeiro contrato do dia; **Mesa n1** = ele escolhe o tema de amanhã (`themeRequest`, entra no prompt); demais efeitos na Etapa 2. Construir toca som e sobe em 3 quadros; +XP fixo por nível (10/15/20).
2. **Quadro de Contratos** do dia: 5 contratos gerados por IA. **Recado é obrigatório e sempre premiado**; ele escolhe mais 2 entre os outros 4 (Comerciante, Carta, Ferraria e um 5º que alterna por dia entre um segundo Comerciante e uma segunda Carta com outro tema). Chips: "+XP +gold" nos premiados, "só material" nos demais. Materiais: Comerciante = madeira, Carta = pedra, Recado = ferro, Ferraria = redstone.
3. Contrato concluído: materiais (o material "voa" para o inventário, com som de `mine/sfx.ts`), XP/gold se premiado, correção sempre visível. Resultado com 0 material não consome vaga premiada, paga 5 XP de tentativa, e Comerciante/Carta podem ser refeitos uma vez no mesmo dia só por material.
4. Fora da Etapa 1: Golem (fala), Turno na Mina, Diário, futebol, Selo automático (nível é manual no painel), repetição espaçada completa (só a revisão mínima do item 4.6).

## 2. Níveis (`src/config/englishLevels.ts`, cartão fixo em código)

| Nível | Gramática | Frase | Carta | Recado |
|---|---|---|---|---|
| 1 | to be (am/is/are), have/has, a/an/the, and/but, I/you/we + like/want/need/have + substantivo, imperativos (put/give/take/open/close), there is/are, in/on/under/next to, plural regular, números 1-20, cores, my/your, perguntas com is/are/do you | até 7 palavras, presente | 40-60 palavras; 3 perguntas (1 decisão + 2 compreensão) | 2 frases; 3ª informação = "para quem/onde" (for the dog, in the cave) |
| 2 | can/can't, like/love + -ing, presente simples 3ª pessoa (-s), don't/doesn't, some/any, how many, this/that/these/those, because, want to/need to | até 9 palavras | 60-90 palavras; 3 perguntas | 2-3 frases, banco sem molde |
| 3 | presente contínuo, must, was/were, advérbios de frequência, for + -ing, to + verbo (finalidade), comparativos simples | até 11 palavras | 80-120 palavras; 3 perguntas (1 de inferência) | 3 frases livres com dica de estrutura |

Cada nível: `grammar: string[]`, `forbiddenTokens: string[]` (formas proibidas: no nível 1, was/were/did/going + passados irregulares comuns + "-ing" fora de "like/love + -ing"; a checagem de "-ing"/"-ed" é por lista de lemas de verbos, nunca por sufixo solto), `maxWords`, `letterWords: [min,max]`, `glossarySize: [min,max]` (4-6 / 6-8 / 8-10), `noteSentences`, `noteTemplates: string[]` (4 ou mais moldes rotativos ligados à gramática, ex.: "I need ___ and ___.", "I have ___ . It is for ___.", "There is ___ in the ___.", "Please give me ___ for ___."), `vocabThemes`. Nível atual em `englishBase.level` (1 por padrão; o pai muda no painel e planos futuros sem contrato concluído são regenerados). A tela do Heitor não mostra "nível 1"; mostra "Base nível N" (soma dos níveis das construções).

## 3. Modelo de dados

Arquivo `src/types/english.ts` (novo). `EnglishGameId` em `src/types/index.ts` **não muda**; para `englishSessions` existe `export type EnglishSessionGame = EnglishGameId | ContractType`.

```ts
export type Material = 'madeira' | 'pedra' | 'ferro' | 'redstone';
export type ContractType = 'merchant' | 'letter' | 'note' | 'forge';
export type BuildingId = 'fornalha' | 'bau' | 'cerca' | 'torre' | 'mesa' | 'campinho';
export type Relation = 'on' | 'in' | 'under' | 'next_to';

export interface MerchantSpot { id: string; label: string; image: string; relations: Relation[] }
export interface MerchantItem { id: string; label: string; plural: string; image: string }
export interface MerchantStep { item: string; qty: 1 | 2 | 3; relation: Relation; spot: string }
export interface MerchantContent {
  spots: MerchantSpot[];            // 4-6 lugares, sorteados por código de MERCHANT_SPOTS (relações permitidas por lugar)
  items: { id: string; stock: number }[];   // itens da bandeja com quantidade (um item a mais que os passos, como distrator)
  steps: MerchantStep[];            // 2 (n1) a 4 (n3) passos, gerados por CÓDIGO; item nunca repete; spot pode repetir só no n3
  sentences: string[];              // uma frase por passo escrita pela IA ("Put two apples on the table.", "Can you put the torch next to the door?")
  gapped: string[];                 // a mesma frase com item e lugar substituídos por ___ (gerado por código a partir de sentences)
  translation: string[];
}

export interface LetterQuestion {
  kind: 'decision' | 'comprehension' | 'inference';
  question: string;                 // inglês, dentro de maxWords e da gramática do nível
  options: string[];                // 4, inglês, mesma forma gramatical; embaralhadas em código
  answer: number;
  evidence: string;                 // trecho literal do texto que justifica (validado como substring); destacado ao errar
  explanation: string;              // português, 1 linha
}
export interface LetterContent {
  genre: 'letter' | 'scout_report' | 'dialogue' | 'notice' | 'list';   // sorteio por semente sem repetir os 2 últimos; notice 25-45 e list 30-50 palavras
  title: string; sender: string; text: string;
  glossary: { en: string; pt: string }[];   // só palavras fora do vocabulário conhecido, presentes no texto
  questions: LetterQuestion[];      // 3
  translation: string;
}

export interface NoteInfo { pt: string; en: string[] }   // pt = como a dica descreve a informação; en = variantes aceitas
export interface NoteContent {
  brief: string;                    // português
  mustInclude: NoteInfo[];          // 3
  templates: string[];              // moldes possíveis do nível (a tela mostra um, conforme scaffoldStage)
  wordBank: string[];               // 10-14 palavras em forma base (sem números, sem plural), inclui as necessárias e 3 distratoras
  model: string;                    // resposta-modelo (escondida; vai ao juiz e ao painel)
  hint: string;                     // dica de estrutura em PT (nível 3); '' nos outros
}

export type ForgeItem =
  | { kind: 'scramble'; words: string[]; answer: string; rule: string; audio?: string }   // alvos de ORDEM; words em minúsculas, embaralhadas em código (nunca igual à resposta)
  | { kind: 'gap'; sentence: string; options: string[]; answer: number; rule: string }     // alvos de FORMA; 3 opções embaralhadas em código
  | { kind: 'typed'; prompt: string; sentence: string; accepted: string[]; rule: string };  // alvos de FORMA: digitar a forma (PC); prompt em PT
export interface ForgeContent { target: string; items: ForgeItem[] }   // 6 itens; 2 deles reaproveitam erros de ontem quando existem

export interface ContractBase { id: string; type: ContractType; material: Material; theme: string; title: string; version: number; status: 'open' | 'done'; result: ContractResult | null; retryUsed: boolean }
export type Contract = ContractBase & (
  | { type: 'merchant'; content: MerchantContent }
  | { type: 'letter'; content: LetterContent }
  | { type: 'note'; content: NoteContent }
  | { type: 'forge'; content: ForgeContent });

export interface NoteError { wrong: string; fix: string; tag: 'plural' | 'article' | 'verb' | 'spelling' | 'word_order' | 'preposition' | 'other' }
export interface NoteJudgement { isEnglish: boolean; errors: NoteError[]; missing: string[]; corrected: string; note: string; score: 0 | 1 | 2 | 3 }  // score calculado em CÓDIGO (seção 4.5)

export interface ContractOutcome { score: number; max: number; materialEarned: 0 | 1 | 2 | 3; answer?: string; correction?: NoteJudgement; details?: Record<string, unknown> }  // details: listens, textShown, glossaryHovers, evidenceHits...
export interface ContractResult extends ContractOutcome { rewarded: boolean; xp: number; gold: number; durationSec: number; finishedAt: string /* ISO */ }

export interface DailyPlan {
  id: string; userId: string; date: string; level: number;
  status: 'generating' | 'ready';
  generatingAt: string | null;      // ISO; lease de 3 min
  order: string[];                  // ids na ordem do quadro
  contracts: Record<string, Contract>;   // atualizações por caminho contracts.c2.result
  rewardedIds: string[];            // preenchido na transação de conclusão
  generatedAt: string | null; source: 'ai' | 'offline' | 'mixed'; reviewedByParent: boolean;
  themeRequest: string | null;      // pedido feito ontem pela Mesa
}

export interface BaseDoc {
  userId: string; level: number;
  materials: Record<Material, number>;
  buildings: Record<BuildingId, number>;
  scaffoldStage: 0 | 1 | 2;         // 0 molde+banco; 1 só banco; 2 banco vira "Dica" paga (1 ferro)
  noteStreak3: number;              // notas 3 seguidas no Recado (retira o andaime)
  vocab: Record<string, { seen: number; lastDate: string }>;   // lemas vistos (glossário lido, itens do Comerciante, substantivos do Recado)
  contractsDone: number; daysPlayed: number; streakDays: number; lastPlayedDate: string;
  themeRequest: string | null;      // escolhido na Mesa para amanhã
  updatedAt: string;
}
```

Coleções: `englishPlans/{uid_date}`, `englishBase/{uid}`, `englishSessions` (existente; `game: EnglishSessionGame`, sem texto do Recado), `englishAudio/{hash}` `{ text, url, createdAt }`, `aiUsage/{yyyy-mm}` `{ calls, inputTokens, outputTokens, ttsChars, byModel: Record<string, number> }`. Parser `fromPlanDoc`/`fromBaseDoc` no serviço (datas como string ISO, nunca `undefined`: passar por `omitUndefined` e gravar `null`).

Regras (`firestore.rules`): `englishPlans` e `englishBase` copiam os blocos existentes (`get` com `resource == null`, `list` por `userId`, create/update por `request.resource.data.userId == request.auth.uid` ou admin, delete admin); `englishAudio` e `aiUsage`: `allow read, write: if signedIn()`.

Catálogo (`src/config/englishBase.ts`): construções com custo por nível (n1 = 3 materiais, n2 = 5, n3 = 8; sempre >= 1 ferro; misturando os 4 materiais), ícone (`/assets/english/ui/base/b_*.webp`, `b_terreno` no nível 0), descrição PT, efeito. `MERCHANT_SPOTS` (12, com `relations` por lugar: floor: on; wall: next_to; door/window/fence: next_to, under; chest/box/oven/barrel: in, on, next_to; table/bed/shelf/rug/bench: on, under, next_to) e `MERCHANT_ITEMS` (só objetos portáteis, nunca coincidem com spots: torch, sword, book, ball, apple, banana, orange, map, clock, bucket, bone, cake, key, lamp, boots, helmet, potion; imagens em `/assets/english/ui/`, `/assets/english/ui/base/i_*.webp` ou `/assets/english/images/`; todas existem). `src/config/englishRewards.ts`: tabelas da seção 6.

## 4. Conteúdo por IA

Módulos **puros** (sem import de Firebase nem de `import.meta.env`, testáveis em Node com esbuild): `src/services/english/merchantRoom.ts` (sorteio de sala/passos por semente, frases offline por código, `gapped`), `src/services/english/validators.ts` (um validador por tipo, com "conserta antes de rejeitar"), `src/services/english/prompts.ts` (system/user por tipo), `src/services/english/notePrecheck.ts` (normalização e checagem das informações), `src/services/english/scoring.ts` (nota do Recado, materiais por tipo, XP/gold), `src/services/english/shuffle.ts` (embaralhar com semente e remapear `answer`). `src/services/englishAi.ts` liga prompts + `callOpenAI` + validators + banco de reserva; `src/services/englishJudge.ts`, `src/services/englishTts.ts`, `src/services/englishBaseService.ts`, `src/services/aiUsage.ts` usam Firebase.

4.1 **Chamada**: `callOpenAI(system, user, maxTokens, opts?: AbortSignal | { signal?; model?; temperature?; withUsage?: true })` em `aiQuiz.ts`; com `withUsage` devolve `{ json, usage }` (os dois chamadores atuais continuam iguais). Modelo `gpt-4.1-mini`, temperatura 0,8, timeout 20 s por contrato. Uma chamada por contrato, as 5 em paralelo; falha de validação → 1 retentativa citando o token/regra reprovada; falha de novo → reserva. Entrada de todo prompt: cartão do nível (permitido e proibido), tema do dia (ou `themeRequest`), `vocab` conhecido ("reaproveite cerca de 60% destas palavras, no máximo 6 novas"), nomes/remetentes dos últimos 7 dias (evitar), semente do dia.

4.2 **Comerciante**: código sorteia spots, itens (com estoque), passos (`qty` 1-3 a partir do nível 1 para exercitar números e plural) e as frases de reserva ("Put two apples on the table."); a IA só reescreve as frases com variação (Put / Can you put / First... then / Please) e traduz. Validação: allowlist fechada (labels de spots e itens, plurais, ~60 palavras funcionais, números), cada frase contém item, quantidade (número por extenso) e lugar do passo e a preposição correta, tamanho <= maxWords + 3; frase reprovada é substituída pela de reserva (não derruba o contrato).

4.3 **Carta**: gênero por semente (não repete os 2 últimos), faixa de palavras por gênero, glossário só de palavras fora de `vocab`, 3 perguntas em inglês (nível 1: decisão com restrição no enunciado, ex.: "You have 3 emeralds and you need a fast player. Who do you hire?", + 2 de compreensão), `evidence` literal, `explanation` em PT. Validação: contagem de palavras; tokens proibidos do nível (lista, não sufixo); opções distintas, nenhuma substring de outra, a certa não é a mais longa; anti-cola: rejeitar pergunta cuja opção certa aparece literalmente no texto e nenhuma distratora aparece; `evidence` é substring do texto (senão a pergunta é descartada; mínimo 2 perguntas para aceitar, senão retentativa); glossário filtrado para o que está no texto (mínimo 4); opções embaralhadas em código com `answer` remapeado. Prompt da Ferraria do mesmo dia recebe nomes e itens da Carta (continuidade).

4.4 **Recado**: brief em PT com 3 informações (quantidade + item, para quem/onde, e uma terceira do nível), `mustInclude` como `{ pt, en[] }`, `wordBank` em forma base sem números, `templates` do nível, `model`. Validação: `model` contém as 3 informações (pela mesma pré-checagem) e respeita o nível; banco com 10-14 palavras.

4.5 **Juiz do Recado** (`englishJudge.ts`): (a) pré-checagem local: normalizar os dois lados (minúsculas, sem acentos e pontuação, números 1-20 por extenso → dígito, plural -s/-es removido, Levenshtein <= 1 por token) e aceitar a variante quando todos os tokens aparecem em ordem; **qualquer** informação faltando → "Faltou dizer: <pt>" com 1 tentativa livre; depois disso vai ao juiz de qualquer jeito. (b) IA recebe brief, `mustInclude`, `model`, molde usado, gramática do nível e o texto dele; devolve `isEnglish`, `errors[{wrong, fix, tag}]`, `missing`, `corrected` (edição MÍNIMA do texto dele; validação: distância em palavras entre texto e correção compatível com o número de erros, senão descarta a correção e usa só os erros), `note` (regra do erro principal, PT, 1 linha, nunca elogio). (c) nota em código: `!isEnglish` → 0; `missing` não vazio ou erro bloqueante (verbo ausente/errado, ordem que muda o sentido, palavra em português) → 1; 0 erros pequenos → 3; 1-2 pequenos (artigo, plural, grafia com até 2 letras, preposição) → 2; 3 ou mais → 1. Maiúscula e pontuação ignoradas; dígitos aceitos no nível 1 com `note` sugerindo a forma escrita. Andaime: `scaffoldStage` sobe a cada 2 notas 3 seguidas (0 → 1 → 2); no estágio 2 o banco vira botão "Dica" que custa 1 ferro.

4.6 **Ferraria**: alvo do dia = etiqueta mais frequente dos Recados dos últimos 5 planos (se >= 2 ocorrências), senão rotação sobre `grammar`; alvos de ordem → scramble, alvos de forma → gap/typed; 2 dos 6 itens reaproveitam itens errados de ontem com distratores novos. Validação: scramble com 4-8 palavras sem then/please/first/today/also, resposta comparada em minúsculas sem pontuação; gap com 3 opções distintas; typed com `accepted` não vazio; sem frase repetida. Erro na tela: mostra `rule`, dá 1 nova tentativa (vale metade), depois revela; item errado volta uma vez no fim (sem material). Blocos do scramble tocam o áudio da palavra ao clicar.

4.7 **TTS** (`englishTts.ts`): `audioUrlFor(text)`; chave = sha256(`gpt-4o-mini-tts|nova|0.95|texto normalizado`); `englishAudio/{hash}` → URL; senão `POST /v1/audio/speech` (mp3), `uploadBytes(ref, blob, { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' })` em `english/tts/{hash}.mp3` (`storage` exportado de `config/firebase.ts`), grava o índice. Tocar com `new Audio(url)` sem crossOrigin. Cache em memória; falha → `speakAsync` (existente). Áudio por frase (Comerciante toca `sentences[]` em sequência com botão por passo; Carta e Ferraria por frase). Pré-buscar o áudio do plano logo após gerar; botão "Ouvir" com estado "carregando a voz".

4.8 **Pré-geração e trava**: `ensureDailyPlan(uid, date)`: transação cria `{status:'generating', generatingAt}` só se o doc não existe ou o lease (3 min) venceu; gera os 5; grava `status:'ready'`. A tela abre o quadro com os contratos que já chegaram (progresso "3/5") e libera o primeiro pronto. Ao abrir o app: garante hoje e amanhã. Painel: "Gerar próximos 7 dias" (sequencial, só até hoje+7, nunca regenera plano com contrato concluído), "Regenerar" por contrato (só se `open`; incrementa `version`). Teto: recusa gerar quando `aiUsage` do mês passa de 800 chamadas (aviso no painel).

4.9 **Reserva** (`src/data/englishOfflineContracts.ts`): Comerciante por código (infinito); Carta, Recado e Ferraria: 6 por nível, escolhidos sem repetir em 14 dias; `source` marcado; painel destaca.

## 5. Telas da criança (`src/components/hero/english/base/`)

Props comuns dos contratos: `{ contract, level, base, onFinish(outcome: ContractOutcome), onQuit }`. A tela copia o contrato ao iniciar (não segue o snapshot até terminar).

- `EnglishBase.tsx`: container (painel de pedra, mesmo estilo do hub); estados: carregando plano (com progresso) → mapa → quadro → contrato → resultado. Garante plano de hoje e de amanhã ao abrir.
- `BaseMap.tsx`: grade 3x2 (lotes ocultos até desbloquear), inventário de materiais, tochas dos dias seguidos, "Quadro de contratos", "Construir" com custo; ao construir: transação, som, subida em 3 quadros, `playLevelUp`. Mesa n1: campo "O que você quer na história de amanhã?" (30 caracteres).
- `ContractBoard.tsx`: 5 cartões com tipo (ícone `c_*`), tema, material, chip premiado/só material, "Recado: obrigatório", resultado quando feito, "Refazer só por material" quando permitido.
- `ContractShell.tsx`: dono do cronômetro e do fluxo: instrução fixa em PT por tipo (visível nas 3 primeiras vezes do tipo, depois atrás de "?"), botão "Aceitar contrato", chama `completeContract`, aplica XP/gold (`adjustUserXP/adjustUserGold` + `createGoldTransaction(..., 'english_game', ...)`), mostra `ContractResult` com "Próximo contrato" e "Construir <X> agora" quando o custo fecha.
- `MerchantContract.tsx`: sala (grade de lugares com ícone/label), bandeja com estoque; botões numerados "Ouvir 1/2/3" por passo (sem texto); a partir da 2ª escuta de um passo, mostra `gapped` desse passo; clique item → clique lugar → menu com TODAS as relações válidas do lugar (2-3) e quantidade; "Entregar" avalia por estado final; com erro, texto completo + 1 nova entrega (teto 2 materiais). `details: { listens, textShown }`.
- `LetterContract.tsx`: texto sempre visível (PC: duas colunas), glossário por hover 400 ms / toque longo, 3 perguntas com feedback; ao errar, `evidence` destacada no texto; tradução completa no fim. `details: { glossaryHovers }`.
- `NoteContract.tsx`: brief em destaque; molde (estágio 0) como texto de referência acima do campo (não preenche sozinho); fichas do banco inserem a palavra no cursor (estágios 0-1) ou viram "Dica" (estágio 2); `textarea` com `spellCheck={false} autoCorrect="off" autoCapitalize="off"`; "Enviar" → pré-checagem → tentativa extra → juiz (spinner "O ferreiro está lendo..."); resultado: estrelas de ferro, texto dele e correção lado a lado com diff por palavra, `note`, etiquetas.
- `ForgeContract.tsx`: 6 itens; scramble com blocos clicáveis (desfazer), gap com 3 opções, typed com campo; erro → `rule` + 1 tentativa (metade) → revela; repescagem dos errados no fim.
- `ContractResult.tsx`: material, XP, gold, correção, próximos passos.
- `EnglishArenaCard.tsx`: mostra a Base (nível da base, materiais, tochas) e abre `EnglishBase`.
- Sons: `createMineSfx` para acerto/erro/material/construção; `playLevelUp` ao construir.

## 6. Recompensas (`src/config/englishRewards.ts`, `englishBaseService.ts`)

- Materiais: Comerciante 3 (todos os passos) / 2 (errou 1) / 1 (acertou >= 1) / 0; teto 2 se o texto completo foi mostrado. Carta (3 perguntas): 3/2/1/0 por acertos (decisão sem evidência certa vale meio). Recado: nota 0-3 = ferro. Ferraria (6 itens): >= 5 → 3; 3-4 → 2; senão 0 (+5 XP). Fornalha n1: +1 no primeiro contrato do dia (teto 3).
- XP/gold por material 1/2/3: Comerciante/Carta/Ferraria XP 8/12/16, gold 3/4/5; Recado XP 10/15/20, gold 4/6/8; todo contrato terminado paga ao menos 5 XP. Premiados: Recado sempre; mais os 2 primeiros outros contratos concluídos com material > 0 (`rewardedIds` decidido dentro da transação). Construção: XP 10/15/20 por nível.
- `completeContract(uid, planId, contractId, version, outcome)`: transação única: exige `status == 'ready'`, contrato `open`, `version` igual; grava `result`, `rewardedIds`, soma materiais, `vocab`, `scaffoldStage/noteStreak3`, `contractsDone`, `streakDays/lastPlayedDate`; cria `englishSessions`; devolve `{ xp, gold, rewarded }`. `redoContract` (Comerciante/Carta com 0, uma vez): volta a `open` com `retryUsed`. `buildUpgrade(uid, buildingId)`: valida custo, debita, sobe nível. `setThemeRequest`. `subscribePlan`, `subscribeBase`, `getRecentPlans(uid, days)` por id determinístico (sem índice).

## 7. Painel dos pais (`src/components/parent/EnglishBaseManager.tsx`, aba "Inglês", acima do `EnglishProgressPanel`)

Plano de hoje e amanhã (texto + tradução por contrato, `source` em destaque quando offline, status/resultado, "Regenerar" se aberto); "Gerar próximos 7 dias" com progresso; nível 1-3 (salvar regenera planos futuros sem contrato concluído); Recados dos últimos 30 planos com texto, correção e etiquetas; etiquetas mais frequentes; uso de IA do mês (chamadas, tokens, caracteres de TTS, estimativa em dólares com tabela fixa).

## 8. Arquivos

Novos: `src/types/english.ts`; `src/config/{englishLevels,englishBase,englishRewards}.ts`; `src/services/english/{merchantRoom,validators,prompts,notePrecheck,scoring,shuffle}.ts`; `src/services/{englishAi,englishJudge,englishTts,englishBaseService,aiUsage}.ts`; `src/data/englishOfflineContracts.ts`; `src/components/hero/english/base/{EnglishBase,BaseMap,ContractBoard,ContractShell,MerchantContract,LetterContract,NoteContract,ForgeContract,ContractResult}.tsx`; `src/components/parent/EnglishBaseManager.tsx`; testes em `src/services/english/__tests__/*.test.ts` rodados com esbuild + node (script `npm run test:english` em package.json: `node scripts/run-english-tests.mjs`); `scripts/generate-english-example.mjs` (gera um dia real com a chave lida do `.env` à mão e grava `docs/exemplos/plano-nivel1.json`).
Alterados: `src/config/firebase.ts` (exportar `storage`), `src/services/aiQuiz.ts` (`callOpenAI` com `opts`), `src/components/hero/english/EnglishArenaCard.tsx`, `src/components/parent/ParentPanel.tsx`, `firestore.rules`, `src/types/index.ts` (`EnglishSessionGame`), `package.json` (script de teste).
Ícones já gerados em `public/assets/english/ui/base/` (mat_*, b_*, c_*, s_*, i_*) e `public/assets/english/ui/` (torch, sword, map, clock, apple...).
Removidos do hub: Mine Rush, Block Memory, Creeper Quiz, Crafting Words (arquivos ficam; `EnglishArena.tsx` deixa de ser importado).

## 9. Ordem de construção e aceite

1. **Fundação** (um agente, sequencial): tipos, configs, módulos puros e seus testes; `docs/ARENA_INGLES_ETAPA1_API.md` com todas as exportações e assinaturas. Sem isso ninguém começa.
2. **Em paralelo** (arquivos disjuntos): serviços Firebase/IA; telas da criança; painel do pai; banco de reserva (validado pelos validadores).
3. **Integração**: tsc, eslint, build, testes, plano real gerado em `docs/exemplos/plano-nivel1.json`, fluxo completo no navegador (5 contratos, construção da Fornalha, painel), revisão adversarial.

Aceite: tsc/eslint/build limpos; testes passam (validadores aceitam a reserva e rejeitam casos ruins; pré-checagem com tabela de pares; nota em código; sala do Comerciante válida em 1000 sementes; embaralhamento nunca igual à resposta; tabelas de recompensa e custo); plano real de nível 1 legível pelo pai; no navegador um dia inteiro jogado.
