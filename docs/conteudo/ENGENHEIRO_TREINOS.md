# Engenheiro da Vila: treinos do micro:bit

Conteúdo da carreira (`docs/CONTRATOS_E_CARREIRAS.md` §11). O Cursor copia para `src/config/careers.ts` sem reescrever.

- **Treinos:** 14, mais um marco, a primeira encomenda de engenharia.
- **Ferramentas:** BBC micro:bit V2 e o editor MakeCode (`makecode.microbit.org`), com os componentes do kit ELECFREAKS: protoboard, LEDs, resistores, LDR, botões, buzzer, cabos, shield.
- **Tensão:** tudo em 3 V, por USB ou pilhas AA.
- **Recompensa:** XP e 1 redstone por treino, **nunca gold**.
- **Entrega:** "Mostrar ao pai" funcionando. A frase "O que você aprendeu?" é opcional.
- **Pistas:** em degraus, sempre na mesma ordem:
  1. alimentação;
  2. ligação (ou transferência do programa);
  3. entrada e saída;
  4. código;
  5. pista específica.

  Ele abre uma por vez. Pista é grátis e não muda a recompensa.

**Amostra do pai:** leia 3 dos 15 (20%). Sugestão: 5, 7 e 12.

## Primeiro dia

### 1. Conheça seu micro:bit
- **Objetivo:** achar as partes do micro:bit e colocar um programa nele pela primeira vez.
- **Vai usar:** micro:bit, cabo USB, computador.
- **Passos:**
  1. Ache os botões A e B, os 25 LEDs, o logo dourado (que também é um botão) e os pinos 0, 1, 2, 3V e GND.
  2. Abra o MakeCode e crie um projeto novo.
  3. Em "no iniciar", coloque "mostrar ícone" com uma carinha feliz.
  4. Ligue o micro:bit no USB e clique em "Baixar".
- **Funciona quando:** a carinha aparece nos LEDs.
- **Pistas:**
  1. A luz amarela atrás da placa acendeu quando você ligou o cabo?
  2. O micro:bit aparece no computador como uma unidade chamada MICROBIT? O arquivo foi para lá?
  3. O bloco "mostrar ícone" está dentro de "no iniciar"?
  4. Clique em "Baixar" de novo e espere a luz de trás parar de piscar.
  5. Se o botão "Baixar" pedir para parear, escolha o micro:bit na lista e confirme.
- **Competências:** `mb-basico`
- **Tempo:** 15 min · **XP:** 15 · **Libera:** 2

### 2. Mostre seu nome
- **Objetivo:** fazer o nome passar na matriz de LEDs.
- **Passos:**
  1. Em "sempre", coloque "mostrar texto" com o seu nome.
  2. Baixe.
  3. Depois troque para "HEITOR ENGENHEIRO".
- **Funciona quando:** o nome passa, repetindo, da direita para a esquerda.
- **Pistas:**
  1. O cabo continua ligado?
  2. Você baixou o programa novo, ou o micro:bit ainda roda o antigo?
  3. O texto está em "sempre" (repete) ou em "no iniciar" (uma vez só)?
  4. O texto está entre as aspas do bloco?
  5. Nome comprido demora: conte até dez antes de achar que não funcionou.
- **Competências:** `mb-basico`, `saidas`
- **Tempo:** 10 min · **XP:** 15 · **Libera:** 3

### 3. Coração que pisca
- **Objetivo:** fazer um coração acender e apagar sem parar, entendendo o que "pausa" faz.
- **Passos:**
  1. Em "sempre", coloque "mostrar ícone" (coração), "pausa" (500 ms), "limpar tela" e "pausa" (500 ms).
  2. Baixe.
  3. Mude as pausas para 100 e depois para 1000, e veja a diferença.
- **Funciona quando:** o coração pisca, e você mostra ao pai como mudar a velocidade.
- **Pistas:**
  1. O micro:bit está ligado?
  2. O programa novo foi baixado?
  3. Tem "limpar tela" entre os dois estados? Sem ele, o coração nunca apaga.
  4. Tem pausa depois do "limpar tela"? Sem ela, o apagado dura tão pouco que não se vê.
  5. A ordem certa é: coração, pausa, limpar, pausa.
