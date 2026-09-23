# As construções da Vila: o que cada uma é, dá, libera e abre

Documento de desenho (fonte de verdade a partir de 15/09/2026). Prevalece sobre os textos de efeito que hoje estão em `src/config/englishBase.ts` e sobre a seção 3 de `docs/etapas/ETAPA_1_VILA.md`. As etapas dizem **quando** cada efeito entra em código; este documento diz **o que** é.

## Princípio

Na Vila, **construção é lugar**. Cada construção tem uma função própria, e tocar nela abre essa função (o cartão da construção, `docs/etapas/ETAPA_1B_CENA_V2.md` seção 3b), nunca uma lista genérica. **Fornalha e Ferraria são o mesmo fogo**: o lote na cena e a casa do Ferreiro abrem a mesma oficina (`Oficina.tsx`), com abas Fogo, Forjar e Obras. Desenho em `docs/VILA_ITENS.md`. Os "distritos" da grade são atalhos para lugares que não são construções (Mina, Biblioteca, Mercado, Agenda, Placa) ou atalhos para construções já feitas (Torre, Baú).

Cada nível de uma construção tem que **mudar algo que a criança sente no dia seguinte**: um material a mais, uma proteção, uma porta que abre. Nada de "efeito chega na Etapa 2" na tela: se o efeito ainda não existe em código, a construção mostra o texto do efeito e a etiqueta "em breve", e o nível não pode ser comprado até existir.

Materiais: madeira (missões da manhã), pedra (tarde), ferro (noite), redstone (só na Mina e, com a Fornalha nível 3, uma vez por dia). Custos: os de `config/englishBase.ts` com o multiplicador 2 da economia v2 em madeira, pedra e ferro (redstone x1). Ritmo alvo: Fornalha e Baú nível 1 na primeira semana; as obras principais no nível 1 até a semana 3.

## As construções (nove que se constroem e a Casa)

### 1. Fornalha (Furnace): o motor de materiais

- **Para que serve**: o fogo da Ferraria. Transformar o trabalho em mais material. É a primeira coisa que ele constrói e a que mais usa. Fornalha (lote) e Ferraria (Forjar) são **o mesmo lugar**.
- **Nível 1**: +1 material no primeiro contrato da Mina do dia. Tocar no lote abre a Ferraria na aba **Fogo** (o bônus já vale; Fundir ainda fechado).
- **Nível 2**: **Fundição** na aba Fogo: troca 3 por 1 entre madeira, pedra e ferro; redstone nunca entra nem sai. Commit imediato, cerimônia de fogo 1,8–2,4 s.
- **Nível 3**: **Queima** na aba Fogo: uma vez por dia, 5 madeira viram 1 redstone (única fonte de redstone fora da Mina; chave `burn:<data>` em `village.claimed`). Cinza se já queimou hoje.
- **Ao tocar**: nível 0 ou ruína abre o cartão (Construir / Arrumar / Melhorar). Nível 1+ em pé abre a Ferraria no Fogo. O cartão tem "Abrir o fogo" e "Ir para a Mina". Melhorar volta pelo botão da aba Fogo. Tecla O / Mochila abrem a mesma Ferraria na aba Forjar.
- **Libera**: nada por si; é pré-requisito, junto com o Armazém, da Torre, da Mesa e do Campinho.
- **Visual**: `buildings/fornalha-1..3.png`; fumaça em partículas quando construída; janela acesa à noite; boca de fogo e SFX na aba Fogo.

### 2. Armazém (Storage): guarda o Baú do Dia

- **Para que serve**: o lugar do **Baú do Dia**. Sem Armazém em pé, o baú existe no mapa com cadeado e não abre. Inventário é a Mochila, não esta obra.
- **Nível 1**: guarda o Baú do Dia e libera Torre e Biblioteca.
- **Nível 2**: o Baú do Dia dá **+1 material**.
- **Nível 3**: a esmeralda do Baú do Dia vem a cada **2** dias completos seguidos em vez de 3.
- **Ao tocar**: nível 0 ou ruína abre o cartão (Construir / Arrumar). Nível 1+ em pé abre o lugar do Baú (cerimônia, SFX). Melhorar é no lote do Armazém.
- **Visual**: `buildings/bau-1..3.png`. No mapa o baú aparece sempre: cinza com cadeado se o Armazém não existe; brilho dourado e tampa viva só na hora, com o Armazém em pé e as missões feitas.

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
- **Nível 3**: vê o **Mapa de habilidades** (da Memória da Prova; desde 23/09, decisão 43: o que ele já domina e o que está na pedra, sem porcentagem por matéria, que fica só no painel) e as **Histórias** dos personagens (pedidos cumpridos). "Propor desafios" saiu da tela em 15/09 e sai do texto do nível em 17/09.
- **Ao tocar**: cartão com abas Conquistas, Recordes, Troféus, Habilidades (as que o nível liberou; as outras com cadeado e o nível necessário).
- **Visual**: `buildings/torre-1..3.png` na cena (n1 tocha, n2 telhado, n3 bandeira); o fundo pintado fica só no lote vazio. Luz no topo à noite.

