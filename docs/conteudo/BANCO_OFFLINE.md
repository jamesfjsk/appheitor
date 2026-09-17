# Banco offline de perguntas (quizData.json)

Arquivo: `public/data/quizData.json`. Usado por `loadOfflineQuestions` em `src/services/aiQuiz.ts` quando a IA falha (Quiz do Dia e Missão Surpresa). Cada item tem `question`, `options` (4), `answer` (igual a uma das opções), `explanation` (1 a 2 frases que ensinam), `category` e `subject`. Os campos `category` e `subject` são ignorados pelo código hoje; servem para o pai filtrar e para uso futuro.

Total: **200 perguntas**, nível 5º ano, sem repetições (validado por texto normalizado, o mesmo critério de `sanitizeQuestions`).

## Contagem por categoria

| Categoria | `category` | Perguntas | Assuntos (`subject`) |
|---|---|---:|---|
| Matemática | `matematica` | 15 | frações, tempo, sequências, perímetro, multiplicação, estimativa, múltiplos, valor posicional, divisão com resto, decimais e frações, área, problemas, números negativos |
| Lógica | `logica` | 15 | ordenação, sequências, classificação, dedução, raciocínio, argumentos, padrões, equações, ângulos, calendário, contagem |
| Geografia | `geografia` | 10 | fusos horários, rios, mapas e escala, estações do ano, desertos, distâncias, clima, relevo e clima |
| Química | `quimica` | 10 | misturas, estados da matéria, evaporação, reações químicas, densidade, combustão, ebulição, mudanças físicas e químicas |
| Astronomia | `astronomia` | 10 | Lua e marés, Sol, planetas, sistema solar, Lua, velocidade da luz, tamanhos, gravidade |
| Corpo humano | `corpo` | 10 | coração, ossos, hidratação, respiração, digestão, sentidos, músculos, cérebro, defesas do corpo |
| Arte | `arte` | 10 | cores, escultura, perspectiva, instrumentos musicais, música, técnicas, quadrinhos |
| Invenções | `invencoes` | 10 | roda, linha do tempo, aviação, geladeira, internet, eletricidade, navegação, máquinas simples |
| Mitologia e folclore | `mitologia` | 10 | mitologia grega, o que é mito, mitologia nórdica, folclore brasileiro, mitologia egípcia |
| Dinheiro | `dinheiro` | 10 | poupança, porcentagem, juros, lucro e prejuízo, troco, preços, orçamento, comparar preços |
| Cidadania | `cidadania` | 10 | leis, impostos, voto, convivência, direitos, deveres, trânsito, três poderes, democracia |
| Animais | `animais` | 10 | polinização, mamíferos, classificação, adaptação, longevidade, evolução, metamorfose, habitat, sentidos, cadeia alimentar |
| Cotidiano | `cotidiano` | 10 | rotina e tempo, higiene, ciência em casa, economia de água, cozinha, alimentos, rotina, segurança |
| Brasil | `brasil` | 10 | fronteiras, regiões, história do Brasil, língua, biomas, meio ambiente, população, símbolos |
| Minecraft | `minecraft` | 10 | mineração, blocos, crafting, mobs, inventário, fornalha, agricultura |
| Futebol | `futebol` | 10 | placar, regras, pontuação, Copa do Mundo, cultura, tempo de jogo, tática |
| Filosofia | `filosofia` | 10 | ética, o que é filosofia, Sócrates, diálogo, argumentos, justiça, aprendizado, confiança, honestidade |
| História | `historia` | 10 | períodos, pré-história, Egito antigo, agricultura, escrita, Roma antiga, grandes navegações, Idade Média, séculos |
| Inglês | `ingles` | 10 | frases do dia a dia, gramática, vocabulário, plural, dias da semana, conversação, futebol em inglês, números |
| **Total** | | **200** | |

## Tipos de enunciado

- "Estime...": 12
- "Ache o erro...": 19
- "O que aconteceria se..." / hipóteses: 14
- "O que vem depois..." (sequências): 7
- "Qual frase é verdadeira...": 12
- Restante: problemas em duas etapas, situações do dia a dia, por quê / como.
- Perguntas que exigem raciocínio em duas etapas: cerca de 60 (todas as 15 de matemática e 10 de lógica; mais as de dinheiro, futebol, cotidiano, geografia e astronomia com conta ou dedução).
- Nenhuma pergunta do tipo "qual a capital de".

## Dez exemplos para amostrar

### 1. Matemática (frações)

