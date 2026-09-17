# Expedição do Explorador: a avaliação mensal do Miner Missions

Documento de desenho (fonte de verdade a partir de 17/09/2026). Pedido do pai: "o sistema precisa ter uma avaliação mensal, tipo uma prova, para termos um padrão de tudo dele e trazer os conteúdos de acordo com o que for analisado; bem completa; salvar os dados; perguntas coerentes que deem para analisar o grau de conhecimento, inteligência e raciocínio de uma criança de 10 anos; com algo científico para nos inspirar." Código na Etapa 3 (`docs/MINER_MISSIONS_ROADMAP.md`); a primeira expedição, a **Expedição de Boas-vindas**, roda entre 27/09 e 04/10/2026 como linha de base; depois, no último fim de semana de cada mês.

## 1. O que é, em uma frase

Uma vez por mês o Heitor faz uma expedição com seis blocos, em até três sessões curtas, e o jogo guarda cada resposta; o resultado vira o **padrão dele** (o que sabe, como raciocina, onde trava, quão bem se conhece), que passa a guiar a prova do dia, os contratos, as falas dos NPCs e a Estante de erros. Para ele é um mapa com estrelas; para o pai é um relatório; para o jogo é o perfil que decide o que ensinar.

## 2. O que não é

- Não é teste de QI nem diagnóstico. O WISC e outros instrumentos clínicos são aplicados por psicólogo, com material protegido e normas; o que tomamos deles é o **mapa de domínios**, não os itens nem a escala.
- Não dá nota nem ranking para a criança. Ele vê regiões com estrelas e o que desbloqueou; a comparação é com ele mesmo, mês a mês.
- Não tranca nada e não paga gold. Recompensa em XP, selo do mês e 1 raro.
- Não substitui a escola. É um termômetro para o jogo ensinar melhor e para o pai ter o que conversar.

## 3. Bases: de onde vêm as réguas e os itens

Cada base entra por um motivo e com um limite declarado. Referências no fim do documento.

| # | Base | O que dá para a expedição | Limite |
|---|---|---|---|
| 1 | **BNCC, 5º ano** (Base Nacional Comum Curricular, 2017) | a matriz do que uma criança de 10 anos deve saber e fazer, por componente; cada item de conteúdo aponta para um código de habilidade (ex.: `EF05MA07`, `EF05CI02`, `EF05GE08`) | é um currículo, não uma escala: diz o que ensinar, não quanto ele sabe |
| 2 | **SAEB / Prova Brasil, 5º ano** (Matrizes de Referência, Inep) | os **descritores** de Língua Portuguesa (D1 a D15) e de Matemática (D1 a D28) viram o esqueleto dos blocos 2 e 3; a **escala de proficiência** dá a régua "abaixo, básico, adequado, avançado" | a escala oficial usa Teoria de Resposta ao Item com itens calibrados; a nossa régua é a fração de descritores dominados por nível, uma aproximação honesta e não um ponto na escala SAEB |
| 3 | **Taxonomia de Bloom revisada** (Anderson e Krathwohl, 2001) | etiqueta de processo cognitivo em cada item (lembrar, entender, aplicar, analisar, avaliar, criar); o relatório mostra em que nível ele para em cada área | a etiqueta é atribuída por nós ao escrever o item; precisa de revisão |
| 4 | **Teoria CHC** (Cattell-Horn-Carroll; os índices do WISC-V) | o mapa dos domínios do Bloco 1: raciocínio fluido (Gf), compreensão verbal (Gc), memória de trabalho (Gwm), velocidade de processamento (Gs), visuoespacial (Gv) | inspiração de estrutura; nada de item, norma ou escore do WISC |
| 5 | **Piaget**, operatório concreto para formal (7 a 11 anos) | itens de conservação, classificação, seriação, reversibilidade e as primeiras hipóteses "se... então" | estágios são orientação, não medida |
| 6 | **PIRLS e TIMSS, 4º ano** (IEA) | o modelo dos itens de leitura (texto curto, quatro processos: localizar, inferir, integrar, avaliar) e de matemática e ciências (saber, aplicar, raciocinar) | usamos o formato, não os itens liberados |
| 7 | **Teoria de Resposta ao Item e teste adaptativo** | a ideia de subir e descer a dificuldade conforme as respostas para medir com menos itens e sem humilhar | fazemos uma escada de 3 níveis por descritor, não TRI de verdade |
| 8 | **Repetição espaçada** (Leitner; SM-2) | os erros da expedição viram cartas da Estante com revisita em 3, 10 e 30 dias | os intervalos são fixos; sem ajuste por facilidade nesta versão |
| 9 | **CASEL** (cinco competências socioemocionais) e **metacognição** (calibração de confiança) | cinco perguntas de autoavaliação no fim (não pontuam, descrevem) e, em cada item, "quão certo você está?" para medir se ele sabe o que sabe | autoavaliação de criança é ruidosa; serve para conversa, não para nota |

