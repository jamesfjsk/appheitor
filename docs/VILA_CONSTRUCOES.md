# As construções da Vila: o que cada uma é, dá, libera e abre

Documento de desenho (fonte de verdade a partir de 15/09/2026). Prevalece sobre os textos de efeito que hoje estão em `src/config/englishBase.ts` e sobre a seção 3 de `docs/etapas/ETAPA_1_VILA.md`. As etapas dizem **quando** cada efeito entra em código; este documento diz **o que** é.

## Princípio

Na Vila, **construção é lugar**. Cada construção tem uma função própria, e tocar nela abre essa função (o cartão da construção, `docs/etapas/ETAPA_1B_CENA_V2.md` seção 3b), nunca uma lista genérica. A Oficina vira a **Ferraria**, a casa do Ferreiro (ao lado da Fornalha na cena): forjar equipamentos, a Fundição (liberada pela Fornalha nível 2) e a visão geral das obras; desenho em `docs/VILA_ITENS.md`. Os "distritos" da grade são atalhos para lugares que não são construções (Mina, Biblioteca, Mercado, Agenda, Placa) ou atalhos para construções já feitas (Torre, Baú).

Cada nível de uma construção tem que **mudar algo que a criança sente no dia seguinte**: um material a mais, uma proteção, uma porta que abre. Nada de "efeito chega na Etapa 2" na tela: se o efeito ainda não existe em código, a construção mostra o texto do efeito e a etiqueta "em breve", e o nível não pode ser comprado até existir.

Materiais: madeira (missões da manhã), pedra (tarde), ferro (noite), redstone (só na Mina e, com a Fornalha nível 3, uma vez por dia). Custos: os de `config/englishBase.ts` com o multiplicador 2 da economia v2 em madeira, pedra e ferro (redstone x1). Ritmo alvo: Fornalha e Baú nível 1 na primeira semana; todas as sete no nível 1 até a semana 3; base completa (21 níveis) em 8 a 10 semanas.

## As construções (sete que se constroem e a Casa)

### 1. Fornalha (Furnace): o motor de materiais

- **Para que serve**: transformar o trabalho em mais material. É a primeira coisa que ele constrói e a que mais usa.
- **Nível 1**: +1 material no primeiro contrato da Mina do dia (já existe).
- **Nível 2**: **Fundição**: libera a aba Fundição da Ferraria (troca 3 por 1 entre madeira, pedra e ferro; redstone nunca entra na troca). O botão "Fundir" do cartão da Fornalha abre essa aba.
- **Nível 3**: **Queima**: uma vez por dia, 5 madeira viram 1 redstone (única fonte de redstone fora da Mina; chave `burn:<data>` em `village.claimed`).
- **Ao tocar**: cartão com o nível, a fumaça acesa se nível 1 ou mais, os botões "Fundir" (nível 2) e "Queimar 5 madeira" (nível 3), e "Ir para a Mina".
- **Libera**: nada por si; é pré-requisito, junto com o Baú, da Torre, da Mesa e do Campinho.
- **Visual**: `buildings/fornalha-1..3.png`; fumaça em partículas quando construída; janela acesa à noite.

### 2. Baú (Storage): o armazém

- **Para que serve**: ver o que ele tem e melhorar o que o dia rende.
- **Nível 1**: abre o **inventário** (materiais, raros, equipamentos, cosméticos) e libera Torre, Mesa e Campinho (já existe).
- **Nível 2**: o Baú do Dia dá **+1 material**.
- **Nível 3**: a esmeralda do Baú do Dia vem a cada **2** dias completos seguidos em vez de 3.
- **Ao tocar**: cartão com o inventário em abas (Materiais, Raros, Equipamentos, Cosméticos) e o atalho "Abrir o Baú do Dia" (mesmo modal de hoje).
- **Visual**: `buildings/bau-1..3.png`.

### 3. Cerca (Fence): a proteção

- **Para que serve**: perdoar um dia ruim sem tirar a consequência. É a construção que ensina que planejar protege.
- **Nível 1**: uma vez por **mês**, um dia perdido **não zera as tochas** (`fullDays`); chave `fence:<ano-mês>`.
- **Nível 2**: a rachadura do conserto (Etapa 2) some sozinha depois de 1 dia, sem custo.
- **Nível 3**: a penalidade por missão perdida nunca passa de **1 gold por dia**, mesmo com várias missões perdidas.
- **Ao tocar**: cartão mostrando "Proteção deste mês: disponível / usada em 12/09" e o que cada nível protege.
- **Visual**: `buildings/cerca-1..3.png`; à noite, tochas nos postes.
- Não confundir com o capacete (equipamento): o capacete absorve **1 missão** por semana no fechamento do dia; a Cerca protege as **tochas** e limita a penalidade.

