# Falas de "aprender a aprender" (para o pai ler antes do código)

Banco de texto da decisão 43 (`docs/APRENDER_A_APRENDER.md`). Pela lei da excelência, o pai lê antes de o Cursor usar (pelo menos 20%; estes são poucos, vale ler tudo). Sem emoji, sem caixa alta, na voz do personagem. O código copia estas frases **literalmente** (`src/data/helpLines.ts` e `src/data/bridge.ts`); frase nova entra primeiro aqui.

Para vetar: marque o id e o motivo; a fala sai. Para trocar: escreva a nova ao lado.

## 1. Prova do dia (pacote 11)

### 1.1 Aviso da área

Aparece depois do primeiro erro num item com escada, **quando o `trap` não serve** (ele não nomeia a opção escolhida, ou contém a resposta). Uma por vez, sem repetir a mesma em 14 dias. Nenhuma contém resposta; todas são uma ferramenta.

| id | área (`skill`) | fala | ferramenta |
|---|---|---|---|
| `av_mat_1` | `MAT.*` | Relê o fim da pergunta. Ela pede o resultado de qual conta? | entender o pedido |
| `av_mat_2` | `MAT.*` | Faz em dois pedaços. Qual é a primeira conta? E a segunda? | fazer menor |
| `av_mat_3` | `MAT.*` | Confere os números do enunciado. Todos entraram na sua conta? | testar e olhar |
| `av_ing_1` | `ING.*` | Ouve de novo, devagar. A palavra que falta está na frase. | ouvir de novo |
| `av_ing_2` | `ING.*` | Ouve de novo e presta atenção no pedaço antes do espaço. | ouvir de novo |
| `av_ing_3` | `ING.*` | Ouve de novo e repete a frase baixinho. Qual opção cabe nela? | testar e olhar |
| `av_apl_1` | `LIC.APLICAR` | Volta na ideia do dia. O que ela diz que funciona? | começar pelo que sei |
| `av_apl_2` | `LIC.APLICAR` | Imagina a cena acontecendo. O que vem logo depois de cada escolha? | testar e olhar |
| `av_apl_3` | `LIC.APLICAR` | Qual destas a ideia do dia mostra que não dá certo? Risca essa primeiro. | riscar o que não pode |
| `av_cau_1` | `CIE.CAUSA` | Pensa no que muda primeiro. O resto vem depois dele. | fazer menor |
| `av_cau_2` | `CIE.CAUSA` | Imagina em câmera lenta. O que acontece antes de quê? | de trás para frente |
| `av_cau_3` | `CIE.CAUSA` | Testa cada opção na cabeça: se fosse assim, o que você veria? | testar e olhar |
| `av_tat_1` | `FUT.TATICA` | Pensa no outro time. O que ele faz depois dessa jogada? | o que o outro vai fazer |
| `av_tat_2` | `FUT.TATICA` | Olha o placar e o tempo que falta. O que isso muda? | entender o pedido |
| `av_ger_1` | reserva | Relê a pergunta devagar. O que ela pede, exatamente? | entender o pedido |
| `av_ger_2` | reserva | Risca a que você tem certeza que não é. O que sobra? | riscar o que não pode |

### 1.2 A linha de cima, depois de responder

| id | quando | fala |
|---|---|---|
| (já existe) | acertou de primeira | Isso. |
| `desc_1` | acertou na segunda, depois do aviso | Descobriu. |
| `desc_2` | idem | Achou. Olhou de novo e achou. |
| `desc_3` | idem | Era isso. Você mudou e acertou. |
| `seg_1` | errou a segunda (item com escada) | Essa engana. Olha como ela funciona. |
| `seg_2` | idem | Ainda não. Olha o caminho: ela volta outro dia. |
| `fato_1` | errou item de fato (sem escada) | Essa pega muita gente. Olha o porquê. |
| `fato_2` | idem | A certa é outra. Guarda o porquê: ela volta. |
| `fato_3` | idem | Não era essa. Lê o porquê com calma. |

Nenhuma fala menciona gold nem diz que a segunda tentativa não paga (decisão 23b).

### 1.3 Os três estados (tela final; pacote AP4)

| estado | rótulo | ícone (líder) |
|---|---|---|
| acertou de primeira | De primeira | picareta |
| acertou depois de ajuda | Descobriu | faísca |
| errou; volta na Estante | Ainda na pedra · volta dia {dd/mm} | minério bruto |

## 2. Contratos da Mina (pacote AP2)

A escrever com o pacote AP2 (Comerciante e Recado), na voz de cada personagem.

## 3. O laço do plano (pacote AP1)

### 3.1 No Fechar o dia

| elemento | texto |
|---|---|
| linha de cima | Ontem você escreveu: |
| a frase dele | em itálico, como ele escreveu |
| pergunta | E aí? |
| botões | Fiz · Em parte · Não fiz |
| fichas (só em "Em parte" e "Não fiz"; opcional) | Esqueci · Não deu tempo · Ficou difícil · Mudei de ideia |

### 3.2 A fala do Sábio de manhã, na Placa

Uma por dia, sem repetir a mesma em 14 dias dentro do caso. Substitui o sorteio de `sageReplyFor` quando existe plano de ontem.

