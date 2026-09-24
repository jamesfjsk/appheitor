# Prompt para o Cursor — 24/09/2026 (pacote 13: o app se atualiza sozinho; pacote 14a: a Ferraria sai do círculo; depois o 11 e o 12 de 23/09)

Você é o Cursor do Miner Missions. Antes de qualquer linha, leia:
- `.cursor/rules/lei-excelencia-aaa.mdc`;
- em `docs/etapas/REVISAO_ETAPA_2_LANCAMENTO.md`, a seção "24/09 — Uso real do Heitor de 18 a 24/09".

**Por que este pacote vem primeiro.** O PC do Heitor ficou com a aba aberta na versão de 22/09 à noite (`2026-09-22-2a0658f`) por quase dois dias. O pacote 10 publicado ontem às 18h44 não chegou até ele. Por isso, hoje, a prova 5 de 5 não pagou a esmeralda e o `quizBank` não gravou nada. Os dois erros do app desde 20/09 também vêm dessa aba velha ("Cannot read properties of undefined (reading 'default')"). Sem este pacote, toda entrega chega a ele dias depois.

**Método.** Um pacote por vez.
- Cada pacote fecha com: `npx tsc --noEmit -p tsconfig.app.json` com 0 erros; `npx eslint src --max-warnings 8` com 0 erros; `npm run test:english` e `npm run test:village` verdes.
- Evidência só na conta de teste (`teste@flash.com`). Nunca a conta do Heitor.
- Relatório no fim de `docs/etapas/RELATORIO_ETAPA_3.md`.
- **Pare para a revisão e o commit do pai depois de cada pacote.**
- Sem restilizar o painel. Geração de prova com IA só se o item pedir.

## Pacote 13 — o app se atualiza sozinho

1. **`version.json` no build.**
   - Em `vite.config.ts`, chame `appVersion()` uma vez só, guarde numa constante e use essa constante no `define` (`__APP_VERSION__`) e num plugin pequeno que, no `generateBundle`, emite `version.json` com `{ "version": "<a mesma string>" }`. Em DEV não existe arquivo.
   - Em `vercel.json`, um header `Cache-Control: no-store` para `/version.json`. Os arquivos estáticos têm precedência sobre o `rewrite` para o `index.html`: confira que `/version.json` é servido como JSON.
2. **Módulo puro `src/services/appUpdate.ts`**, sem Firebase e sem `import.meta.env`:
   - `shouldReload({ running, latest, moment, busy, lastReloadAt, now })` devolve `true` só quando **todas** estas condições valem:
     - `latest` é texto não vazio e diferente de `running`;
     - `running` não é `'dev'`;
     - `busy` é falso;
     - `moment` é `'visible'`, `'day'` ou `'idle'`;
     - passaram pelo menos 10 minutos desde `lastReloadAt` (trava contra laço).
   - `setAppBusy(key, on)` e `isAppBusy()`: um conjunto de chaves em memória. Qualquer tela que não pode ser interrompida marca a sua chave.
   - Teste com os casos:
     - mesma versão: não recarrega;
     - versão nova e aba voltou a ficar visível: recarrega;
     - versão nova com `busy`: não recarrega;
     - versão nova com o último recarregamento há 3 minutos: não recarrega;
     - `running` igual a `'dev'`: não recarrega;
     - `latest` vazio: não recarrega.
3. **Quem fica "ocupado":**
   - `DailyQuiz.tsx` enquanto a mesa está aberta nas fases de lição, perguntas ou reflexão (chave `quiz`);
   - os contratos da Mina e a Vagoneta enquanto abertos (chave `mine`);
   - a Estante do Sábio com texto no campo (chave `book`).

   Ao fechar, desmarca.
4. **Hook `src/hooks/useAppUpdate.ts`**, montado uma vez no `App`, só fora de DEV e fora do teaser:
   - busca `/version.json?t=<agora>` com `cache: 'no-store'` a cada 10 minutos, quando a aba volta a ficar visível (`visibilitychange`) e na virada do dia (`DAY_CHANGED_EVENT`);
   - se a versão publicada é outra, recarrega (`location.reload()`) no primeiro momento em que `shouldReload` deixar: a aba acabou de voltar a ficar visível (`visible`), virou o dia (`day`), ou passaram 5 minutos sem clique nem tecla (`idle`);
   - com `busy`, espera: quando a tela ocupada fecha e a aba está visível, tenta de novo;
   - o horário do último recarregamento fica em `sessionStorage`, sempre dentro de `try/catch`;
   - falha de rede não faz nada.