- **Competências:** `mb-basico`, `saidas`
- **Tempo:** 15 min · **XP:** 15 · **Libera:** 4 e 5

## Depois

### 4. Botões: contador
- **Objetivo:** contar quantas vezes o botão foi apertado.
- **Passos:**
  1. Crie a variável "contagem".
  2. Em "no botão A pressionado", "mudar contagem por 1" e "mostrar número contagem".
  3. Em "no botão B pressionado", "definir contagem para 0" e mostrar.
- **Funciona quando:** A soma um e B zera. Conte até 10 na frente do pai.
- **Pistas:**
  1. Ligado?
  2. Baixado?
  3. O botão do bloco é o A mesmo, e não o B ou o A+B?
  4. "mudar por 1" soma; "definir para 1" sempre volta para 1. Qual dos dois você usou?
  5. O "mostrar número" precisa vir depois do "mudar".
- **Competências:** `entradas`, `saidas`
- **Tempo:** 20 min · **XP:** 20 · **Libera:** 6

### 5. Movimento: dado eletrônico
- **Objetivo:** usar o sensor de movimento para sortear um número de 1 a 6.
- **Passos:**
  1. Use "ao agitar".
  2. Dentro dele, "mostrar número" com "escolher aleatório de 1 a 6".
- **Funciona quando:** a cada chacoalhada sai um número de 1 a 6. Jogue 10 vezes: o 0 e o 7 nunca aparecem.
- **Pistas:**
  1. Ligado? No USB, chacoalhe com cuidado para o cabo não soltar. Com pilhas fica mais fácil.
  2. Baixado?
  3. O evento é "ao agitar", e não "ao pressionar"?
  4. O aleatório vai "de 1 a 6"? Se começar em 0, pode sair 0.
  5. Chacoalhe de verdade: um toque leve não conta como agitar.
- **Competências:** `entradas`, `saidas`
- **Tempo:** 20 min · **XP:** 20 · **Libera:** 7

### 6. Luz: o micro:bit que sente o escuro
- **Objetivo:** usar os próprios LEDs como sensor de luz e reagir quando fica escuro.
- **Passos:**
  1. Em "sempre", use "se nível de luz < 30 então mostrar ícone (lua), senão limpar tela".
  2. Tampe o micro:bit com a mão.
- **Funciona quando:** a lua aparece no escuro e some na luz. Mostre ao pai tampando e destampando.
- **Pistas:**
  1. Ligado?
  2. Baixado?
  3. O sensor de luz fica na frente, nos LEDs. Você tampou a frente?
  4. O sinal é "menor que" (<)? Com "maior que", o programa faz o contrário.
  5. Se a sala for escura, troque 30 por 80 e teste de novo: o número certo depende do lugar.
- **Competências:** `entradas`
- **Tempo:** 20 min · **XP:** 20 · **Libera:** 7

### 7. LED externo: o primeiro circuito
- **Objetivo:** acender um LED na protoboard pelo pino 0.
- **Vai usar:** shield ou garras, protoboard, 1 LED, 1 resistor de 220 ou 330 Ω, 2 fios.
- **Passos:**
  1. Monte o caminho: pino 0, resistor, perna comprida do LED, perna curta do LED, GND.
  2. No código, em "sempre": "escrever digital pino P0 para 1", "pausa 500", "escrever digital P0 para 0", "pausa 500".
- **Funciona quando:** o LED da protoboard pisca.
- **Pistas:**
  1. O micro:bit está ligado e o shield bem encaixado?
  2. Siga o caminho com o dedo: P0, resistor, LED, GND. Algum fio está na fileira errada da protoboard?
  3. O LED tem lado: a perna comprida vai para o lado do P0. Experimente virar o LED.
  4. O código escreve no P0, no mesmo pino onde está o fio?
  5. Sem resistor, o LED pode queimar. Ele está no caminho, entre o pino e o LED?
- **Competências:** `circuito`, `atuador`, `bancada`
- **Tempo:** 30 min · **XP:** 25 · **Libera:** 8, 9 e a ferramenta **Método do Engenheiro**

