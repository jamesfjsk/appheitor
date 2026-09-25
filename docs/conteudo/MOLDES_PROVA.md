# Moldes da prova do dia (Pacote 10b-2)

Sentimento alvo: cada dia pede um jeito diferente de pensar, e nenhuma pergunta se acerta só pelo bom senso.

**Por que existe.** Nas provas de teste de 04, 05 e 06/12, a IA copiou o exemplo do prompt três dias seguidos. A conta da abelha virou "Uma loja vende 25 livros por dia. Em 4 dias, quantos 3 lojas vendem juntas?". O "There ___ a cat on the mat" virou "There ___ a bird / a rabbit / a lion".

A cópia não vai sumir. A saída é o exemplo mudar todo dia e ser bom: ela copia a forma certa e a história muda.

**Como gira.** O número do dia (`dayNumber(date)`) escolhe um item de cada lista. Dois dias seguidos nunca repetem o molde na mesma área.

**Amostra do pai:** leia 5 dos 26 itens (20%) antes de o Cursor colar. Sugestão: M3, M6, I4, H4 e D1.

## Matemática (MAT.OP2)

Todas com kind "knowledge", subject "matematica", skill "MAT.OP2" e bloom "aplicar". Cada distrator é uma etapa feita pela metade.

**M1. Troco de uma compra.**
- Pergunta: Lucas comprou 3 cadernos de 12 reais e pagou com uma nota de 50 reais. Quanto recebeu de troco?
- Opções: 14 reais · 36 reais · 38 reais · 26 reais
- Certa: 14 reais
- Why: O troco é 14 reais porque primeiro 3 vezes 12 dá 36 reais de cadernos e depois 50 menos 36 fecha 14.
- Trap: Quem marca 36 reais parou no preço dos cadernos e esqueceu que a pergunta é quanto volta da nota de 50.

**M2. Fração de um total e depois o resto.**
- Pergunta: Dos 30 alunos da turma, 2/5 jogam futebol e o resto joga vôlei. Quantos jogam vôlei?
- Opções: 18 · 12 · 15 · 6
- Certa: 18
- Why: São 18 no vôlei porque 2/5 de 30 dá 12 no futebol, e os outros 30 menos 12 fecham 18.
- Trap: Quem marca 12 achou quantos jogam futebol e parou ali, sem tirar esse grupo do total de 30 alunos.

**M3. Horário de início mais duração.**
- Pergunta: O treino começou às 14h40 e durou 1h35. A que horas terminou?
- Opções: 16h15 · 15h75 · 15h15 · 17h15
- Certa: 16h15
- Why: Terminou às 16h15 porque 14h40 mais 1 hora dá 15h40, e mais 35 minutos passa das 16h e fecha 16h15.
- Trap: Quem marca 15h75 somou 40 mais 35 minutos e esqueceu que 60 minutos já viram mais uma hora no relógio.

**M4. Divisão com resto que obriga a mais um.**
- Pergunta: Cada van leva 9 alunos. A escola vai levar 58 alunos ao museu. Quantas vans são necessárias?
- Opções: 7 · 6 · 4 · 8
- Certa: 7
- Why: São 7 vans porque 58 dividido por 9 dá 6 vans cheias e sobram 4 alunos, que precisam de mais uma van.
- Trap: Quem marca 6 fez a divisão certa e esqueceu dos 4 alunos que sobraram, que não podem ficar na escola.

**M5. Porcentagem simples e depois o preço.**
- Pergunta: Um tênis custa 80 reais e está com 25% de desconto. Quanto ele custa com o desconto?
- Opções: 60 reais · 20 reais · 55 reais · 100 reais
- Certa: 60 reais
- Why: Custa 60 reais porque 25% de 80 é a quarta parte, 20 reais, e depois 80 menos 20 fecha 60.
- Trap: Quem marca 55 reais tirou 25 reais do preço, mas 25% de 80 é a quarta parte, que dá só 20.

**M6. Duas ofertas pelo preço de uma unidade.**
- Pergunta: Na feira, 3 mangas custam 12 reais e 5 mangas custam 15 reais. Quanto se economiza em cada manga na oferta mais barata?
- Opções: 1 real · 3 reais · 4 reais · 2 reais
- Certa: 1 real
- Why: Economiza 1 real porque 12 dividido por 3 dá 4 reais cada, 15 dividido por 5 dá 3, e 4 menos 3 fecha 1.
- Trap: Quem marca 3 reais comparou os preços totais, 15 menos 12, e esqueceu que as ofertas têm quantidades diferentes.

**M7. Medida com um lado que falta.**
- Pergunta: Um campinho retangular tem 100 metros de perímetro. Um dos lados mede 30 metros. Quanto mede o outro lado?
- Opções: 20 metros · 70 metros · 40 metros · 50 metros
- Certa: 20 metros
- Why: O outro lado mede 20 metros porque os dois lados de 30 somam 60, sobram 40 do perímetro, e 40 dividido por 2 fecha 20.
- Trap: Quem marca 70 metros tirou só um lado de 30 do perímetro e esqueceu que o retângulo tem dois lados iguais a ele.

