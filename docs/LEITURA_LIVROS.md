# Estante do Sábio: contar um livro (pedido do pai em 22/09/2026)

## O que é

O Heitor termina um livro, vai até a Biblioteca e **conta o livro para o Sábio**: título, quanto tempo levou, se gostou, nota de 0 a 10 e um texto com as próprias palavras. O Sábio lê, diz se acreditou que ele leu e, se sim, paga **15 gold** e põe o livro na estante da Biblioteca. **Um pagamento por dia; cada livro paga uma vez só.** É o primeiro "comprovante" da decisão 24 (missões da vida real com prova de execução) e o único lugar do jogo em que gold nasce de leitura.

## Ficha pedagógica (regra do §12)

- **Aprende**: a recontar uma história com começo, meio e fim, com as próprias palavras; a dar opinião com motivo ("gostei porque…"); a escrever para alguém que não leu o livro.
- **Como**: molde na tela ("O livro conta a história de… No começo… Depois… No fim… O que eu mais gostei foi…"), contador de palavras, e a devolutiva do Sábio quando falta alguma parte ("Você não contou o fim. Como termina?").
- **Erro ensina**: recusa nunca vem com nota nem castigo; o Sábio diz **o que faltou** e o texto fica na tela para ele completar. Pode tentar de novo (até 3 vezes no dia, o mesmo livro).
- **Mede**: título, dias de leitura, gostou (4 faces), nota, texto, palavras, veredito do Sábio (0-3), o que faltou, sinal de suspeita, tentativas, data. Tudo em `bookReports` para o pai ler.
- **Progressão**: mínimo de 40 palavras nos primeiros 5 livros, 80 depois (o pai baixou de 80/120 em 22/09); o molde some depois do 5º livro aceito (Biblioteca n2 pode voltar a mostrar).
- **Nunca**: cobrar gold, humilhar, dizer "você copiou". Se o texto parece de adulto ou de IA, o Sábio pede para reescrever "como se estivesse contando para um amigo" e marca para o pai.

## Fluxo

1. Biblioteca (card da Mesa) → botão **"Contar um livro"** (44 px). **Só com a Biblioteca no nível 1 ou mais** (pai, 22/09: "faz sentido"; no nível 0 o botão fica cinza com "Construa a Biblioteca para contar livros"). Trancado também se a prova do dia não foi feita (mesmo portão da Mina) e se o resgate de hoje já foi pago ("Hoje o Sábio já ouviu um livro. Amanhã tem mais.").
2. Papiro do Sábio: **Título** (texto, 3-80 caracteres); **Quantos dias você levou?** (fichas: 1-2 · 3-7 · duas semanas · um mês ou mais); **Gostou?** (4 rostos: Não gostei · Gostei · Gostei muito · Amei); **Nota** (0-10, fichas); **Conta o livro** (textarea com contador "0 / 80 palavras", molde tocável).
3. "Entregar" → cena "O Sábio lê" (pacote 7, reaproveitada) → veredito:
   - **Aceito**: "+15 gold" com o carimbo, o livro aparece na estante (lombada com o título) e o Sábio comenta uma coisa do texto dele.
   - **Falta parte**: balão com o que faltou (começo, meio, fim, personagem, opinião com motivo); texto mantido; "Tentar de novo".
   - **Suspeito**: "Isso está muito arrumado. Me conta do seu jeito, como se fosse para um amigo." Texto mantido; marca `flag` para o pai. **Mudança de 23/09 (decisão 43; o Sábio é mentor, não fiscal):** a frase de suspeita sai da boca do Sábio; o pedido de reescrita vira um "Falta parte" que diz o que faltou (ex.: "Me conta com as suas palavras o que acontece no meio."), e a marca `flag` vai para o pai em silêncio. Entra num pacote pequeno, quando o pai pedir.
   - **Repetido**: "Esse você já me contou em 14/09." Sem pagamento, sem tentativa gasta.
4. Painel do pai (aba Prova, bloco "Livros"): lista dos relatos com texto, veredito, o que faltou, sinal de suspeita; botões **Aprovar** (paga se o Sábio recusou) e **Anular** (estorna). Sem restilizar.

## O juiz (Sábio)

`gpt-4o` (conhece os livros; ~US$ 0,01 por relato), temperatura 0,2, JSON. Entrada: título, idade (10), dias, texto. Saída:

```
{ "leu": 0..3, "motivo": "≤ 20 palavras", "faltou": ["fim" | "personagem" | "comeco" | "opiniao"],
  "suspeito": "nenhum" | "copiado" | "ia" | "fora_do_tema",
  "comentario": "uma frase do Sábio sobre algo específico que ele escreveu" }
```

Critérios do prompt: (a) o texto traz detalhes que só quem leu sabe (nomes, o que acontece, onde, como termina) — se o livro for conhecido, confira contra ele; se não for, confira coerência interna; resumo genérico que caberia em qualquer livro = 1; (b) tem começo, meio, fim e uma opinião com motivo; (c) escrita de criança de 10 anos: erros de ortografia e frases simples são **esperados** — texto sem erro nenhum, com vocabulário e pontuação de adulto ou estrutura de resenha, marca `ia`/`copiado`; cópia da sinopse da capa marca `copiado`; (d) `fora_do_tema` quando o texto não fala do livro do título. Aceita quando `leu >= 2` e `suspeito == "nenhum"`.