### 8. Buzzer: som de fora
- **Objetivo:** tocar uma melodia num buzzer ligado no pino 0.
- **Vai usar:** buzzer do kit, 2 fios. No módulo de 3 pinos: S no P0, V no 3V, G no GND.
- **Passos:**
  1. Ligue o buzzer: P0 e GND (ou S, V e G no módulo).
  2. Em "no botão A pressionado", coloque "tocar melodia".
- **Funciona quando:** o som sai do buzzer. O alto-falante da placa pode tocar junto; tudo bem.
- **Pistas:**
  1. Ligado?
  2. O fio do sinal está no P0? No módulo, S vai no P0.
  3. O botão A é a entrada, e o buzzer é a saída. Você está apertando o A?
  4. Tem o bloco de melodia dentro do "no botão A pressionado"?
  5. Buzzer tem lado: troque os dois fios de lugar e teste de novo.
- **Competências:** `circuito`, `atuador`
- **Tempo:** 25 min · **XP:** 25 · **Libera:** 10

### 9. Botão externo: a campainha
- **Objetivo:** ler um botão da protoboard no pino 1.
- **Vai usar:** 1 botão, 2 fios.
- **Passos:**
  1. Ligue uma perna do botão no P1 e a outra no GND.
  2. No código, "no iniciar": "definir puxar pino P1 para cima".
  3. Em "sempre": "se ler digital P1 = 0 então mostrar ícone (sino) e tocar tom, senão limpar tela".
- **Funciona quando:** apertar o botão da protoboard mostra o sino e toca.
- **Pistas:**
  1. Ligado?
  2. O botão atravessa o vão do meio da protoboard? As pernas precisam ficar em fileiras diferentes.
  3. O botão é a entrada, no P1. O código lê o P1?
  4. Com "puxar para cima", apertado vale 0, e não 1. O "se" compara com 0?
  5. Sem o "puxar para cima" no iniciar, o pino fica solto e a leitura muda sozinha.
- **Competências:** `circuito`, `sensor`
- **Tempo:** 30 min · **XP:** 25 · **Libera:** 10

### 10. LDR: sensor de luz de verdade
- **Objetivo:** medir a luz com um LDR no pino 2 e ver o número mudar.
- **Vai usar:** 1 LDR, 1 resistor de 10 kΩ, 3 fios.
- **Passos:**
  1. Monte: 3V, LDR, fileira do meio, resistor de 10 kΩ, GND. Da fileira do meio sai um fio para o P2.
  2. Em "sempre": "mostrar número ler analógico P2" e "pausa 500".
- **Funciona quando:** o número cai (ou sobe) quando você tampa o LDR. Anote dois números, claro e escuro, e mostre ao pai.
- **Pistas:**
  1. Ligado?
  2. O fio do P2 sai da fileira onde o LDR encontra o resistor? Tem que ser exatamente no meio dos dois.
  3. O LDR é a entrada. O código lê o P2 em analógico, e não em digital?
  4. Números grandes demoram para passar: use "pausa 500" ou mostre só quando mudar.
  5. Se o número não muda nada, troque o resistor: o de 10 kΩ tem as cores marrom, preto, laranja.
- **Competências:** `circuito`, `sensor`
- **Tempo:** 30 min · **XP:** 25 · **Libera:** 11

## Depois

### 11. Combine dois componentes: luz automática
- **Objetivo:** juntar uma entrada e uma saída de fora num aparelho só.
- **Passos:**
  1. Monte o LDR do treino 10 e o LED do treino 7 no mesmo micro:bit (LDR no P2, LED no P0).
  2. Anote o número do escuro que você mediu.
  3. Programe: se a leitura passar desse número, acende o LED; senão, apaga.
- **Funciona quando:** tampando o LDR, o LED acende sozinho; destampando, apaga.
- **Pistas:**
  1. Ligado?
  2. Os dois circuitos continuam certos? Teste um de cada vez com os programas dos treinos 7 e 10.
  3. Entrada no P2, saída no P0. O código usa cada pino no lugar certo?
  4. O número do "se" é o que você mediu no seu quarto? Use a sua anotação.
  5. Se acende no claro e apaga no escuro, troque "maior" por "menor".
- **Competências:** `circuito`, `sensor`, `atuador`, `projeto`
- **Tempo:** 40 min · **XP:** 30 · **Libera:** 12

