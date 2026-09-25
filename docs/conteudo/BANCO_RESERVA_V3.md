# Banco de reserva da prova (v3)

Sentimento alvo: a pergunta que entra no lugar de uma vaga vazia ensina tanto quanto a da IA, e nunca é trivia.

**Para que serve.** Quando a IA não consegue preencher uma vaga da prova, o app completa com uma pergunta de reserva. O banco antigo (`public/data/quizData.json`) tem estes problemas:
- só 21 de 200 passam no validador v3;
- as que passam têm o `why` igual ao `trap`;
- várias são trivia ("Qual planeta fica entre a Terra e Júpiter", "a arma de Zeus").

Esse banco antigo continua com a Missão Surpresa.

**O que há aqui.** 60 perguntas novas em `banco-reserva-v3.json`, 12 por área: matemática, ciências, inglês, história e geografia. Todas seguem as mesmas regras:
- cada distrator é um erro típico de quem pensou pela metade;
- `why` e `trap` são textos diferentes;
- história e geografia perguntam causa ou consequência, nunca "qual é o nome";
- as 60 passaram no validador do app, o mesmo que filtra as perguntas da IA. Cinco contas levam só a marca leve `conta_nao_fecha`, que não tira a pergunta.

**Amostra do pai:** as 12 abaixo (20%). Aprovada pelo pai em 25/09/2026.

## Amostra (12 de 60)

**M03. Matemática, horário mais duração.**
- Pergunta: O filme começou às 18h50 e durou 1h40. A que horas terminou?
- Opções: 20h30 · 19h90 · 19h30 · 21h30
- Certa: 20h30
- Why: Terminou às 20h30 porque 18h50 mais 1 hora dá 19h50, e mais 40 minutos passa das 20h e chega a 20h30.
- Trap: Quem marca 19h90 somou 50 mais 40 minutos e esqueceu que 60 minutos já viram uma hora inteira.

**M09. Matemática, juntar dinheiro.**
- Pergunta: Caio ganha 15 reais por semana e gasta 6. Em quantas semanas ele junta 45 reais?
- Opções: 5 · 3 · 8 · 9
- Certa: 5
- Why: São 5 semanas porque Caio guarda 15 menos 6, que dá 9 reais por semana, e 45 dividido por 9 dá 5.
- Trap: Quem marca 3 dividiu 45 por 15 e esqueceu que Caio gasta 6 reais toda semana antes de guardar.

**C02. Ciências, consequência em cadeia.**
- Pergunta: Num lago, os peixes comem as algas e as garças comem os peixes. O que aconteceria com as algas se as garças sumissem?
- Opções: Diminuiriam, pois haveria mais comedores de alga · Ficariam iguais, pois a garça não come alga · Aumentariam, pois o lago teria menos bichos · Sumiriam, pois as garças cuidavam delas
- Certa: Diminuiriam, pois haveria mais comedores de alga
- Why: As algas diminuiriam: sem garças, os peixes se multiplicam, e mais peixes comem mais algas no lago.
- Trap: Quem marca ficariam iguais olhou só a ligação direta, mas a garça controla os peixes que comem as algas.

**C03. Ciências, teste justo.**
- Pergunta: Lucas quer saber se a planta precisa de luz para crescer. Qual teste mostra isso de forma justa?
- Opções: Duas plantas iguais, só uma no escuro · Duas plantas diferentes, uma no escuro · Uma planta no sol, regada todo dia · Duas plantas no escuro, uma com água
- Certa: Duas plantas iguais, só uma no escuro
- Why: O teste justo usa duas plantas iguais e muda só a luz; se só a do escuro murchar, a culpa é da falta de luz.
- Trap: Quem marca duas plantas diferentes mudou duas coisas de uma vez, e aí não dá para saber o que fez a diferença.

**C10. Ciências, o mecanismo.**
- Pergunta: Por que a Lua parece mudar de forma durante o mês?
- Opções: Vemos partes diferentes da face iluminada · A sombra da Terra cobre a Lua · A Lua encolhe e depois cresce · As nuvens tapam pedaços da Lua
- Certa: Vemos partes diferentes da face iluminada
- Why: A Lua tem sempre uma metade iluminada pelo Sol; ao girar em volta da Terra, vemos partes diferentes dessa metade.
- Trap: Quem marca a sombra da Terra cobre a Lua confundiu fase com eclipse, que só acontece às vezes e não todo mês.

**E06. Inglês, pergunta com is.**
- Pergunta: ___ your sister at school now?
- Opções: Is · Are · Am · Do
- Certa: Is
- Why: Na pergunta, o 'is' vai para o começo: 'your sister is' vira 'Is your sister', porque a irmã é uma pessoa só.
- Trap: Quem marca 'Are' pensou em 'you', mas a pergunta é sobre 'your sister', uma pessoa só, que pede 'is'.