## 4. Estrutura da expedição

Seis blocos, cerca de 70 itens, em **até três sessões de 12 a 15 minutos**, em dias diferentes do mesmo fim de semana (pode pausar e continuar; o progresso fica salvo). Ordem fixa: 1 e 5 na primeira sessão (cabeça descansada), 2 e 3 na segunda, 4 e 6 na terceira.

| Bloco | Nome na tela | Itens | Fonte dos itens | Como escolhe |
|---|---|---|---|---|
| 1 | Caverna dos Enigmas (raciocínio) | 15 | **banco fixo autoral** `docs/avaliacao/bloco1-raciocinio.json` (45 itens: 5 domínios CHC e Piaget, 3 níveis, revisados pelo pai); nunca gerado por IA na hora | 3 por domínio; começa no nível 2 e sobe ou desce por domínio; itens já usados em meses anteriores não voltam enquanto houver inéditos |
| 2 | Biblioteca Perdida (leitura e língua) | 12 | descritores SAEB de Língua Portuguesa; a IA gera variações a partir do descritor e de um texto curto (80 a 120 palavras), guardadas em `assessmentBank` | 4 descritores por mês em rodízio, 3 itens cada (níveis 1 a 3) |
| 3 | Mina dos Números (matemática) | 12 | descritores SAEB de Matemática, com pelo menos 1 de estimativa e 1 problema do dia a dia com dinheiro ou tempo | 4 descritores por mês em rodízio pelos quatro temas (espaço e forma; grandezas e medidas; números e operações; tratamento da informação) |
| 4 | Mapa do Mundo (conhecimento) | 15 | habilidades BNCC de Ciências, Geografia e História do 5º ano, mais cidadania, saúde e dinheiro (o currículo da prova do dia, `src/config/quizCurriculum.ts`) | 5 categorias por mês em rodízio, 3 itens cada |
| 5 | Torre da Memória (memória, atenção e metacognição) | 8 + 5 | por código, sem IA: sequências diretas e inversas, tarefa de marcar símbolos (60 s, a única cronometrada visível), atenção a detalhe; ao final, 5 perguntas de autoavaliação (CASEL) | fixo |
| 6 | Túnel do Inglês | 8 | o nível dele na Mina (`englishBase.level`) e o vocabulário visto (`vocab`) | 4 palavras dominadas (`seen >= 3`) e 4 do nível seguinte |

Cada item guarda `{ block, domain, descriptor, bloom, difficulty 1..3, stimulus?, question, options, answer, chosen, correct, timeMs, confidence }`. `confidence` é a resposta a "quão certo você está?" em três botões (Certeza, Acho que sim, Chute), feita depois de cada item dos blocos 1 a 4.

**Escada de dificuldade** (item 7 da seção 3): cada descritor ou domínio começa no nível 2; acerto sobe para 3, erro desce para 1; o terceiro item fica no nível onde ele parou. O nível alcançado por descritor é o que vira a régua.

## 5. A régua e o cálculo

Por bloco e por domínio ou descritor, dois números:

- **Acerto** (0 a 100): itens certos sobre itens feitos.
- **Nível na régua** (1 a 4): 1 abaixo do esperado (não fecha o nível 1), 2 básico (fecha o nível 1, não o 2), 3 adequado (fecha o nível 2, o esperado para 10 anos), 4 avançado (fecha o nível 3). Os rótulos seguem a classificação usada pelo QEdu e pelo Todos pela Educação para a escala SAEB (insuficiente, básico, proficiente, avançado); o mapeamento por nível fechado é nosso.

Mais três leituras que não são nota:

- **Calibração**: cruzamento de confiança com acerto (certeza e acertou; certeza e errou; chute e acertou; chute e errou). "Certeza e errou" acima de 20% é o sinal mais útil para o pai: ele acha que sabe e não sabe.
- **Bloom**: até que processo ele acerta em cada área (só lembrar; até aplicar; até analisar).
- **Tempo**: mediana por bloco, comparada com os meses anteriores; nunca mostrada para a criança fora da tarefa de símbolos.

