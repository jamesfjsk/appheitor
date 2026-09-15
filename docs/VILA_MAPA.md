# Mapa da Vila: onde cada coisa mora (e uma palavra só para cada coisa)

Documento de desenho (fonte de verdade a partir de 15/09/2026). Junto com `docs/VILA_CONSTRUCOES.md` (construções) e `docs/VILA_ITENS.md` (itens), fecha a arquitetura da tela da criança. Entra em código na Etapa 2, Lote 1 (`docs/etapas/ETAPA_2_BANCO_E_TEMPORADA.md`, seção 18).

## Problema (auditoria de 15/09)

"Baú" quer dizer três coisas (o botão "Baú de recompensas" do cabeçalho, o Baú do Dia e a construção Baú). Os prêmios de verdade têm duas entradas (botão do cabeçalho e aba do Mercado, que abre a mesma tela por cima). O histórico de gold mora dentro da tela de prêmios. O Banco vai chegar e não tem lugar. Resultado: ele não sabe onde o gold entra, onde sai e onde fica guardado.

## Regra

**Cada conceito tem uma palavra, uma porta e um lugar.** Se duas telas mostram a mesma coisa, uma delas some. Se uma palavra aparece em dois lugares com sentidos diferentes, uma delas muda.

## Glossário (as palavras que o jogo usa, e só essas)

| Palavra | O que é | Onde mora |
|---|---|---|
| Gold | a moeda; compra prêmios de verdade e roupas; vai para o Cofrinho | chip do cabeçalho (abre o Extrato) |
| Material | madeira, pedra, ferro, redstone; constrói e forja | chips da faixa Hoje; Mochila |
| Raro | esmeralda e diamante; destravam o topo | Mochila; Torre |
| Missões | as tarefas do dia | **Casa do Minerador** (construção fixa na cena); faixa "Hoje" compacta na Vila; hotbar; tecla M |
| Casa do Minerador | a casa dele: missões, plano do turno, fechar o dia, diário | lote fixo da cena; cresce por temporada |
| Baú do Dia | a recompensa de fechar todas as missões | cartão na faixa Hoje e na cena (abre às 18h) |
| Prêmios de verdade | o que o pai cadastrou e o gold compra no mundo real | Mercado, aba Prêmios |
| Loja da Vila | roupas, acessórios e pets em gold | Mercado, aba Loja |
| Comerciante | o NPC do Mercado; compra material sobrando (Etapa 2) | Mercado, aba Comerciante; na cena |
| Ferraria | forjar equipamentos, fundir materiais, ver as obras | distrito Ferraria; Ferreiro na cena (antiga Oficina) |
| Obras | as sete construções e seus níveis | cartão de cada construção; Ferraria, aba Obras |
| Armazém | a construção que guarda as coisas (antiga construção "Baú") | lote na cena; abre a Mochila |
| Mochila | o inventário: equipado, roupas, equipamentos, materiais e raros | distrito Mochila, Armazém, tecla I |
| Banco da Vila | o Cofrinho (metas), o Bônus de paciência e o Extrato | construção Cofre; distrito Banco; chip de gold |
| Extrato | tudo que entrou, saiu e ficou guardado, por semana | Banco, aba Extrato |
| Torre | conquistas, recordes, troféus, habilidades | construção Torre; distrito Torre |
| Biblioteca | a prova do dia e o Sábio | distrito Biblioteca; Mesa de Encantamento |
| Mina | os contratos de inglês | distrito Mina; entrada da mina na cena |
| Agenda | provas, eventos, treinos, lembretes, Foco | distrito Agenda (antiga Ampulheta e Mapa) |
| Placa da Vila | avisos do dia, dica do turno, recados do pai | faixa fixa no topo da Vila |
| Tochas | dias completos seguidos | chip do cabeçalho |
| Nível e patente | crescimento da temporada | chip do cabeçalho (abre a Torre) |

Palavras que somem: "Baú de recompensas", "Oficina", "Ampulheta", "Mapa", "Cronômetro", "Turno mínimo/completo", "Workshop" nos títulos (o bilíngue fica nas placas da cena e no cartão, não nos botões).

## Cabeçalho (final)

Esquerda: avatar (abre a Mochila, aba Equipado), saudação, nome da vila. Chips: **gold** (abre o Extrato), **tochas**, **nível e patente** (abre a Torre), **relógio** (Etapa 2), **próximo evento** da Agenda quando faltam 7 dias ou menos. Botões: som, tela cheia, sair. Somem: "Baú de recompensas" e calendário (viram Mercado > Prêmios e Agenda).

## Grade de distritos (final, 8 cartões com ícone)

Casa, Mina, Biblioteca, Ferraria, Mercado, Banco, Mochila, Torre, Agenda (9 cartões, ou 8 com a Casa só na cena e na hotbar). Cadeado da prova em Mina, Ferraria, Mercado e Banco. Hotbar: Vila, Missões, Mina, Mercado, Mochila (teclas 1 a 5).

## Onde o gold circula (o desenho que a criança precisa entender)

1. **Entra** por missões, prova, Mina, Baú do Dia, tochas, desafios e conquistas. Toda entrada aparece no chip do cabeçalho com "+N" e no Extrato.
2. **Sai** no Mercado: prêmios de verdade (pedido que o pai aprova; "Meus pedidos" na mesma aba mostra "aguardando", "entregue") e Loja da Vila (na hora).
3. **Fica guardado** no Banco: o Cofrinho tira do saldo e mostra a meta; o Bônus de paciência aparece no Extrato com a linha "paciência rendeu +N".
4. **Nunca some sem explicação**: penalidade e conserto aparecem no Extrato com a frase do resumo de ontem.

O Extrato é a única tela de histórico; o histórico que hoje vive na tela de prêmios migra para lá.

## Mercado (final)

Abas **Prêmios de verdade** (cartões com ícone pixel, preço, "cerca de N dias no seu ritmo", estado: "Faça 5 missões", "Pedir", "Aguardando o pai", "Entregue"; prêmios só por meta mostram "Criar meta no Banco"), **Loja da Vila** (`docs/VILA_ITENS.md`) e **Comerciante** (Etapa 2). A tela de prêmios antiga (`RewardsPanel`) deixa de ser modal e vira o conteúdo da aba; o pedido pendente e o gate de missões continuam iguais.

## Banco da Vila (final, Etapa 2)

Abas **Cofrinho** (metas com barra, guardar, pedir cancelamento), **Extrato** (semana atual e anteriores, por fonte e por destino, taxa de poupança, frase do Sábio) e **Paciência** (como o bônus funciona, em três linhas, com a comparação honesta mensal). Entrada pela construção Cofre, pelo distrito Banco e pelo chip de gold (que abre direto o Extrato).

## O que muda no código (Etapa 2, Lote 1)

`HeroHeader` (chips com ação, botões removidos), `VillageHome` (grade final e hotbar), `Mercado` (RewardsPanel embutido, "Meus pedidos"), `RewardsPanel` (vira conteúdo de aba; histórico sai), `Extrato` (recebe o histórico com os rótulos de `GoldHistory`), rótulos em `config/village.ts` (`DISTRICT_LABELS`: Ferraria, Banco, Mochila, Agenda), construção `bau` renomeada para "Armazém" no catálogo (id continua `bau`), textos "Baú de recompensas" removidos. Aceite: nenhuma tela abre por cima de outra igual; "Baú" só aparece em "Baú do Dia"; do chip de gold dá para chegar ao Extrato em um clique; um pedido de prêmio aparece como "Aguardando o pai" no Mercado até ser entregue.