**E09. Inglês, verbo sem s.**
- Pergunta: We ___ water every day.
- Opções: need · needs · is · am
- Certa: need
- Why: Com 'we', o verbo fica sem s: 'we need' quer dizer nós precisamos; o s no fim só aparece com 'he' e 'she'.
- Trap: Quem marca 'needs' colocou o s de 'he' e 'she', mas com 'we' o verbo fica 'need', sem s.

**H05. História, consequência.**
- Pergunta: O que mudou para os trabalhadores com a Lei Áurea, em 1888?
- Opções: A escravidão passou a ser proibida · Todos ganharam terras para morar e plantar · O Brasil virou uma república · Os portugueses voltaram para Portugal
- Certa: A escravidão passou a ser proibida
- Why: A Lei Áurea acabou com a escravidão, que passou a ser proibida, mas os libertos não receberam terra nem ajuda.
- Trap: Quem marca o Brasil virou uma república confundiu os anos: a república veio em 1889, um ano depois da lei.

**H10. História, o que mudou depois.**
- Pergunta: O que mudou no Brasil depois da Independência, em 1822?
- Opções: Deixou de obedecer ao rei de Portugal · Acabou a escravidão em todo o país · Virou uma república com presidente · Os portugueses foram todos embora
- Certa: Deixou de obedecer ao rei de Portugal
- Why: Com a Independência, o Brasil deixou de obedecer ao rei de Portugal e virou um império, com Dom Pedro I como imperador.
- Trap: Quem marca acabou a escravidão em todo o país misturou as datas: a escravidão só acabou em 1888, 66 anos depois.

**G06. Geografia, pontos cardeais.**
- Pergunta: O Sol nasce do lado leste. De manhã, de frente para o Sol, para que lado fica o norte?
- Opções: À sua esquerda · À sua direita · Atrás de você · Na sua frente
- Certa: À sua esquerda
- Why: De frente para o leste, o norte fica à sua esquerda, o sul à direita e o oeste nas suas costas.
- Trap: Quem marca à sua direita trocou os lados: de frente para o Sol da manhã, à direita fica o sul.

**G11. Geografia, por que ali.**
- Pergunta: Por que o rio Tietê corre para o interior de São Paulo, e não para o mar ali perto?
- Opções: O terreno desce para o interior · O vento do mar empurra o rio · O interior chove bem mais que o litoral · Os rios nunca correm para o mar
- Certa: O terreno desce para o interior
- Why: Perto do mar fica a Serra do Mar, que é alta; o terreno desce para o interior, e a água sempre corre para baixo.
- Trap: Quem marca os rios nunca correm para o mar generalizou: muitos rios chegam ao mar, só que o Tietê tem a serra no caminho.

**G12. Geografia, dois lugares.**
- Pergunta: Por que em algumas cidades do Sul do Brasil pode nevar no inverno, e no Norte nunca?
- Opções: Fica longe da linha do Equador · Fica perto do Polo Norte · Chove demais no Norte para nevar · Tem montanhas cobertas de gelo
- Certa: Fica longe da linha do Equador
- Why: Quanto mais longe do Equador, mais frio; o Sul fica longe da linha do Equador e, nas serras, o inverno chega a ter neve.
- Trap: Quem marca fica perto do Polo Norte trocou os polos: o Sul do Brasil fica mais perto do Polo Sul.

## As outras 48 (só o enunciado)

**Matemática:**
- M01: troco de 3 lanches e um suco.
- M02: ônibus para 130 alunos.
- M04: 10% de desconto numa camisa.
- M05: figurinhas divididas entre 3.
- M06: pontos na tabela.
- M07: caixas de piso para um quarto.
- M08: o dobro das bolinhas.
- M10: a hora de chegada do trem.
- M11: saldo de gols.
- M12: o erro na soma de Pedro.

**Ciências:**
- C01: o navio de ferro que boia.
- C04: o erro do "Sol que se apaga".
- C05: o vapor que vira nuvem.
- C06: o coração que acelera na corrida.
- C07: a colher de pau.
- C08: o bolor do pão.
- C09: a bola no gramado encharcado.
- C11: a casca de banana e a garrafa.
- C12: por que mastigar bem.

**Inglês:**
- E01: I am.
- E02: my brothers are.
- E03: there are three.
- E04: there is a ball.
- E05: my mother is.
- E07: we are.
- E08: Do you like.
- E10: I want.
- E11: I have.
- E12: my dog has.

**História:**
- H01: a roça que fixou os povos.
- H02: o que a escrita mudou.
- H03: a notícia antes do telefone.
- H04: a cana no Brasil colônia.
- H06: as cidades no litoral.
- H07: a escola obrigatória.
- H08: os imigrantes do café.
- H09: o Nilo no deserto.
- H11: o relógio de sol.
- H12: as fábricas e o campo.

**Geografia:**
- G01: chuva na Amazônia e no sertão.
- G02: as usinas nos rios.
- G03: escala do mapa.
- G04: o morro sem árvores.
- G05: a cidade depende do campo.
- G07: o frio no alto da serra.
- G08: os rios poluídos.
- G09: a cidade vista de satélite.
- G10: o lixo e a enchente.