### 5. Biblioteca (Library): o saber (id `mesa`)

- **Para que serve**: a prova do dia e o que ele vai aprender. É a casa do Sábio.
- **Nível 1**: abre a **prova do dia** e o **tema da história de amanhã** na Mina. Sem este nível, a prova não aparece.
- **Nível 2** (decisão do pai em 17/09, vale desde o lançamento): abre **"Como você vai"** na Biblioteca (da Memória da Prova; desde 23/09, decisão 43: o que ele já domina e o que está na pedra, sem porcentagem) e a **revisita**: uma das 8 perguntas da prova volta a um erro de 3 a 10 dias atrás por outro ângulo. Na Etapa 3 o nível 2 ganha também a **Estante de erros** e o **Diário**.
- **Nível 3** (idem; **mudado em 23/09 pela decisão 43**, a entrar no pacote AP4 de `docs/APRENDER_A_APRENDER.md`): depois de uma revisita certa, a Estante mostra **o erro de origem ao lado do acerto de hoje**, com "O que mudou?". Saem a "1 dica grátis por dia no Recado" (toda dica passa a ser grátis, depois da primeira tentativa) e a "revisita paga o dobro" (a revisita paga como item normal: erro não pode render mais do que acerto). Até o AP4, o código atual continua valendo. Na Etapa 3, o Sábio responde ao Diário no dia seguinte.
- **Ao tocar**: nível 0 abre o cartão Construir; nível 1+ abre a prova. O cartão também guarda o tema de amanhã.
- **Visual**: `buildings/mesa-1..3.png` (roxa de propósito, é magia); partículas roxas no nível 3.

### 6. Campinho (Football Field): o lazer

- **Para que serve**: lembrar que descanso e jogo fazem parte. Tema do Heitor: futebol.
- **Nível 1**: libera o **pet exclusivo** do Campinho (Etapa 4) e o mini-jogo **Gol de Placa** (inglês por voz, Etapa 4).
- **Nível 2**: **bônus de fim de semana**: no sábado e domingo, missões pagam +1 material (Etapa 4).
- **Nível 3**: **torneio mensal** do Gol de Placa com recorde na Torre (Etapa 4).
- **Decisão de 17/09**: o Campinho **sai da cena e da aba Obras** até a Etapa 4 (regra: nada "em breve" pode ser comprável nem ocupar lote). Volta com efeito de verdade (pet, Gol de Placa, bônus de fim de semana). Não confundir com a Arena (abaixo), que fica na cena como marco.
- **Visual**: `buildings/campinho-1..3.png` (prontos, guardados para a Etapa 4).

### Arena: marco da cena, não construção (decisão do pai em 17/09)

- **O que é**: o lugar do Olheiro na cena da Vila (arquibancada), entrou no Lote 2 da Etapa 2 sem documento e fica como **landmark**: sem custo, sem nível, nunca aparece em Obras nem no cartão de construir. É a porta futura dos jogos contra os pais (`docs/MINER_MISSIONS_ROADMAP.md`, Etapa 4B).
- **Ao tocar**: abre a fala do Olheiro (sistema de diálogos), que hoje diz o que a Arena vai ser. Nunca um cartão "Construir".
- **Código**: `config/englishBase.ts` sem custo e sem níveis para `arena`; `arena` e `campinho` fora de `BREAKABLE_LOTS` (`src/services/village/repair.ts`), porque marco não cai e o Campinho não existe. Sprite `buildings/arena-1.png`.

### 7. Cofre (Vault): a poupança (Etapa 2)

- **Para que serve**: guardar gold para algo grande e aprender paciência.
- **Nível 1**: abre o **Cofrinho**. Até **5 montinhos** ao mesmo tempo: cada Aplicar (10, 20, 30, 40 ou 50) vira um, com o gold, o + por semana e o dia do saque. **10 gold** aplicados rendem **+1** por semana.
- **Nível 2**: até **8 montinhos**. Os mesmos 10 gold rendem **+2** por semana.
- **Nível 3**: os mesmos 10 gold rendem **+3** por semana, faixa **prêmio da temporada** e o Extrato mensal. **Decisão do pai em 17/09: o nível 3 fica trancado até a Etapa 3** (o cartão mostra "Abre na Etapa 3", botão desabilitado, sem custo cobrado), porque a faixa e o Extrato mensal ainda não existem. **Decisão 27 (19/09): sem teto semanal de paciência; taxa por nível 10/20/30.**
- **Ao tocar**: nível 0 = Construir; nível 1+ abre o Cofrinho. No Cofrinho: aplicar um valor redondo, esperar o prazo daquele montinho, **Resgatar** nele (volta pro bolso). Dias diferentes não se misturam.
- **Visual**: `buildings/cofre-1..3.png`.
- Precisa do Armazém nível 1.