### 4. Torre (Tower): o lugar do progresso

- **Para que serve**: ver o que ele conquistou e para onde está indo.
- **Nível 1**: abre a **Torre**: conquistas (pacote da nova fase) e a estrela de temporada.
- **Nível 2**: **Recordes e Troféu da semana** (Etapa 2).
- **Nível 3**: a criança pode **propor desafios** ao pai (Etapa 2) e vê o **Mapa de habilidades** (relatório semanal).
- **Ao tocar**: cartão com abas Conquistas, Recordes, Troféus, Habilidades (as que o nível liberou; as outras com cadeado e o nível necessário).
- **Visual**: `buildings/torre-1..3.png`; luz no topo à noite.

### 5. Mesa de Encantamento (Enchanting Table): o saber

- **Para que serve**: escolher o que vai aprender e guardar o que aprendeu. É a casa do Sábio.
- **Nível 1**: escolher o **tema da história de amanhã** na Mina (já existe na Base).
- **Nível 2**: **Estante de erros**: as perguntas que errou na prova voltam 3 e 10 dias depois (Etapa 3) e o **Diário** (reflexões) fica aqui.
- **Nível 3**: **1 dica grátis por dia** no Recado da Mina e o Sábio responde ao Diário no dia seguinte (Etapa 3).
- **Ao tocar**: cartão com "Tema de amanhã" (seletor), atalho "Biblioteca (prova do dia)" e, quando existirem, Estante e Diário.
- **Visual**: `buildings/mesa-1..3.png` (roxa de propósito, é magia); partículas roxas no nível 3.

### 6. Campinho (Football Field): o lazer

- **Para que serve**: lembrar que descanso e jogo fazem parte. Tema do Heitor: futebol.
- **Nível 1**: libera o **pet exclusivo** do Campinho (Etapa 4) e o mini-jogo **Gol de Placa** (inglês por voz, Etapa 4).
- **Nível 2**: **bônus de fim de semana**: no sábado e domingo, missões pagam +1 material (Etapa 4).
- **Nível 3**: **torneio mensal** do Gol de Placa com recorde na Torre (Etapa 4).
- **Ao tocar**: até a Etapa 4, cartão com o texto dos níveis e a etiqueta "em breve"; **não pode ser construído** antes da Etapa 4 (botão "Abre na Etapa 4" desabilitado), para não gastar material em algo sem efeito.
- **Visual**: `buildings/campinho-1..3.png`.

### 7. Cofre (Vault): a poupança (Etapa 2)

- **Para que serve**: guardar gold para algo grande e aprender paciência.
- **Nível 1**: abre o **Cofrinho** com 1 meta.
- **Nível 2**: 2 metas e o **bônus de paciência** (juros semanais com teto).
- **Nível 3**: libera a faixa **prêmio da temporada** (50 dias de renda) e o Extrato mensal comparando com a poupança de verdade.
- **Ao tocar**: Cofrinho e Extrato.
- **Visual**: `buildings/cofre-1..3.png` (arte a gerar); o sprite muda também com o total guardado.
- Sétimo lote da cena (`anchors.json`, `cofre`); antes da Etapa 2 o lote mostra a placa "Cofre: em breve".


### 8. Casa do Minerador (Home): onde as missões moram (pedido do pai em 15/09)

- **Para que serve**: é a casa dele. As missões de casa acontecem em casa; hoje a lista fica solta abaixo da cena, "fora da vila". A Casa é o lugar da rotina: **Missões do dia** (manhã, tarde, noite, como hoje), **Plano do turno** (de manhã), **Fechar o dia** (à noite, com o check-in) e, na Etapa 3, o **Diário**.
- **Não se constrói**: já existe desde o primeiro acesso. Cresce por temporada (estrela): temporada 1 cabana, 2 casa, 3 sobrado (`buildings/casa-1..3.png`, arte a gerar). À noite a janela acende; com todas as missões feitas, a fumaça da chaminé sobe.
- **Ao tocar**: abre a Casa com as abas Missões (a lista atual, sem mudar regras), Plano do turno (Etapa 2), Fechar o dia (Etapa 2). Atalhos que também abrem a Casa: hotbar "Missões", tecla M, o cartão "Casa" da grade e a linha "Faltam N missões" da Placa.
- **Na página da Vila** fica só uma faixa compacta "Hoje": progresso das missões (2 de 6), a próxima missão do período com o botão "Concluir" (uma só, para o gesto mais comum continuar a um clique), e "Abrir a Casa". A lista completa deixa de ocupar a página.
- **Âncora na cena**: `house` no `anchors.json`, canto direito acima do lago (`{ "x": 1030, "y": 300, "w": 200, "h": 100 }`); o Comerciante passa para perto do lago (`{ "x": 990, "y": 445 }`) para não ficar na porta.
- **Libera**: nada; é a raiz do laço (missões alimentam tudo). Recebe da Agenda (missões de estudo) e do Plano do turno; entrega para gold, XP, material, Baú do Dia, tochas, desafios.

