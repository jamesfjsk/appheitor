# Correções das três frentes (30/09/2026)

As três frentes já foram juntadas no `main`. Cada correção volta para a **pasta e o branch da sua frente**, com as mesmas regras de `PROMPT_CURSOR_2026-09-29_TRES_FRENTES.md`:
- só os seus arquivos;
- o relatório vai no seu arquivo em `docs/etapas/relatorios/`, numa seção nova "Correções de 30/09";
- barra completa no fim;
- commit no seu branch e pare.

O líder junta de novo.

As revisões completas estão em `docs/etapas/REVISAO_ETAPA_2_LANCAMENTO.md`, seção "Três frentes — revisão de 30/09".

## P16-C — a conversa do Sábio

1. **(alta) O fechamento sempre traz a pergunta para levar.** Hoje o `parseSageClosing` corta a `takeHome` palavra por palavra até o total caber em 45 e depois a zera. Nas três conversas reais, nenhuma pergunta para levar sobreviveu.
   - Cada parte tem o seu teto, e sai o teto do total:
     - `restate`: até 25 palavras, sempre começando por "Você disse que…", na terceira pessoa. Nunca "Para mim…" na voz do Sábio;
     - `concept`: até 15 palavras;
     - `takeHome`: até 20 palavras, com um "?".
   - `takeHome` vazia, sem "?" ou longa demais é trocada por uma do banco, pela ideia da conversa. Nunca cortada no meio.
   - O prompt pede os três tamanhos.
   - Teste: o fecho real do Pequeno Príncipe, com uma pergunta de 14 palavras, mantém a pergunta.
2. **(média) Sem cópia do banco.**
   - O prompt da pergunta grande recebe só os **nomes** das ideias (família, justiça, sorte e mérito…), sem as perguntas do §2.
   - Exemplos de forma, só do §5, e de outro livro.
   - O validador recusa pergunta muito parecida com uma do banco (§2 ou §5), com a mesma medida de semelhança do projeto, e pede outra uma vez.
   - Teste com a pergunta real da Matilda de 29/09.
3. **(média) O validador pega pergunta de fato no meio da frase:**
   - "qual", "quem", "quando", "onde", "quantos" ou "como se chama" logo depois de vírgula ou dois-pontos ("Na competição, qual foi…");
   - exige exatamente um "?";
   - recusa elogio também na pergunta ("muito bem", "parabéns", "que inteligente").
   - Testes com as frases da revisão.
4. **(média) "Devolver" no painel.** O relato que foi ao pai (`needsParent`) hoje só tem "Aprovar e pagar", e o livro fica trancado.
   - Botão "Devolver com uma frase": grava a decisão (`parentDecision: 'returned'`) e a frase do pai, sem tocar em `claimed`.
   - A Estante destranca o livro e mostra "Seu pai leu e disse: …".
   - Teste do estado.
5. **(baixas)**
   - Resposta fora do assunto ("sei lá", sem palavra de conteúdo) ganha a volta gentil, uma vez.
   - "Falar" para a voz do Sábio antes de ligar o microfone.
   - Fecho que falha usa o fecho local completo (ideia dele, conceito e pergunta do banco). Nada de "Responde de novo".
   - XP e `doneAt` na mesma transação.
   - Painel:
     - "Pergunta de fato" só quando houve;
     - "Deixou para conversar depois" aparece;
     - "Terceira entrega" conta recusas, não tentativas.
   - O prompt usa os nomes do relato dele (edição brasileira: "Sra. Mel", não "Sra. Honey").
   - Sai o código morto (`BOOK_ATTEMPTS_PER_DAY`, `verifyBookAnswer`, `factFlag`), se nada mais usar.
6. **Aceite:**
   - três conversas reais de novo, na conta de teste, coladas inteiras, cada uma com a pergunta para levar;
   - fotos 1280×720 de verdade, não recorte da 1920: pergunta, fecho, lombada e painel com "Devolver".

## P15a-C — Encomendas