5. **Saúde e painel:**
   - ao abrir o app, `touchHealth(uid, 'appVersion', __APP_VERSION__)` (acrescente `'appVersion'` ao tipo `HealthField`);
   - no cartão "Saúde" do painel, uma linha "Versão no PC dele: <versão do health> · no ar: <versão de /version.json>", com o chip vermelho que o cartão já usa quando as duas forem diferentes. Sem restilizar.

**Aceite:**
- Teste puro de `shouldReload` verde, com os seis casos do item 2.
- Depois de `npx vite build`, `dist/version.json` existe e tem o mesmo valor do `__APP_VERSION__` do bundle. Cole no relatório as duas strings.
- Com `npx vite preview` e a conta de teste:
  1. abrir o app;
  2. trocar à mão o `dist/version.json` por outra versão;
  3. trocar de aba e voltar: a página recarrega;
  4. repetir com a prova aberta na fase de perguntas: não recarrega; ao fechar a mesa, recarrega.

  Log do console ou fotos no relatório.
- Foto do cartão "Saúde" com as duas versões.
- Não mexer em mais nada.

## Pacote 14a — a Ferraria sai do círculo (pedido do líder em 24/09)

**O defeito**, com os dados do Heitor: a Ferraria deu 0 de 6 em 21, 23 e 24/09, sempre com o alvo "Frases completas": seis frases de 6 a 8 palavras para montar, no nível 1, e hoje ele errou até a repescagem. O mecanismo:
- em `src/services/englishAi.ts` (perto da linha 581), `frequentTag(recent)` pega a etiqueta de erro mais comum dos Recados;
- a etiqueta `other` vira `FORGE_TAG_TARGETS.other` ("Frases completas", `kind: 'order'`);
- `forgeItemMixFor(level, 'order')` (`src/services/english/prompts.ts`, perto da linha 78) devolve `{ scramble: 6 }` **em qualquer nível**.

Ele erra, o erro volta amanhã igual, e erra de novo. Fracasso repetido sem degrau não ensina (`docs/APRENDER_A_APRENDER.md`); ele já está fugindo da Mina.

**Fazer:**
1. `forgeItemMixFor(level, 'order')` passa a respeitar o nível:
   - nível 1: `{ scramble: 2, gap: 4, typed: 0 }`;
   - nível 2: `{ scramble: 3, gap: 3, typed: 0 }`;
   - nível 3: `{ scramble: 4, gap: 1, typed: 1 }`.

   O `kind: 'form'` fica como está.
2. **Frase de montar curta:**
   - o validador da Ferraria (`src/services/english/validators.ts`) recusa `scramble` com mais de 5 peças no nível 1 e mais de 7 no nível 2, com um código novo `scramble_longo`;
   - o prompt da Ferraria diz o mesmo limite;
   - item recusado vai para a substituição que já existe.
3. **A etiqueta `other` não escolhe alvo.** Quando a mais frequente é `other`, o alvo do dia é o rodízio do nível (`lv.forgeTargets[dayIndex % n]`), como se não houvesse etiqueta. `word_order` continua valendo, com o mix do item 1.
4. **Degrau para baixo.** Se a Ferraria de ontem terminou com 0 ou 1 acerto, o alvo de hoje é obrigatoriamente um de `kind: 'form'` do rodízio do nível, nunca `order`. Função pura `forgeStepDown(yesterdayScore, yesterdayMax)` com teste.

**Aceite:**
- Testes puros de:
  - `forgeItemMixFor` nos três níveis;
  - `other` caindo no rodízio;
  - `forgeStepDown` (0 de 6 e 1 de 6 descem; 2 de 6 não);
  - o validador recusando `scramble` de 6 peças no nível 1 e aceitando o de 5.
- Uma geração real da Ferraria na conta de teste (uma chamada de IA, só essa), com um "ontem" de 0 de 6: o alvo é `form`. Cole o JSON das 6 peças no relatório.
- Nada muda no Recado, na Carta, no Comerciante nem na economia.

## Depois do 14a

1. **Pacote 11** de `docs/etapas/PROMPT_CURSOR_2026-09-23.md`. O texto de lá vale inteiro; a lista de códigos da escada já foi corrigida em 23/09.
2. **Pacote 12** do mesmo arquivo (ruído do `clientErrors` em `localhost`).

Os pacotes 10b (prova sempre com 8 e revisor mais exigente) e 14b (portão de leitura da Carta e revisor de conteúdo dos contratos) estão sendo escritos pelo líder e chegam num prompt próprio.