Local, antes do juiz (sem IA): 40/80 palavras mínimo, 600 máximo; título normalizado (minúsculas, sem acento, sem "o/a/os/as" inicial) igual ou a 2 letras de um já aceito = repetido; texto 80% igual a um relato de **outro** livro = repetido; no **mesmo** livro só o texto idêntico barra (completar o texto depois de "faltou" é o fluxo esperado); 5 palavras iguais seguidas = pede outra coisa.

## Dados e regras

- `bookReports/{uid}_{titleKey}_{n}`: `{ userId, familyId, title, titleKey, days, liked: 0..3, rating: 0..10, text, words, attempt, judge: {leu, motivo, faltou, suspeito, comentario, model}, accepted, paidGold, paidXp, flagged, parentDecision?: 'approved'|'voided', createdAt, date }`.
- Pagamento: transação com dois claims em `village.claimed` — `book:<titleKey>` (uma vez por livro) e `bookday:<data>` (uma por dia) — e linha em `goldTransactions` (`source: 'book_report'`, "Livro: <título>"). **15 gold + 40 XP**; não entra no teto de gold dos jogos (é vida real), entra no extrato como vida real.
- Estante: `village.books: [{ titleKey, title, on }]` para desenhar as lombadas na Biblioteca (até 12 visíveis; depois "e mais N").
- Regras Firestore: criança cria o próprio relato; só o pai muda `parentDecision`; `accepted`/`paid*` só pela transação.
- Stat `booksRead` em `statSources.ts`; conquistas "Primeiro livro" (bronze), "Cinco livros" (prata), "Doze livros" (ouro) na categoria Biblioteca, com gold de vida real (decisão 38).

## Seis ajustes do líder, aprovados pelo pai (22/09) — valem sobre o texto acima

1. **O pai cadastra o livro antes** (aba Livros do painel: título e páginas). A criança só conta livro que está na estante; pode **propor** um (título + páginas), mas esse só paga com o "Aprovar" do pai. Sem perguntar "quantos dias levou" e **sem mostrar "você levou N dias"** (pai, 22/09: a data do cadastro não mede quando ele começou; `readingDays` fica só no relato, para o pai, e não entra no juiz).
2. **Uma pergunta de verificação** depois do resumo: o Sábio pergunta um **fato da história** que não está no texto dele (livro conhecido: da própria história; desconhecido: do que ele escreveu); só pergunta quando tem certeza da resposta, nunca o nome do autor nem nome que o livro não dá. Errou → "Isso eu não achei no livro. Me conta de novo essa parte." (falta parte, tenta de novo). Conferida por `gpt-4o`, temperatura 0, que recebe também o relato dele e a regra "a resposta esperada pode estar errada; na dúvida, aceite"; recusa só "não sei/não lembro", resposta sobre outra coisa ou contradição clara. Conferente malformado não castiga. (Ajustado em 22/09 depois da sessão de fotos: o juiz perguntou "qual é o nome do menino maluquinho" esperando "Ziraldo" e o `mini` recusou a resposta certa.)
3. **Texto perfeito não é recusa automática.** O Sábio só pede reescrita quando o texto parece de adulto/IA **e** é genérico (`leu <= 1`); com `leu >= 2` aceita, paga e **marca para o pai** (`flagged`). **Colar** no campo (paste com mais de 20 caracteres) é recusado na hora, sem gastar IA: "Isso veio colado. Escreve com as suas mãos."
4. **Gold definido pelo pai no cadastro** (1 a 100; campo "Vale" na aba Livros, editável depois); as páginas só sugerem: curto (até 60) 8 · médio (até 150) 15 · longo 25. Mais 40 XP. Um resgate por dia continua. (Pai, 22/09: "O Pequeno Príncipe é muito mais complexo" que Matilda; páginas não medem complexidade. A criança não pode definir valor: regra Firestore barra `gold` no livro proposto por ela.)
5. **Resposta do pai**: uma linha escrita no painel (`parentReply`), que o Sábio entrega na estante: "Seu pai leu o que você contou de … e disse: …".
6. **Ficha simplificada**: 4 rostos obrigatórios; nota 0-10 opcional; sem campo de dias (vem do cadastro).

Implementação (líder, 22/09): `src/services/village/books.ts` (puro, testado), `src/services/bookService.ts`, `src/components/hero/village/EstanteDoSabio.tsx`, `src/components/parent/BooksPanel.tsx`; coleções `books` e `bookReports`; claims `book:<chave-sem-espaço>` e `bookday:<data>`; `village.stats.booksRead`; extrato `source: 'book_report'`. Fotos e os três casos reais (sinopse colada, texto sem o fim, texto de criança) em `docs/exemplos/telas/etapa-3/estante/` e na REVISAO ("Entrega do líder: Estante do Sábio").

## Decisões do pai (22/09)

15 gold por livro; um resgate por dia; livros únicos; avaliação pelo título + texto; texto com mínimo, não gigante; erros de português são esperados — texto perfeito é sinal de cópia ou IA. Propostas do líder embutidas acima (dias, 4 rostos, nota, molde, 80/120 palavras, `gpt-4o`, +40 XP, estante visual, aprovação do pai): valem salvo aviso.
