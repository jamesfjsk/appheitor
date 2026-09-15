# Manual do pai — Miner Missions

Texto para o dia a dia. Sem jargão.

## 3 minutos por dia

1. Abra o painel (Entrar como Pai).
2. Olhe **Hoje** no Dashboard: missões feitas, gold, sequência.
3. Na aba **Recompensas**, aprove ou recuse os pedidos de prêmio.
4. Se houver um recado (treino, consulta, visita), publique na aba **Placa**.

Isso basta na maioria dos dias.

## 15 minutos por semana

- Aba **Vila**: conferir materiais, equipamentos, Baús abertos e o cartão **Saúde** (chips vermelhos = faz mais de um dia que aquela parte não rodou).
- Ajustar **economia** só se o gold estiver fácil demais ou difícil demais.
- Marcar **folga** nos dias de viagem ou visita (Vila → Dias de folga, ou pelos modelos da Placa).
- Olhar o **Histórico Gold** se algo parecer estranho.

## O que cada interruptor faz

Na aba Vila:

- **Loja ligada**: se desligar, a criança não compra cosméticos com gold.
- **Efeitos de equipamento**: se desligar, picareta e botas continuam existindo, mas não dão bônus. O módulo **effects** faz a mesma coisa: os dois precisam estar ligados para o bônus valer.
- **Multiplicador de preço**: 2 deixa a loja duas vezes mais cara; 0,5 deixa mais barata.
- **Time**: nome e cores da camisa do time (quando a criança comprar).
- **Módulos**:
  - **aiGeneration** desligado: a prova do dia usa o banco local, sem chamar a OpenAI.
  - **tts** desligado: a Mina fala com a voz do navegador, sem gerar áudio pago.
  - **shop** desligado: a Loja da Vila recusa compra, mesmo com a loja “ligada” acima.
  - Os outros módulos ficam prontos para depois.
- **Portão de horário**: missão da tarde só depois das 12h, da noite só depois das 18h (horário de Brasília).

Economia (valores padrão, você pode mudar):

- Materiais por missão, gold do Baú (mínimo e máximo), esmeralda a cada N dias completos.
- Teto de gold do jogo no dia (Baú + presente de nível).
- Mínimo de missões para resgatar um prêmio de verdade.
- XP e gold padrão de cada missão.
- Hora em que o Baú abre e quantas missões o dia precisa ter para o Baú existir.

## Folga, férias e punição

- **Folga**: dia marcado na Vila. Sem penalidade, sem bônus, a sequência de “dias completos” não muda.
- **Férias**: interruptor que já existia em Ajustes. Missões podem valer mais; o fechamento do dia não pune.
- **Punição**: o modo punição continua no lugar. Nesse dia o fechamento grava que foi punição, sem tirar gold extra da regra do dia.

## Conta de teste

Existe o e-mail `teste@flash.com` (senha no arquivo `.env`). Use para experimentar a Vila sem mexer na conta do Heitor.

- No computador, com o app em modo desenvolvimento, o login mostra **Entrar como conta de teste**.
- No painel, o cabeçalho tem **Ver como: Heitor | Conta de teste**.
- Para recomeçar do zero nessa conta: `node scripts/cleanup-test-account.mjs`
- Para garantir que a conta existe: `node scripts/setup-test-account.mjs`

A conta do Heitor só entra na verificação final, com você do lado.

## Commit e publicar o site

Quando a etapa estiver boa:

1. `npm run build` — se falhar, não publique.
2. `npx firebase-tools deploy --only hosting --project app-heitor`
3. Regras do banco, quando mudarem: `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project app-heitor`

O código desta etapa não foi commitado pela IA. Você revisa e commita.

## Custo de IA (ordem de grandeza por dia)

| Uso | Quando | Custo aproximado |
| --- | --- | --- |
| Prova do dia | Uma vez por dia, se a geração por IA estiver ligada | alguns centavos |
| Plano da Mina | Uma vez por dia, se a geração por IA estiver ligada | alguns centavos |
| Chat (se ligado) | Só se a criança usar | varia com o tamanho da conversa |
| Arte PixelLab | Só quando você mandar gerar sprites | centavos por imagem |

Com os interruptores **aiGeneration** e **tts** você corta o gasto de IA no mesmo instante: a prova deixa de chamar a OpenAI e a Mina deixa de gerar áudio pago. A Vila em si (missões, Baú, Oficina, loja) não chama IA.