## Inglês, nível 1 (a regra do dia)

Uma frase de exemplo só da forma. A IA escreve outra frase com a mesma regra. Opções: as formas da regra. Nos níveis 2 em diante, gira pela lista `promptAllowed` do nível, sem frase de exemplo.

- **I1. to be com I:** "I ___ ten years old." (am · is · are · be) → am
- **I2. to be no plural:** "My brothers ___ at school now." (are · is · am · be) → are
- **I3. there are:** "There ___ three balls under the bed." (are · is · am · be) → are
- **I4. pergunta com do you:** "___ you like pizza?" (Do · Are · Is · Am) → Do
- **I5. has:** "Pedro ___ a new red bike." (has · have · is · are) → has
- **I6. have com we:** "We ___ a big dog." (have · has · are · is) → have
- **I7. there is:** "There ___ a ball on the grass." (is · are · am · be) → is

## Ciências (CIE.CAUSA): a estrutura do dia

- **C1. O mecanismo.** Por que algo acontece. A certa é o mecanismo; as erradas são explicações que uma criança daria ("porque é mais leve", "porque é frio").
- **C2. O que aconteceria se.** Uma mudança e duas consequências em cadeia. A certa é a segunda consequência; uma errada é a primeira.
- **C3. Qual teste mostra.** Dois casos que só mudam numa coisa. A certa é o teste justo; as erradas mudam duas coisas ao mesmo tempo.
- **C4. Ache o erro.** Um colega explica algo com um erro. A certa aponta o erro.
- **C5. O que vem primeiro.** Uma sequência (a água que evapora, a semente que germina). A certa é a ordem.

## História ou geografia (HIS.FATO ou GEO.FATO): a estrutura do dia

A resposta é uma causa ou uma consequência que se explica, não um nome ou uma data para decorar. Nunca "Qual fato é verdadeiro" nem "Qual frase é verdadeira". (O exemplo fixo "Por que muitas cidades antigas nasceram perto de rios?" saiu em 25/09: a IA copiava.)

- **H1. Por que aconteceu.** A causa de um fato.
- **H2. O que mudou depois.** A consequência de um fato.
- **H3. Antes e hoje.** Como se fazia antes e o que mudou.
- **H4. Por que ali.** Por que as pessoas se fixaram num lugar (rio, porto, minério, clima).
- **H5. Dois lugares.** Por que um lugar é diferente do outro (chuva, frio, cidade grande).

## Distratores (regra de toda pergunta)

> Cada distrator é o que um aluno de 5º ano marcaria pensando pela metade: a primeira etapa da conta, a causa invertida, a regra da frase vizinha. Proibido distrator que se descarta sem saber a matéria: explode, flutua, fica invisível, some, vira pedra, cor e tamanho.

O exemplo de opções do LIC.APLICA hoje tem duas caricaturas ("O gelo some no ar", "O gelo vira pedra"). Passa a ser:

> "O gelo boia porque é menos denso" / "O gelo boia porque é mais frio" / "O gelo boia porque tem ar dentro" / "O gelo boia porque é pequeno"

## Dilema (LIC.DILEMA)

**Regra**, que troca o texto do C1 nos três lugares e entra também no `OPTION_SIZE` do dilema:

> O dilema usa a ideia do dia numa situação da vida dele (escola, casa, pelada). As 4 opções são atitudes em primeira pessoa, do mesmo tamanho. Cada errada tem uma vantagem de verdade, por isso tenta, e cobra um preço depois; no máximo uma é ficar parado. A melhor cuida dos dois lados. O why começa pelo que a melhor atitude resolve, com as palavras da situação, e nunca diz "a resposta certa"; o trap diz o preço de uma das outras.

**D1.** Modelo da substituição. Troca o "MODELO de dilema" do amigo na pelada.
- Pergunta: Você prometeu ajudar seu irmão no dever às 17h, e os amigos chamaram para um jogo às 17h. Qual atitude é a mais justa?
- Opções: Aviso os amigos e ajudo meu irmão · Jogo agora e ajudo meu irmão depois · Ajudo meu irmão bem rápido · Peço para minha mãe ajudar ele
- Melhor: Aviso os amigos e ajudo meu irmão
- Why: Quem avisa os amigos cumpre a promessa ao irmão e combina o jogo sem deixar ninguém esperando.
- Trap: Quem marca Jogo agora e ajudo meu irmão depois atende a vontade de jogar, mas o irmão fica esperando e a promessa atrasa.
- O preço de cada errada:
  - jogar agora atrasa a promessa;
  - ajudar rápido ensina pouco;
  - pedir à mãe passa adiante uma promessa que era dele.