Pontos fortes e fracos: as 3 áreas de maior e de menor acerto com pelo menos 4 itens. **Recomendações** com peso: cada descritor no nível 1 ou 2 vira uma linha `{ descriptor, category, weight }` que a rotação da prova do dia lê (categoria fraca ganha prioridade e ângulo novo; forte ganha profundidade).

## 6. Dados

- `assessments/{uid}_{YYYY-MM}`: `{ userId, familyId, month, kind: 'welcome' | 'monthly', status: 'open' | 'done', sessions: [{ startedAt, endedAt, blocks }], items: Item[], scores: { byBlock, byDomain, byDescriptor }, levels: { byDescriptor }, calibration, bloom, timing, delta: { vsLastMonth, vsBaseline }, strengths[3], weaknesses[3], recommendations[], feedbackShown, rewardClaimed }`.
- `assessmentBank/{itemId}`: todo item já usado com a criança (blocos 2, 3, 4 e 6 gerados; bloco 1 e 5 por referência ao id fixo), com `descriptor`, `difficulty`, `usedIn: [month]`, `hash` (mesma função da Memória da Prova). Nunca repete entre meses; o pai audita e pode riscar.
- `learning/{uid}.profile.assessment`: o resumo do último mês (`levels`, `strengths`, `weaknesses`, `recommendations`, `calibration`, `month`) e a série `history: [{ month, byBlock }]`. É o campo que a rotação, os contratos e o Sábio leem.
- Regras: a criança cria e atualiza só o próprio `assessments` (campos de resposta), nunca `scores` (calculado por função pura no cliente e conferido no painel; na Etapa 6 vai para Cloud Function); `assessmentBank` só o pai e o sistema escrevem.
- Índices: `assessments` por `userId` e `month`; `assessmentBank` por `userId`, `descriptor`.

## 7. O que cada um vê

**O Heitor**: a Placa avisa "A Expedição do Explorador abre no sábado" desde a quarta; no dia, o Sábio convida ("Um mapa novo. Sem pressa e sem nota: é para eu te conhecer melhor."). Tela "Mapa do Explorador": seis regiões desenhadas, cada uma com estrelas (0 a 3, pelo nível da régua) e um selo por região explorada; barra "Sessão 1 de 3"; botão Pausar. Dentro do bloco: um item por vez, sem cronômetro visível (exceto a tarefa de símbolos), botões de confiança depois da resposta, sem dizer certo ou errado na hora (blocos 1 a 4) para não virar prova de ansiedade; o feedback vem no fim da sessão por região ("Na Caverna dos Enigmas você abriu 2 estrelas; os enigmas de série foram os seus"). Ao terminar as três sessões: XP (o valor de uma semana de prova, por `settings/economy`), o selo do mês na Torre e 1 raro; os erros vão para a Estante com explicação. Nunca gold; nada tranca se ele não fizer.

**O pai** (painel, aba Relatório, seção "Expedição"): por bloco e descritor, acerto, nível na régua e tendência mês a mês; calibração; Bloom; tempo; "3 coisas para fazer em casa" (frases prontas por descritor fraco, por exemplo "Peça para ele estimar o total da compra antes do caixa"); botão para riscar itens do `assessmentBank`; exportar em PDF na Etapa 5.

**O jogo**: `profile.assessment.recommendations` entra no `RotationProfile` da prova do dia (`weak` e `strong`), o Sábio ganha falas sobre a evolução ("Mês passado você abriu uma estrela a mais na Mina dos Números"), os contratos da Mina pesam o vocabulário do Bloco 6, e a Estante recebe os erros.

## 8. Calendário e operação

- **Expedição de Boas-vindas** (linha de base): sábado 27/09 a domingo 04/10 (duas semanas de janela por ser a primeira). Sem `delta`; define `baseline`.
- **Mensal**: abre no último sábado do mês e fecha no domingo seguinte; se não fizer, a janela fecha sem consequência e a Placa diz "A próxima expedição abre em 25/10".
- O pai pode abrir uma expedição extra pelo painel (por exemplo depois das férias); ela grava com `kind: 'extra'` e não entra na série mensal.
- Bancos: o Bloco 1 (45 itens) já existe e é revisado pelo pai antes do dia 27; os blocos 2, 3 e 4 são gerados na quarta anterior pela função `openai` a partir dos descritores do mês, guardados em `assessmentBank` e lidos pelo pai no painel (aprovação implícita se ele não riscar); os blocos 5 e 6 são por código.

## 9. Ficha pedagógica (os 8 pontos da Etapa 5B)

