# Prompt para o Cursor — 28/09/2026 (16: a conversa do Sábio sobre o livro)

Você é o Cursor do Miner Missions. Antes de qualquer linha, leia:
- `.cursor/rules/lei-excelencia-aaa.mdc`;
- `docs/LEITURA_LIVROS.md`, inteiro, principalmente a seção nova "Conversa do Sábio e ajustes de 28/09", que é a especificação;
- `docs/conteudo/SABIO_CONVERSA_LIVROS.md`: a régua das perguntas. Copie as regras e o banco; não reescreva.

**Ordem:** este pacote vem antes do 15a (Encomendas).

**Método:**
- Barra: `npx tsc --noEmit -p tsconfig.app.json` com 0 erros; `npx eslint src --max-warnings 8` com 0 erros; `npm run test:english` e `npm run test:village` verdes; `npx vite build`.
- Evidência só na conta de teste (`teste@flash.com`). Nunca abra o localhost com a conta do Heitor.
- Fotos em 1280×720 e 1920×1080.
- Relatório no fim de `docs/etapas/RELATORIO_ETAPA_3.md`.
- **Pare antes do commit.** O líder revisa antes, porque o push publica para o Heitor.
- Sem restilizar. Não toque em `cart.ts`, `CartBench.tsx` e `src/game/**`.
- **O `bookPayBlock` e a aprovação do pai já foram corrigidos pelo líder em 28/09** (`books.ts`, `bookService.ts`). Não mexa neles.

## Pacote 16 — a conversa do Sábio sobre o livro

1. **Ajustes no contar** (`src/services/village/books.ts`, `EstanteDoSabio.tsx`), pelos cinco itens da seção:
   - a opinião sai do `faltou`;
   - `leu >= 2` aceita sempre;
   - a pergunta de fato deixa de decidir;
   - no máximo duas recusas, e a terceira entrega vai para o pai;
   - o que faltou vem com um ponto do livro.

   Testes do `verdictOf`.
2. **A conversa:**
   - puros `checkSageQuestion`, `parseSageQuestion`, `parseSageFollow` e `parseSageClosing`, mais o banco local, em `src/services/village/bookTalk.ts`, com testes;
   - três chamadas `gpt-4o` em `bookService.ts`;
   - `bookReports.talk`. A regra já foi escrita pelo líder em 29/09: a criança grava só `talk` e `updatedAt`, em relato aceito. Não mexa em `firestore.rules`.
3. **Na Estante:**
   - a tela da conversa, com a voz da prova;
   - "Conversar depois", com a lombada "O Sábio quer conversar";
   - "Falar" só com Web Speech API e microfone;
   - 10 XP e `bookTalks` no fim (com a linha em `statSources.ts`).
4. **Painel** (`BooksPanel.tsx`): a conversa, a "pergunta para o jantar" com "copiar" e a linha de relato marcado.
5. **Aceite:** o da seção, com três conversas reais na conta de teste, uma por livro da estante do Heitor, coladas inteiras no relatório.