1. **(média) A Placa não entope.**
   - Os avisos `asg_*` ganham `until`:
     - `_new` vale até o `dueOn`, ou 3 dias, se não houver prazo;
     - `_ok` e `_fix` valem 2 dias.
   - Aceitar a encomenda e "Ver na Casa" dão ciência ao aviso.
   - Teste com a Placa cheia: os recados do pai continuam aparecendo.
2. **(média) Ajuste pedido renova o prazo.**
   - `requestChanges` grava um prazo novo (`dueOn` e `dueAt`) quando o atual já passou ou vence hoje. O pai escolhe; o padrão é amanhã.
   - A nova entrega passa pela regra `request.time < dueAt`.
   - Teste puro do prazo novo.
3. **(média) O pai retira e muda prazo antes da entrega.**
   - No painel, uma lista "No quadro" (disponível, aceita, ajuste pedido) com "Retirar" (`cancelled`) e "Mudar prazo".
   - O quadro de ativas da criança é atualizado junto.
4. **(média) Os testes exercitam o código real.**
   - O plano da aprovação vira função pura (`approvalPlan`: recompensa, novo saldo, linha, claim, material, quadro), usada **dentro** da transação.
   - Sai a cópia em `settle.ts`.
   - Testes de: aprovação dupla, treino com gold no documento e poda do quadro.
5. **(média) As faixas usam o R7 do dia** (`referenceIncome`), e não o 23 fixo, que fica só de reserva.
   - O projeto passa pelo aviso de teto pela regra "até 1 D por semana de prazo".
   - A soma da semana (`usedShort`) sai para um puro, com teste.
6. **(baixas)**
   - `outcome` zerado no começo do callback da transação.
   - Sai "Aprovar outra vez" do painel.
   - A instância da recorrência usa `ref.create()`, no servidor e no aparelho. A callable só aceita a data de hoje, em São Paulo.
   - Sem `englishBase`, o material segue o padrão do projeto (`initialBaseDoc`), sem campo literal com ponto.
   - Recorrente salva num dia fora da lista não cria uma avulsa hoje.
   - Criar com "perguntas" exige pelo menos uma pergunta.
   - "Gerar hoje" cai no aparelho quando a callable falha por qualquer motivo.
   - A foto é comprimida no aparelho (JPEG, até 1600 px, qualidade 0,8). Falha da foto não bloqueia aprovar.
   - `statSources.ts` só descreve o que já é gravado.
   - O detalhe mostra "Como mostrar" e o material antes de aceitar, e "Desistir" vira link discreto.
   - Cabeçalho da Casa em 390×844: pode editar `src/styles/miner.css`, só para isso.
7. **Aceite:**
   - o roteiro ponta a ponta de novo, com ajuste depois do prazo (a nova entrega passa) e a Placa com recado do pai mais duas encomendas;
   - as fotos que faltaram em 1920×1080 e 390×844.

## P12-C — trava de geração

O líder já corrigiu no `main` o `retry` do perfil e o tempo limite da leitura da versão. Faça o resto:

1. **(média) Recusa silenciosa na aba velha.** Quando a versão publicada for diferente da que roda:
   - peça o recarregamento na hora, respeitando o "ocupado";
   - com `quiz` nulo, a Biblioteca abre a mesa com "Tem versão nova do jogo. A página vai recarregar." e o botão "Recarregar agora".

   Nada de clique que não abre nada.
2. **`localhost` e `127.0.0.1` com build de produção** contam como dev na trava.
3. **Frase do painel:** "A prova espera a versão nova. Recarregue a página." E, em dev com outra conta, o motivo real.
4. **`d7` e `d30`** começam em hoje−6 e hoje−29.
5. **`wordCount`:** a contagem nova, sem pontuação, fica só na reflexão (`reflectionWordCount`). O validador das perguntas volta à contagem de antes. Teste: "12 + 8" dá 3 no validador.
6. **Testes com as frases reais do Firestore**: a reflexão de 29/09, a do xarope, colada inteira. A do chute torto vale como exemplo inventado, com a marca "inventada".
7. **`playText`** devolve `false` quando o áudio foi interrompido ou estourou o tempo, e `audioPlayed` segue isso.