1. **O que ensina**: a se conhecer (metacognição: sei o que sei?), a sustentar atenção em sessões curtas, e dá ao jogo o padrão para ensinar melhor.
2. **Por que cabe aos 10 anos**: os itens vêm das réguas do 5º ano (BNCC e SAEB) e do que a literatura descreve para 8 a 12 anos; a escada de dificuldade evita frustração; sessões de 12 a 15 minutos respeitam a atenção da idade.
3. **Como mede**: item a item, com tempo e confiança; níveis por descritor; tendência mês a mês.
4. **Como adapta**: escada de 3 níveis por descritor dentro da expedição; recomendações com peso para o resto do jogo.
5. **Feedback**: por região no fim da sessão, positivo e concreto; erros com explicação na Estante, revisitados em 3, 10 e 30 dias.
6. **O pai vê**: relatório por descritor, calibração, "3 coisas para fazer em casa"; aprova e risca itens.
7. **IA**: só gera variações a partir de descritor e nível, com o texto de apoio; nunca gera o Bloco 1 nem o 5; tudo fica guardado para auditoria.
8. **Economia**: XP, selo e 1 raro; nunca gold; nunca tranca.

## 10. Riscos e como tratar

- **Virar prova de ansiedade**: sem certo ou errado na hora, sem cronômetro visível, sem nota, pode pausar; o Sábio apresenta como mapa.
- **Ele chutar para acabar logo**: a confiança "Chute" é aceita sem punição e conta para a calibração; sessões curtas; recompensa só ao fim das três sessões.
- **Item ruim**: todo item gerado passa pelo pai; itens com acerto 0% em dois meses seguidos são marcados para revisão.
- **Comparação injusta entre meses**: os blocos mudam de descritor em rodízio; a comparação mês a mês é por bloco e por descritor repetido, e a linha de base é sempre mostrada junto.
- **Superinterpretação**: o relatório do pai abre com a frase "É um mapa para o jogo ensinar melhor, não um laudo".

## 11. O que a Etapa 3 precisa construir

Módulos puros com testes: `src/services/assessment/plan.ts` (monta a expedição do mês: rodízio de descritores, escolha no Bloco 1 sem repetir, escada), `score.ts` (acerto, níveis, calibração, Bloom, tempo, delta, recomendações), `descriptors.ts` (as listas SAEB e BNCC com código, texto e categoria do currículo). Serviço `assessmentService.ts` (criar, salvar respostas, fechar, gravar `learning.profile.assessment`). Telas: `Expedicao.tsx` (mapa, sessão, item, confiança, feedback), entrada pela Biblioteca e pela Placa. Painel: seção na aba Relatório e a auditoria do `assessmentBank`. Regras e índices. Prompt de geração dos blocos 2, 3 e 4 por descritor. Arte: mapa com seis regiões e seis selos (PixelLab, `docs/arte/manifesto.json`).

## Referências

- Brasil, Ministério da Educação. *Base Nacional Comum Curricular* (2017): habilidades do 5º ano em Língua Portuguesa, Matemática, Ciências, Geografia, História.
- Inep. *Matrizes de Referência do SAEB*, Língua Portuguesa e Matemática, 5º ano do Ensino Fundamental (descritores D1 a D15 e D1 a D28); *Escalas de proficiência do SAEB*.
- Anderson, L. W.; Krathwohl, D. R. (orgs.). *A Taxonomy for Learning, Teaching, and Assessing: A Revision of Bloom's Taxonomy of Educational Objectives* (2001).
- Schneider, W. J.; McGrew, K. S. "The Cattell-Horn-Carroll theory of cognitive abilities", em *Contemporary Intellectual Assessment* (2018); Wechsler, D. *WISC-V* (2014), estrutura de índices.
- Piaget, J.; Inhelder, B. *A psicologia da criança* (1966).
- IEA. *PIRLS 2021 Assessment Frameworks*; *TIMSS 2023 Assessment Frameworks*.
- Lord, F. M. *Applications of Item Response Theory to Practical Testing Problems* (1980); Wainer, H. (org.). *Computerized Adaptive Testing: A Primer* (2000).
- Leitner, S. *So lernt man lernen* (1972); Wozniak, P. Algoritmo SM-2 (SuperMemo, 1987); Cepeda, N. J. et al. "Distributed practice in verbal recall tasks" (2006).
- CASEL. *Framework for Systemic Social and Emotional Learning* (2020); Dunlosky, J.; Metcalfe, J. *Metacognition* (2009), sobre calibração de confiança.
