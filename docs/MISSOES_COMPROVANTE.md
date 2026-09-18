# Missões com comprovante: a missão da vida real pede prova de execução

Documento de desenho (fonte de verdade a partir de 18/09/2026). Pedido do pai: "algumas tarefas da vida real vão exigir uma validação, de forma sutil e adequada: ao concluir Leitura Produtiva, ele escreve o que aprendeu, e a gente valida se faz sentido e foi feito de verdade, e salva; dever de casa: sobre o que era o tema, a letra está legível, teve dificuldades. Não só clicar: ele tem que escrever, executar ações reais." Entra na Etapa 3, semana 1, antes dos contratos v2 (é a parte mais barata e a que mais muda o valor do gold das missões).

## 1. A ideia

Cada missão pode ter um **comprovante**, escolhido pelo pai no cadastro. Sem comprovante, "Concluir" funciona como hoje. Com comprovante, "Concluir" abre uma folha curta, na voz de um personagem, que pede uma ação real (escrever, responder, digitar um trecho, ficar presente no Foco). A IA confere se o que veio faz sentido para aquela missão; o pai vê tudo no painel. A recompensa só entra quando o comprovante é aceito. Regra de tom: é conversa, não formulário; nunca "prova a que você fez"; o personagem pergunta como quem se interessa.

## 2. Tipos de comprovante (sem câmera: o Heitor joga no PC e não tem celular)

| Tipo | O que a criança faz | O que a IA confere | Exemplo |
|---|---|---|---|
| **Escrever** | responde a uma pergunta do personagem com um texto curto (mínimo de palavras do pai, 15 por padrão) | faz sentido para a missão, tem um detalhe concreto (nome, número, fato, opinião), não repete ontem | Leitura: "O que você leu hoje e o que aprendeu?" |
| **Mini-conversa** (o mais forte) | responde 2 ou 3 perguntas que a **IA faz na hora, sobre o que ele escreveu** ("Você disse que leu sobre o Nilo. Por que o rio era tão importante?"; dever: "Copie uma questão da tarefa e a sua resposta"; a IA confere se a resposta está certa e ajuda se não estiver) | coerência entre as respostas, conhecimento real do conteúdo; para o dever, a resposta da questão | Leitura, dever de casa, lógica, inglês |
| **Trecho digitado** | digita a primeira frase do capítulo, o enunciado de uma questão, o título e a página | é texto plausível de livro ou de exercício (não teclas aleatórias); a página avança de um dia para o outro no mesmo livro | Leitura (título + página + frase), dever (matéria + enunciado) |
| **Perguntas** | 2 ou 3 rápidas: escolha ("Foi fácil, médio ou difícil?") e texto curto ("Sobre o que era?") | coerência com a missão e com a Agenda (prova de matemática amanhã → o dever foi de matemática?) | dever, digitação, lógica |
| **Foco com presença** | para missões de tempo ("Praticar lógica 1h"): o cronômetro do Foco roda com o app aberto e, a cada 15 minutos, o personagem faz uma pergunta de um toque ("Ainda na lógica? O que está resolvendo?") | tempo com respostas; sem resposta, o bloco não conta | lógica, digitação, inglês |
| **Pai confirma** | nada na hora; a missão fica "aguardando o pai" e o pai recebe um **push no celular** com o que a criança escreveu e um botão "Vale" | nada | quarto, louça, banheiro, bom comportamento |
| **Auditoria surpresa** | como "escrever", mas 1 em cada 3 dias (sorteado, a criança não sabe qual) o pai recebe o push para conferir pessoalmente | a IA como sempre; o pai só nos sorteados | arrumação e tarefas físicas quando o pai está em casa |
| **Webcam do PC** (só se o computador tiver) | foto do caderno pela câmera do notebook, no próprio app | a tarefa aparece na foto, letra legível, tema em uma linha | dever de casa |

Os tipos combinam. **Dever de casa completo** = perguntas (matéria e dificuldade) + trecho digitado (enunciado de uma questão e a resposta dele) + mini-conversa (a IA confere a resposta e, se estiver errada, explica: o comprovante vira ajuda). **Leitura completa** = trecho (título, página, primeira frase) + escrever (o que aprendeu) + mini-conversa (uma pergunta da IA sobre o que ele escreveu). A IA usa o histórico da mesma missão: mesmo livro, página que só anda para a frente, temas que mudam com a semana.

## 3. Como funciona na tela da criança