**Numa turma de 30 alunos, 2/5 são meninas. Quantos meninos há na turma?**

- **18** (certa)
- 12
- 20
- 6

_Primeiro ache as meninas: 30 ÷ 5 = 6, e 6 × 2 = 12. Depois tire das 30: 30 − 12 = 18 meninos._

### 2. Lógica (raciocínio)

**Três caixas têm etiquetas: 'maçãs', 'laranjas' e 'mistura', mas todas estão erradas. Você tira uma fruta da caixa 'mistura' e sai uma maçã. O que há nessa caixa?**

- **Só maçãs** (certa)
- Só laranjas
- Maçãs e laranjas misturadas
- Não dá para saber

_Como a etiqueta 'mistura' está errada, a caixa não é mistura. Saiu maçã, então ela só pode ser a caixa só de maçãs._

### 3. Geografia (fusos horários)

**Se você viajar do Brasil para o Japão, o que acontece com o relógio quando chegar lá?**

- **Ele precisa adiantar várias horas** (certa)
- Ele fica igual
- Ele precisa atrasar várias horas
- Só muda o dia da semana

_O Japão fica muito a leste do Brasil, e quanto mais a leste, mais cedo o Sol nasce. Lá o relógio está 12 horas adiantado em relação a Brasília._

### 4. Química (densidade)

**Um cubo de gelo flutua num copo cheio até a borda. Quando ele derreter, a água vai transbordar?**

- **Não, o nível fica praticamente igual** (certa)
- Sim, transborda bastante
- O nível desce muito
- A água some do copo

_O gelo flutuando já empurra para o lado exatamente o volume de água que ele vira ao derreter. Por isso o nível quase não muda._

### 5. Astronomia (velocidade da luz)

**A luz do Sol leva cerca de 8 minutos para chegar à Terra. Se o Sol se apagasse agora, quando você perceberia?**

- **Só daqui a 8 minutos** (certa)
- No mesmo instante
- Depois de 1 dia
- Depois de 1 hora

_A luz que você vê agora saiu do Sol há 8 minutos. Então, por 8 minutos, ainda veríamos a luz que já estava a caminho._

### 6. Dinheiro (comparar preços)

**Duas embalagens de suco: 1 litro por R$ 8 e 2 litros por R$ 14. Qual é mais barata por litro?**

- **A de 2 litros** (certa)
- A de 1 litro
- As duas custam o mesmo por litro
- Não dá para saber

_Na de 2 litros, cada litro sai a 14 ÷ 2 = 7 reais, menos que os 8 da pequena. Mas só compensa se você for usar tudo._

### 7. Minecraft (crafting)

**Ache o erro: 'Para fazer uma picareta de madeira, uso 3 tábuas e 2 gravetos na mesa de trabalho.'**

- **Não há erro** (certa)
- São 3 gravetos e 2 tábuas
- Precisa de 5 tábuas
- Precisa de um lingote de ferro

_A receita está certa: 3 tábuas em cima e 2 gravetos em coluna no meio. Toda picareta usa o mesmo desenho, mudando só o material._

### 8. Futebol (pontuação)

**No campeonato, vitória vale 3 pontos e empate vale 1. Um time com 5 vitórias, 4 empates e 3 derrotas tem quantos pontos?**

- **19** (certa)
- 15
- 9
- 23

_Vitórias: 5 × 3 = 15. Empates: 4 × 1 = 4. Derrotas não dão ponto. Total: 15 + 4 = 19._

### 9. Filosofia (argumentos)

**Ache o erro no raciocínio: 'Todo cachorro tem quatro patas. Meu gato tem quatro patas. Logo, meu gato é um cachorro.'**

- **Ter quatro patas não é só de cachorro, então a conclusão não segue** (certa)
- Cachorros não têm quatro patas
- Gatos não têm patas
- Não há erro

_A primeira frase diz que cachorros têm quatro patas, não que só cachorros têm. Vacas, gatos e cavalos também têm._

### 10. Inglês (futebol em inglês)

**No futebol em inglês, o 'goalkeeper' é qual jogador?**

- **Goleiro** (certa)
- Atacante
- Zagueiro
- Juiz

_'Goal' é gol e 'keeper' é quem guarda. Atacante é 'striker', zagueiro é 'defender' e juiz é 'referee'._

## Como validar

```
node -e "const d=require('./public/data/quizData.json'); console.log(d.length, d.every(q=>q.options.length===4 && q.options.includes(q.answer)))"
```

Deve imprimir `200 true`.