## Pré-requisitos e ordem

- Fornalha e Baú: sem pré-requisito.
- Cerca: Fornalha nível 1.
- Torre, Mesa, Campinho: Fornalha e Baú nível 1 (já existe).
- Cofre: Baú nível 1.
- Nível 2 de qualquer uma: nível 1 de Fornalha, Baú e Cerca. Nível 3: base com todas no nível 2 ou o nível de minerador 20 (economia v2).

## O que o cartão da construção mostra (sempre, nesta ordem)

1. Sprite do nível atual, nome bilíngue, marcadores de nível 1 2 3.
2. **"O que dá agora"**: uma linha, no presente ("Seu primeiro contrato do dia rende +1 material").
3. **"Próximo nível"**: uma linha do efeito, custo com ícones, botão Construir/Melhorar ou o motivo do bloqueio ("Falta 2 pedra", "Precisa da Fornalha nível 1", "Abre na Etapa 4"). Nível 3: "Nível máximo".
4. **A ação da construção** (botão grande): Fundir, Queimar, Inventário, Abrir a Torre, Tema de amanhã, Cofrinho.
5. "Ver todas as obras" (Ferraria, aba Obras, só leitura).

## Progressão visual (o nível tem que se ver)

Subir de nível precisa aparecer na cena, não só no cartão.

1. **Cada nível, um sprite.** Já existe: `buildings/<id>-1.png`, `-2.png`, `-3.png` para as seis construções (a Fornalha cresce e ganha chaminé, o Baú vira depósito, a Cerca ganha portão e tochas, a Torre sobe, a Mesa fica mais mágica, o Campinho ganha traves e arquibancada); o Cofre segue o mesmo padrão. A cena e o cartão sempre mostram o sprite do nível atual; nível 0 é a placa.
2. **Luz por nível** (Etapa 1B): construção nível 1 ou mais acende à noite; nível 3 acende mais forte e com partícula própria (fumaça na Fornalha, faísca roxa na Mesa, luz no topo da Torre).
3. **Cerimônia de obra** (Etapa 1B "se sobrar tempo", obrigatória na Etapa 2): ao subir de nível, poeira em 3 quadros sobre o lote, três batidas de martelo, o sprite novo "cresce" de 0,8 para 1 em 200 ms, e o Ferreiro comenta pelo sistema de diálogos.
4. **A vila cresce junto** (Etapa 2, Lote 2, "Vila que cresce v1"): a soma dos níveis da base muda o cenário em três estágios, por camadas transparentes desenhadas por cima do fundo (`scene/growth-1.png`, `-2.png`, `-3.png`, geradas pelo líder): até 6 níveis, clareira simples (o fundo como está); 7 a 13, caminho de pedra entre os lotes, canteiros de flores, lampiões ao lado da fogueira; 14 a 21, praça com poço, bandeirinhas entre a Fornalha e a Torre, banco de madeira ao lado do lago, mais lampiões. Cada estágio novo chega com uma cena curta: a câmera passeia pela vila (parallax) e o Sábio diz uma linha.
5. **Decorações escolhidas por ele** (Etapa 4): `village.decor` e a Loja de decorações em material, posicionadas em pontos fixos do JSON de âncoras.

Aceite visual: foto da cena com a base em três somas diferentes (3, 10, 18) mostrando sprites de nível e a camada de crescimento; foto noturna com as luzes por nível.

## O que muda no código, por etapa

- Etapa 1B (agora): cartão da construção com as ações que já existem (Fornalha: Ir para a Mina; Baú: inventário e Baú do Dia; Torre: conquistas; Mesa: tema de amanhã), textos de efeito deste documento, Campinho não construível, `buildings.effects[level]` em `config/englishBase.ts` reescritos com estas frases.
- Etapa 2: Casa do Minerador (as missões saem da página e entram na Casa; faixa "Hoje" compacta na Vila), Fundição e Queima na Fornalha (a troca sai da Oficina), Baú níveis 2 e 3, Cerca níveis 1 a 3, Torre níveis 2 e 3, Cofre, pré-requisitos de nível 2 e 3, custos x2; cerimônia de obra e "Vila que cresce v1" (camadas de crescimento por soma de níveis).
- Etapa 3: Mesa níveis 2 e 3.
- Etapa 4: Campinho.