### 8. Agenda: o calendário da Vila

- **Para que serve**: provas, treinos, eventos, lembretes e Foco.
- **Só nível 1**: constrói e abre. Não tem melhorar.
- **Ao tocar**: nível 0 = placa Construir; nível 1 abre a Agenda.
- **Visual**: `buildings/agenda-1.png` (quiosque de avisos).
- Sem pré-requisito.

### 9. Mercado: a barraca

- **Para que serve**: Prêmios de verdade, Loja da Vila e o Comerciante.
- **Só nível 1** por agora: constrói e abre as três abas. Não usa ícone de dinheiro.
- **Ao tocar**: nível 0 = Construir; nível 1 abre o Mercado. O Comerciante na cena também abre, depois de construído.
- **Visual**: `buildings/mercado-1.png` (barraca com toldo). Na cena atual a barraca já está pintada no fundo; o sprite não se sobrepõe depois de construída.
- Precisa de Fornalha e Armazém nível 1.

### 10. Casa do Minerador (Home): onde as missões moram (pedido do pai em 15/09)

- **Para que serve**: é a casa dele. As missões de casa acontecem em casa; hoje a lista fica solta abaixo da cena, "fora da vila". A Casa é o lugar da rotina: **Missões do dia** (manhã, tarde, noite, como hoje), **Plano do turno** (de manhã), **Fechar o dia** (à noite: resumo automático do dia, "como foi o dia" em um toque e "amanhã eu..."; v2 decidida em 17/09, `ETAPA_2_LANCAMENTO.md` P2.6) e, na Etapa 3, o **Diário**.
- **Não se constrói**: já existe desde o primeiro acesso. Cresce por temporada (estrela): temporada 1 cabana, 2 casa, 3 sobrado (`buildings/casa-1..3.png`, arte a gerar). À noite a janela acende; com todas as missões feitas, a fumaça da chaminé sobe.
- **Ao tocar**: abre a Casa com as abas Missões (a lista atual, sem mudar regras), Plano do turno (Etapa 2), Fechar o dia (Etapa 2). Atalhos que também abrem a Casa: hotbar "Missões", tecla M, o cartão "Casa" da grade e a linha "Faltam N missões" da Placa.
- **Na página da Vila** fica só uma faixa compacta "Hoje": progresso das missões (2 de 6), a próxima missão do período com o botão "Concluir" (uma só, para o gesto mais comum continuar a um clique), e "Abrir a Casa". A lista completa deixa de ocupar a página.
- **Âncora na cena**: `house` no `anchors.json`, canto direito acima do lago (`{ "x": 1030, "y": 300, "w": 200, "h": 100 }`); o Comerciante passa para perto do lago (`{ "x": 990, "y": 445 }`) para não ficar na porta.
- **Libera**: nada; é a raiz do laço (missões alimentam tudo). Recebe da Agenda (missões de estudo) e do Plano do turno; entrega para gold, XP, material, Baú do Dia, tochas, desafios.

### 9. Barraca do Comerciante (Mercado) e 10. Sino da Vila (Agenda): lugares que se constroem (decisão do pai em 15/09, 15h45)

O pai preferiu que o Mercado e a Agenda também sejam construções, para tudo ser encontrado na vila em vez de em botões. Vale, com três condições:

- **Baratas e do primeiro dia**: custo de nível 1 igual ao da Fornalha (com o multiplicador da economia), sem pré-requisito além do primeiro acesso, para a criança construir as duas nos dois primeiros dias. Enquanto a Barraca não existe, a hotbar "Mercado" abre o cartão dela com "Construir" e a frase do Comerciante ("Me ajuda a montar a barraca e a gente faz negócio"); os prêmios de verdade e os pedidos ficam visíveis (só leitura) nesse cartão, para o gold nunca parecer inútil.
- **Nível 1 só**, por enquanto: a Barraca abre o Mercado (prêmios, Loja em breve, Comerciante); o Sino abre a Agenda e é onde o alarme "toca" na cena (o sino balança na hora do lembrete). Níveis 2 e 3 ficam para depois, com efeito de verdade (Barraca 2: Comerciante compra 3 vendas por dia; Sino 2: lembrete também para o pai; e assim por diante), nunca "em breve" comprável.
- **Sem furar as regras**: os dois entram em `BUILDINGS`/`fromBaseDoc` com os campos declarados (o doc de `englishBase` é reescrito inteiro por `fromBaseDoc`, então campo novo precisa estar lá), aparecem na Ferraria aba Obras e no cartão da construção como qualquer outra, e têm sprite próprio (barraca de madeira com toldo; poste com sino), arte a gerar.