### 12. Encontre o erro
- **Objetivo:** descobrir sozinho por que um circuito não funciona, usando o Método do Engenheiro.
- **Como é:** o pai monta o circuito do treino 7 ou do 11 com **um erro de propósito**: LED virado, fio na fileira errada, pino trocado no código ou resistor fora do caminho. Ele não conta qual.
- **Passos:** siga o Método, um passo por vez, e mude uma coisa só antes de testar de novo.
- **Funciona quando:**
  - o circuito volta a funcionar;
  - você explica ao pai qual era o erro e como achou.
- **Pergunta de entrega:** "O que estava errado e como você descobriu?"
- **Pistas:** só o Método. Sem pista específica neste treino: ele existe para treinar a procura.
- **Competências:** `debug`, `circuito`
- **Tempo:** 20 a 40 min · **XP:** 30 · **Libera:** 13

### 13. Modifique um projeto
- **Objetivo:** mudar um programa que já funciona sem quebrar o que estava certo.
- **Escolha um:**
  - o dado do treino 5 vira dado de 1 a 20 e mostra uma carinha quando sai 20;
  - a campainha do treino 9 toca uma música diferente se apertar duas vezes seguidas;
  - a luz automática do treino 11 pisca em vez de ficar acesa.
- **Funciona quando:** a mudança funciona e o resto continua funcionando.
- **Pergunta de entrega:** "O que você mudou e o que testou depois?"
- **Pistas:**
  1. alimentação;
  2. ligação;
  3. qual parte do programa faz o que você quer mudar?;
  4. salve uma cópia antes de mexer ("Projetos", "Duplicar");
  5. mude um bloco por vez e teste a cada mudança.
- **Competências:** `debug`, `projeto`
- **Tempo:** 30 min · **XP:** 30 · **Libera:** 14

### 14. Primeiro projeto orientado: alarme de gaveta
- **Objetivo:** resolver um problema de verdade seguindo as etapas de um engenheiro: entender, planejar, montar, testar, corrigir e mostrar.
- **O problema:** "Precisamos saber quando a gaveta foi aberta."
- **A ideia:** dentro da gaveta fechada é escuro, e ao abrir entra luz. O sensor de luz da placa (treino 6) ou o LDR (treino 10) percebem a mudança. O micro:bit toca e mostra um ícone.
- **Antes:** "O que você pretende fazer?" (uma linha).
- **Passos:**
  1. Meça a luz com a gaveta fechada e aberta.
  2. Escolha o número do meio.
  3. Programe o alarme.
  4. Coloque o micro:bit, com pilhas, dentro da gaveta.
  5. Teste 5 vezes.
- **Funciona quando:** as 5 aberturas disparam o alarme e nenhum alarme toca com a gaveta fechada.
- **Na entrega:** "Deu algum problema antes de funcionar? O que você mudou?"
- **Pistas:**
  1. As pilhas estão boas e bem encaixadas?
  2. O micro:bit ficou com os LEDs virados para cima, onde a luz entra?
  3. A luz é a entrada e o som, a saída. Tem os dois no código?
  4. O número do "se" veio das suas duas medições?
  5. Se toca com a gaveta fechada, sobra uma fresta de luz: suba o número.
- **Competências:** `projeto`, `sensor`, `debug`
- **Tempo:** 2 a 3 dias · **XP:** 40 · **Libera:** o marco 15

### 15. Marco: primeira encomenda de engenharia
- Não é treino. O painel avisa o pai: "Ele está pronto para a primeira encomenda de engenharia."
- O modelo "Projeto de engenharia" já vem preenchido com uma sugestão: "Luz automática para a caixa de ferramentas" (faixa projeto, cerca de 1 D).
- A partir daqui, os projetos pagos contam para o título de Engenheiro.

## O que não entra (segurança, §11.7)

- Nada ligado em tomada, 127 ou 220 V.
- Nada de fonte aberta, capacitor grande ou bateria de lítio solta.
- Nada de solda sem adulto.
- Tudo aqui é 3 V, por USB ou pilhas AA.
- Os treinos 1 a 14 **não** pedem a faixa FAÇA COM UM ADULTO.
- O projeto 14 pede um adulto só se precisar prender o micro:bit na gaveta com fita ou cola quente.