| id | caso | fala |
|---|---|---|
| `pf_1` | fiz | Ontem você disse que ia fazer, e fez. É assim que uma vila fica de pé. |
| `pf_2` | fiz | Plano de ontem cumprido. Qual é o de hoje? |
| `pf_3` | fiz | Você escreveu e cumpriu. Uma coisa pequena feita vale mais que uma grande só pensada. |
| `pp_1` | em parte | Ontem saiu metade do plano. O que faltou para a outra metade? |
| `pp_2` | em parte | Em parte já é caminho. O que você faria diferente hoje? |
| `pe_1` | não fiz · esqueci | Plano esquecido acontece com todo mundo. Que tal pôr o de hoje na Agenda? |
| `pe_2` | não fiz · esqueci | A cabeça esquece; a Agenda não. Deixa o plano de hoje anotado lá. |
| `pt_1` | não fiz · não deu tempo | O tempo acabou antes do plano. Qual pedaço cabia num dia? |
| `pt_2` | não fiz · não deu tempo | Talvez o plano fosse grande para um dia só. Hoje, um menor? |
| `pd_1` | não fiz · ficou difícil | Ficou difícil. Qual foi o primeiro pedaço que travou? |
| `pd_2` | não fiz · ficou difícil | Difícil costuma ser sinal de coisa nova. Por onde dá para começar? |
| `pm_1` | não fiz · mudei de ideia | Mudar de ideia também é pensar. O que fez você mudar? |
| `pn_1` | não fiz, sem ficha | Ontem o plano ficou para depois. Hoje ele pode ser menor. |
| `pn_2` | não fiz, sem ficha | Plano que não saiu não vira dívida. Qual cabe no dia de hoje? |

## 4. A ponte da quinzena (cartão do painel; pacote AP1)

Texto para o pai: pode ser direto (o painel não precisa da voz do mundo). Uma ferramenta por quinzena, nesta ordem.

### 4.1 Entender o pedido

- **Pergunta para o jantar:** Teve alguma pergunta hoje que você começou a responder antes de entender o que ela pedia?
- **Pense em voz alta na frente dele** (numa receita, num manual ou num formulário): "Antes de começar, deixa eu ver o que isso pede no fim."
- **Missão-problema:** Ler as regras de um jogo de tabuleiro novo e explicar para a família antes de jogar.
- **Quando ele pedir ajuda no dever, antes de explicar, pergunte:** "O que a pergunta está pedindo, no fim?"

### 4.2 Fazer menor

- **Pergunta para o jantar:** Teve alguma coisa hoje que ficou fácil quando você fez um pedaço de cada vez?
- **Pense em voz alta** (arrumando algo grande): "Tudo de uma vez não dá. Vou começar só por esta prateleira."
- **Missão-problema:** Montar um Lego grande (ou um quebra-cabeça) dividindo em partes; anotar quantas partes e em que ordem.
- **No dever:** "E se fosse só um pedaço disso? Resolve o pedaço primeiro."

### 4.3 De trás para frente

- **Pergunta para o jantar:** Se a gente precisa sair às 7h amanhã, a que horas você tem que acordar? Como pensou?
- **Pense em voz alta** (planejando um horário): "O jogo começa às 16h. Para chegar, saio às 15h20. Então o almoço tem que acabar até..."
- **Missão-problema:** Planejar o sábado de trás para frente: a que horas cada coisa tem que começar para chegar a tempo ao programa principal.
- **No dever:** "Onde isso tem que chegar? E qual é o passo logo antes?"

### 4.4 Testar e olhar

- **Pergunta para o jantar:** Teve alguma coisa hoje que você só entendeu depois de testar?
- **Pense em voz alta** (consertando algo): "Vou mudar uma coisa só e ver o que acontece. Se eu mudar tudo junto, não sei o que resolveu."
- **Missão-problema:** Descobrir qual avião de papel voa mais longe, mudando uma coisa por vez (dobra, peso, asa) e anotando o resultado.
- **No dever:** "Testa com um número fácil e vê o que acontece."

### 4.5 Riscar o que não pode

- **Pergunta para o jantar:** Numa escolha de hoje, teve alguma opção que você descartou logo? Por quê?
- **Pense em voz alta** (escolhendo um filme ou um restaurante): "Esse não dá, fecha cedo. Esse também não. Sobram dois."
- **Missão-problema:** Jogar Cara a Cara, ou um desafio de lógica em família, explicando cada opção que risca.
- **No dever:** "Qual destas com certeza não é? Risca e vê o que sobra."

## 5. Caderno do Minerador (pacote AP5)

Entrada escrita pelo Sábio: `{Ferramenta}. {Lugar}, {dd/mm}. Depois da pista, você achou.` Exemplo: "Fazer menor. Vagoneta, 21/09. Depois da pista, você achou." Abaixo, "Nas suas palavras:" (opcional, por voz ou texto). Entrada do pai: `{Ferramenta}. Em casa, {dd/mm}: {o que o pai escreveu}.`

## 6. Pergunta sobre o dia (pacote AP5)

A escrever com o pacote AP5: perguntas amarradas ao que aconteceu no dia (errou e acertou depois; acertou uma revisita; fez tudo de primeira; plano não cumprido), nunca "o que você aprendeu hoje?".