1. Ele toca "Concluir" na missão. Se ela tem comprovante, abre a folha do personagem dono da missão (o Olheiro para rotina e esporte; o Sábio para leitura e estudo; o Ferreiro para arrumação e trabalho), com a pergunta configurada pelo pai ou a padrão do tipo.
2. Ele escreve ou responde; na mini-conversa, o personagem faz a pergunta seguinte a partir da resposta. O botão é "Pronto", não "Enviar".
3. A IA responde em 2 a 4 segundos, sempre pela voz do personagem:
   - aceito: uma frase curta sobre o que ele escreveu ("Aprender que o Nilo enchia todo ano é o tipo de coisa que fica.") e a recompensa entra como hoje;
   - fraco (sem detalhe, fora do assunto, muito curto): o personagem pede **uma vez** mais um detalhe ("Conta uma coisa que aconteceu na história."); a segunda resposta é aceita e vai para o pai marcada "conferir";
   - trecho que não parece livro nem exercício (teclas aleatórias, página que voltou): "Essa frase não parece do livro. Olha de novo a página e digita como está."; na segunda vai para o pai marcada.
4. Nunca trava para sempre e nunca acusa ("você não fez"): quem decide é o pai. A criança não vê a marca "conferir".
5. Modo offline ou IA fora: o comprovante é guardado e a missão fica "aguardando o pai".

## 4. Painel do pai

- No cadastro da missão (`TaskForm`): "Comprovante: nenhum / escrever / mini-conversa / trecho / perguntas / foco com presença / eu confirmo / auditoria surpresa / webcam", a pergunta (com sugestão por tipo), mínimo de palavras, quantas perguntas da IA.
- Cartão Hoje: "Comprovantes de hoje" com cada um (texto, foto em miniatura, respostas, resumo da IA, marca "conferir" quando houver), e dois botões: "Vale" (padrão, nada a fazer) e "Não vale" (desfaz a missão como hoje, com o motivo em uma linha que o Olheiro repete para a criança no dia seguinte, sem castigo além de não pagar).
- Aba Missões: histórico de comprovantes por missão (os textos de leitura viram, com o tempo, o registro de tudo que ele leu e aprendeu).
- Relatório semanal: quantos comprovantes, quantos marcados, temas dos deveres, dificuldades declaradas.

## 5. Dados

- `tasks.proof: { kinds: ('text' | 'chat' | 'excerpt' | 'questions' | 'focus' | 'parent' | 'audit' | 'webcam')[], prompt?: string, minWords?: number, aiQuestions?: number, questions?: [...] }`.
- `taskCompletions.proof: { kinds, text?, chat?: { q, a }[], excerpt?: { title?, page?, text }, answers?, focusMinutes?, photoPath?, ai: { plausible, summary, topic?, difficulty?, answerCorrect?, feedback }, attempts, flagged, parentVerdict?: 'ok' | 'invalid', parentNote? }`. Fotos (só webcam) em `proofs/{uid}/{date}/{taskId}.jpg` no Storage.
- A IA (`openai` Cloud Function, modelo com visão para foto) recebe o título e a descrição da missão, a pergunta, a resposta ou a imagem e o comprovante de ontem da mesma missão (para pegar repetição), e devolve `{ plausible, summary, topic, legible, difficulty, feedback }`. Custo: 1 chamada por comprovante, dentro do teto mensal.
- Tudo entra na Memória da Prova e no Diário (Etapa 3): o que ele leu, o que estudou, o que achou difícil.

## 6. Ficha pedagógica

1. **O que ensina**: registrar o que aprendeu com as próprias palavras (metacognição), responsabilidade com a tarefa real, honestidade sem vigilância.
2. **Por que cabe aos 10 anos**: 15 palavras é um parágrafo curto; copiar uma frase do livro ou uma questão é gesto simples; perguntas de escolha para o que é difícil verbalizar; a mini-conversa é como um adulto perguntando "e aí, o que aconteceu?".
3. **Como mede**: `taskCompletions.proof` (texto, respostas da mini-conversa, trecho e página, tema, dificuldade, marcas do pai).
4. **Como adapta**: o mínimo de palavras e a pergunta são do pai; o personagem pede mais detalhe uma vez.
5. **Feedback**: uma frase do personagem sobre o conteúdo do que ele escreveu, nunca sobre "ter provado".
6. **O pai vê**: tudo, com "Não vale" quando não convencer.
7. **IA**: julga plausibilidade e resume; nunca decide sozinha contra a criança.
8. **Economia**: a recompensa é a mesma da missão; só muda o momento (depois do comprovante aceito). Sem gold extra por escrever.

## 7. Ordem

Etapa 3, semana 1: (1) `tasks.proof` e `TaskForm`; (2) "escrever", "perguntas" e "trecho" com julgamento por IA; (3) "mini-conversa" (a IA pergunta a partir da resposta); (4) "pai confirma" com push e "auditoria surpresa"; (5) "foco com presença"; (6) painel Hoje e histórico; (7) webcam só se o PC tiver câmera. Primeiras missões do Heitor com comprovante, sugestão para o pai: Leitura Produtiva (trecho + escrever 20 palavras + mini-conversa), Dever de casa (perguntas + trecho com a resposta + mini-conversa), Praticar lógica 1h (foco com presença), Praticar inglês (perguntas), Bom comportamento e quarto (pai confirma; louça e banheiro com auditoria surpresa).