A Casa do Minerador continua fixa (não se constrói). Com isso a vila tem oito construções que se constroem (Fornalha, Armazém, Cerca, Torre, Mesa, Campinho, Cofre, Barraca, Sino: nove) mais a Casa.


- Fornalha e Baú: sem pré-requisito.
- Cerca: Fornalha nível 1.
- Torre, Biblioteca, Campinho, Mercado: Fornalha e Baú nível 1.
- Cofre: Baú nível 1.
- Agenda: sem pré-requisito; máximo 1.
- Nível 2 de qualquer uma com níveis: nível 1 de Fornalha, Baú e Cerca. Nível 3: base com todas no nível 2 ou o nível de minerador 20 (economia v2).

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

## Ruínas: obra que cai no dia perdido (teto de 1 por dia; decisão 30 em 20/09)

Entrou no Lote 2 da Etapa 2 como reforço da "consequência sem castigo". Em 17/09 o pai manteve ruínas (decisão 2). Em 20/09 o teto passou a ser **no máximo uma obra por dia**, não uma por missão. Este é o comportamento de verdade, lido de `src/services/village/repair.ts`, `dailyRulesService.closeDay` e dos portões em `villageService.ts`, `goalsService.ts` e `englishBaseService.ts`.

**Quando cai.** No fechamento do dia (`closeDay`), se houver missão devida e não feita, cai **no máximo uma** obra construída (`cracksAfterClose`), mesmo com várias missões perdidas (decisão 30, 20/09): de preferência a obra do período da primeira missão perdida (manhã: Fornalha; tarde: Cerca; noite: Torre) e, se ela já caiu ou não existe, a primeira construída que ainda está de pé. Só obras de `BREAKABLE_LOTS` caem: Fornalha, Armazém, Cerca, Torre, Biblioteca, Cofre, Sino, Barraca. A Casa, a Mina, a Mochila, os personagens e a Arena nunca caem. O capacete absorve a primeira missão perdida da semana antes de contar. **Regra fechada em 17/09 (P1.13 do lançamento): a obra só cai quando há penalidade**, ou seja, nunca em férias, folga, punição ou com as regras do dia desligadas. Cerca nível 2 zera as rachaduras antes de contar as novas do dia.

**O que uma obra caída faz.** Enquanto está em ruínas ela vale nível 0 (`liveBuildingLevel`): Fornalha caída trava fundição, queima e o bônus de contrato; Armazém caído trava o Baú do Dia; Barraca caída trava compras e vendas; Cofre caído trava depósito e zera os juros da semana; Torre e Sino caídos perdem os efeitos de nível; **Biblioteca caída perde só os bônus dela e a prova continua alcançável** (exceção única, porque a prova é portão de tudo: P1.1). A cena mostra a rachadura sobre o lote e o cartão da obra diz o que travou e como arrumar.

**Como levanta.** Dois caminhos, sempre sem gold: (1) **fazer todas as missões devidas de hoje** levanta todas as obras de uma vez (`repairLot`) e devolve metade da penalidade de ontem em gold (`repairRefund`, `repairRefundPct` da economia), uma vez por dia; (2) **material**: 1 unidade do material principal da obra (`repairMaterialCost`) levanta só aquela obra, sem reembolso. O botão "Consertar" no cartão da obra e na Casa mostra o caminho disponível.

**O que ensina** (ficha curta): consequência visível e reparável no mesmo dia; a rotina protege o que ele construiu; nunca destrói progresso (o nível volta inteiro no reparo). Mede-se por dias com queda e reparos; o pai vê no resumo de ontem e no Relatório.

## O que muda no código, por etapa

- Etapa 1B (agora): cartão da construção com as ações que já existem (Fornalha: Ir para a Mina; Armazém: Baú do Dia; Torre: conquistas; Mesa: tema de amanhã), textos de efeito deste documento, Campinho não construível, `buildings.effects[level]` em `config/englishBase.ts` reescritos com estas frases.
- Etapa 2: Casa do Minerador (as missões saem da página e entram na Casa; faixa "Hoje" compacta na Vila), Fundição e Queima na Fornalha (a troca sai da Oficina), Baú níveis 2 e 3, Cerca níveis 1 a 3, Torre níveis 2 e 3, Cofre, pré-requisitos de nível 2 e 3, custos x2; cerimônia de obra e "Vila que cresce v1" (camadas de crescimento por soma de níveis).
- Etapa 3: Mesa níveis 2 e 3.
- Etapa 4: Campinho.
