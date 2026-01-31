# FLASH MISSIONS - Documentacao Tecnica Completa

## BRIEFING PARA RECONSTRUCAO DO PROJETO

---

# 1. VISAO GERAL

## Nome do Projeto
**Flash Missions** (anteriormente "Heitor Flash App")

## Proposito Principal
Sistema de gamificacao para gestao de tarefas/rotinas de uma crianca, onde um pai (admin) configura missoes diarias e a crianca ganha XP e Gold ao completa-las, podendo trocar por recompensas reais.

## Problema que Resolve
- Dificuldade de motivar criancas a cumprir rotinas diarias (escovar dentes, estudar, arrumar quarto, etc.)
- Falta de acompanhamento visual do progresso
- Ausencia de sistema de recompensas estruturado
- Necessidade de engajamento ludico para habitos saudaveis

## Publico-Alvo
- **Usuario Primario (Crianca)**: Crianca em idade escolar (6-12 anos) - no caso especifico, "Heitor"
- **Usuario Secundario (Admin/Pai)**: Responsavel que gerencia tarefas, recompensas e acompanha progresso

## Tematica
Inspirado no super-heroi **Flash** (DC Comics) - velocidade, raios, cores vermelho/amarelo

---

# 2. FUNCIONALIDADES COMPLETAS

## 2.1 Sistema de Usuarios

### Tipos de Usuario
| Tipo | Descricao | Acesso |
|------|-----------|--------|
| `admin` | Pai/Responsavel | Painel administrativo completo |
| `child` | Crianca | Painel do heroi (dashboard gamificado) |

### Autenticacao
- Login via email/senha (Firebase Auth)
- Registro de novos admins
- Vinculo automatico admin -> child (1 admin gerencia 1 crianca)
- Redirect automatico baseado no role apos login

---

## 2.2 Sistema de Tarefas (Missoes)

### Estrutura de uma Tarefa
```
Task {
  id: string
  ownerId: string           // UID da crianca
  title: string             // Nome da tarefa
  description?: string      // Descricao opcional
  xp: number               // Pontos de experiencia ao completar
  gold: number             // Moedas ao completar
  period: 'morning' | 'afternoon' | 'evening'  // Periodo do dia
  time?: string            // Horario especifico (opcional)
  frequency: 'daily' | 'weekday' | 'weekend'   // Frequencia
  active: boolean          // Se esta ativa
  status: 'pending' | 'done'  // Status atual
  lastCompletedDate?: string  // Data da ultima conclusao (YYYY-MM-DD)
  createdBy: string        // UID do admin que criou
}
```

### Regras de Negocio - Tarefas
1. **Reset Diario Automatico**: Todas as tarefas com status `done` voltam para `pending` a cada novo dia (meia-noite horario Brasil GMT-3)
2. **Controle por Data**: O campo `lastCompletedDate` evita completar a mesma tarefa mais de uma vez no mesmo dia
3. **Periodos**: Tarefas sao organizadas por manha/tarde/noite
4. **Frequencia**:
   - `daily`: Todos os dias
   - `weekday`: Segunda a sexta
   - `weekend`: Sabado e domingo
5. **XP e Gold por Tarefa**: Cada tarefa tem valores customizaveis de XP e Gold

### Fluxo de Completar Tarefa
1. Crianca clica na tarefa
2. Sistema verifica se ja foi completada hoje
3. Se nao, marca como `done` e atualiza `lastCompletedDate`
4. Adiciona XP ao progresso total
5. Adiciona Gold ao saldo disponivel
6. Incrementa contador de tarefas completadas
7. Verifica conquistas relacionadas
8. Verifica level up

---

## 2.3 Sistema de Niveis (XP)

### Progressao de XP por Nivel
```
Nivel 1:  0-99 XP
Nivel 2:  100-249 XP
Nivel 3:  250-449 XP
Nivel 4:  450-699 XP
Nivel 5:  700-999 XP
Nivel 6:  1000-1349 XP
Nivel 7+: +350 XP por nivel (1350, 1700, 2050...)
Nivel Max: 100
```

### Titulos por Nivel (Tematica Flash)
| Range | Titulo |
|-------|--------|
| 1-9 | Recruta da Liga da Velocidade |
| 10-19 | Novato do Laboratorio STAR |
| 20-29 | Iniciado na Forca de Aceleracao |
| 30-39 | Treinamento com STAR Labs |
| 40-49 | Wally West em Acao |
| 50-59 | Discipulo do Flash Reverso |
| 60-69 | Barry Allen Ascendido |
| 70-79 | Velocista Elite de Central City |
| 80-89 | Guardiao Multiversal |
| 90-99 | Mestre do Tempo |
| 100 | Lenda da Forca de Aceleracao |

### Regras de Level Up
- Notificacao visual/sonora ao subir de nivel
- Novas recompensas podem ser desbloqueadas por nivel
- Borda do avatar evolui a cada 5 niveis (20 tiers diferentes)

---

## 2.4 Sistema de Moedas (Gold)

### Economia
```
UserProgress {
  availableGold: number      // Saldo atual para gastar
  totalGoldEarned: number    // Total historico ganho
  totalGoldSpent: number     // Total historico gasto
}
```

### Formas de Ganhar Gold
1. **Completar tarefas**: Cada tarefa tem valor em Gold
2. **Completar quiz diario**: Bonus por performance
3. **Missao surpresa**: Bonus por performance
4. **Bonus de aniversario**: Gold especial na data
5. **Conquistas**: Algumas dao Gold como premio
6. **Ajuste manual do admin**: Admin pode adicionar/remover

### Formas de Gastar Gold
1. **Resgatar recompensas**: Cada recompensa tem custo em Gold

### Historico de Transacoes (GoldTransaction)
```
GoldTransaction {
  id: string
  userId: string
  amount: number             // Positivo = ganho, Negativo = gasto
  type: 'earned' | 'spent' | 'bonus' | 'penalty' | 'refund' | 'adjustment'
  source: 'task_completion' | 'reward_redemption' | 'daily_bonus' |
          'daily_penalty' | 'admin_adjustment' | 'birthday' | 'quiz' |
          'surprise_mission' | 'achievement' | 'redemption_refund'
  description: string
  relatedId?: string
  relatedTitle?: string
  balanceBefore: number
  balanceAfter: number
  createdAt: Date
}
```

---

## 2.5 Sistema de Recompensas

### Estrutura de Recompensa
```
Reward {
  id: string
  ownerId: string            // UID da crianca
  title: string              // Nome da recompensa
  description: string        // Descricao
  category: 'toy' | 'activity' | 'treat' | 'privilege' | 'custom'
  costGold: number           // Custo em Gold
  emoji: string              // Emoji representativo
  active: boolean            // Se esta disponivel
  requiredLevel: number      // Nivel minimo para desbloquear
}
```

### Categorias de Recompensa
| Categoria | Descricao | Exemplos |
|-----------|-----------|----------|
| toy | Brinquedos | Carrinho, boneco, LEGO |
| activity | Atividades | Cinema, parque, passeio |
| treat | Guloseimas | Sorvete, chocolate, pizza |
| privilege | Privilegios | Hora extra de video-game, dormir tarde |
| custom | Personalizado | Qualquer outra coisa |

### Fluxo de Resgate
```
RewardRedemption {
  id: string
  userId: string
  rewardId: string
  costGold: number
  status: 'pending' | 'approved' | 'rejected' | 'delivered'
  approvedBy?: string        // Admin que aprovou
}
```

1. Crianca solicita resgate (se tiver Gold e nivel suficiente)
2. Gold e debitado imediatamente
3. Status fica `pending`
4. Admin aprova/rejeita
5. Se rejeitado, Gold e estornado
6. Se aprovado, muda para `delivered` quando entregue

---

## 2.6 Sistema de Conquistas (Achievements)

### Estrutura de Conquista
```
Achievement {
  id: string
  ownerId: string
  title: string
  description: string
  icon: string               // Emoji
  type: 'xp' | 'level' | 'tasks' | 'checkin' | 'streak' | 'redemptions' | 'custom'
  target: number             // Meta (ex: 1000 para "Ganhe 1000 XP")
  xpReward: number           // XP bonus ao desbloquear
  goldReward: number         // Gold bonus ao desbloquear
  isActive: boolean
}
```

### Tipos de Conquista
| Tipo | Metrica Monitorada |
|------|-------------------|
| xp | totalXP |
| level | nivel atual |
| tasks | totalTasksCompleted |
| streak | streak (dias consecutivos) |
| checkin | streak atual |
| redemptions | rewardsRedeemed |
| custom | manual (admin define) |

### Progresso do Usuario
```
UserAchievement {
  id: string
  userId: string
  achievementId: string
  progress: number           // Progresso atual
  isCompleted: boolean       // Se atingiu a meta
  rewardClaimed: boolean     // Se ja resgatou o premio
  unlockedAt?: Date
  claimedAt?: Date
}
```

### Fluxo de Conquistas
1. Sistema monitora metricas do progress em tempo real
2. Quando metrica atinge target, marca `isCompleted = true`
3. Crianca pode clicar para "clamar" o premio
4. Ao clamar, adiciona XP e Gold do premio

---

## 2.7 Quiz Diario

### Funcionamento
- Quiz de conhecimentos gerais disponivel uma vez por dia
- Perguntas carregadas de arquivo JSON estatico
- Temas: Ingles, Matematica, Conhecimentos Gerais
- Recompensa em XP e Gold baseada na performance

### Controle
- Flag `quizEnabled` no progress controla se esta ativo
- Admin pode ativar/desativar pelo painel
- Completude salva em localStorage por dia

---

## 2.8 Missao Surpresa

### Configuracao (SurpriseMissionConfig)
```
SurpriseMissionConfig {
  id: string
  isEnabled: boolean
  theme: 'english' | 'math' | 'general' | 'mixed'
  difficulty: 'easy' | 'medium' | 'hard'
  xpReward: number
  goldReward: number
  questionsCount: number     // Fixo em 30
}
```

### Status Diario
```
DailySurpriseMissionStatus {
  id: string
  userId: string
  date: string               // YYYY-MM-DD
  completed: boolean
  score: number              // Acertos
  totalQuestions: number     // 30
  xpEarned: number
  goldEarned: number
}
```

### Regras
- Uma missao por dia
- 30 questoes
- Recompensa base + bonus por performance
- Admin configura tema e dificuldade

---

## 2.9 Sistema de Punicao

### Conceito
Modo especial ativado pelo admin quando a crianca precisa "recuperar" por mau comportamento.

### Estrutura (PunishmentMode)
```
PunishmentMode {
  id: string
  userId: string
  isActive: boolean
  startDate: Date
  endDate: Date              // 7 dias apos startDate
  tasksCompleted: number
  tasksRequired: number      // Sempre 30
  activatedBy: string        // Admin UID
  reason: string
  deactivatedAt?: Date
  deactivatedReason?: 'time_completed' | 'tasks_completed' | 'admin_override'
}
```

### Regras
1. **Duracao**: 7 dias OU completar 30 tarefas (o que vier primeiro)
2. **Tela Bloqueada**: Crianca so ve tela de punicao, nao pode acessar recompensas
3. **Contador Regressivo**: Mostra dias/horas/minutos restantes
4. **Progresso de Tarefas**: Mostra quantas faltam das 30
5. **Desativacao Automatica**: Quando tempo expira ou tarefas completadas

### Completar Tarefa em Punicao
```
PunishmentTaskCompletion {
  id: string
  punishmentId: string
  userId: string
  completedAt: Date
  taskNumber: number         // 1-30
  taskId: string
  taskTitle: string
}
```

---

## 2.10 Flash Reminders (Lembretes)

### Estrutura
```
FlashReminder {
  id: string
  ownerId: string
  title: string
  message: string
  icon: string
  color: 'red' | 'yellow' | 'blue' | 'green' | 'purple' | 'orange'
  priority: 'low' | 'medium' | 'high'
  active: boolean
  showOnDashboard: boolean
}
```

### Uso
- Admin cria lembretes que aparecem no dashboard da crianca
- Uteis para avisos importantes ("Prova amanha!", "Aniversario do vovo")
- Cores e prioridades para destacar importancia

---

## 2.11 Sistema de Aniversario

### Configuracao (BirthdayConfig)
```
BirthdayConfig {
  id: string
  userId: string
  birthdayDate: string       // MM-DD (ex: "09-18" para 18 de setembro)
  birthdayYear: number       // Ano de nascimento
  isEnabled: boolean
  specialXPBonus: number
  specialGoldBonus: number
}
```

### Evento (BirthdayEvent)
```
BirthdayEvent {
  id: string
  userId: string
  birthdayDate: string
  year: number               // Ano do aniversario
  age: number                // Idade completada
  specialRewards: string[]   // IDs de recompensas especiais
  celebrationCompleted: boolean
  specialMessage: string
}
```

### Fluxo
1. No dia do aniversario, modal especial aparece
2. Animacao de celebracao
3. Bonus de XP e Gold automaticos
4. Mensagem personalizada do admin

---

## 2.12 Notas do Admin

### Estrutura
```
Note {
  id: string
  ownerId: string            // Admin UID
  title: string
  content: string
  category?: 'general' | 'tasks' | 'rewards' | 'progress' | 'important'
  color?: string
  pinned: boolean
}
```

### Uso
- Admin pode criar notas para si mesmo
- Acompanhar ideias, observacoes sobre o filho
- Categorias para organizacao

---

## 2.13 Streak (Dias Consecutivos)

### Metricas
```
UserProgress {
  streak: number             // Dias consecutivos atual
  longestStreak: number      // Record historico
}
```

### Regras
- Streak incrementa quando completa pelo menos 1 tarefa no dia
- Streak zera se passar um dia sem completar nenhuma tarefa
- Sistema de bonus/penalidade diaria baseado no streak (opcional)

---

## 2.14 Notificacoes

### Estrutura
```
Notification {
  id: string
  toUserId: string
  title: string
  message: string
  type: 'reminder' | 'achievement' | 'reward' | 'general'
  sentAt: Date
  read: boolean
  readAt?: Date
}
```

### Tipos
- **reminder**: Lembretes de tarefas
- **achievement**: Conquista desbloqueada
- **reward**: Recompensa aprovada/entregue
- **general**: Mensagens gerais do admin

---

# 3. ARQUITETURA TECNICA

## 3.1 Stack Atual

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipagem estatica
- **Vite** - Bundler/Dev server
- **TailwindCSS** - Estilizacao
- **Framer Motion** - Animacoes
- **React Router DOM** - Roteamento
- **React Hot Toast** - Notificacoes toast
- **Lucide React** - Icones

### Backend/Database
- **Firebase Authentication** - Autenticacao
- **Firebase Firestore** - Banco de dados NoSQL
- **Firebase Cloud Messaging** - Push notifications (parcial)

### Hospedagem
- Build estatico (pode ser hospedado em qualquer CDN)

---

## 3.2 Estrutura de Dados (Colecoes Firestore)

### Colecao: `users`
```
Document ID: {userId}
{
  email: string
  displayName: string
  role: 'admin' | 'child'
  managedChildId?: string    // So para admin
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginTimestamp: Timestamp
}
```

### Colecao: `progress`
```
Document ID: {userId}
{
  userId: string
  level: number
  totalXP: number
  availableGold: number
  totalGoldEarned: number
  totalGoldSpent: number
  streak: number
  longestStreak: number
  rewardsRedeemed: number
  totalTasksCompleted: number
  lastActivityDate: Timestamp
  lastDailySummaryProcessedDate?: Timestamp
  quizEnabled?: boolean
  updatedAt: Timestamp
}
```

### Colecao: `tasks`
```
Document ID: auto-generated
{
  ownerId: string
  title: string
  description?: string
  xp: number
  gold: number
  period: string
  time?: string
  frequency: string
  active: boolean
  status: string
  lastCompletedDate?: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `rewards`
```
Document ID: auto-generated
{
  ownerId: string
  title: string
  description: string
  category: string
  costGold: number
  emoji: string
  active: boolean
  requiredLevel: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `redemptions`
```
Document ID: auto-generated
{
  userId: string
  rewardId: string
  costGold: number
  status: string
  approvedBy?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `achievements`
```
Document ID: auto-generated
{
  ownerId: string
  title: string
  description: string
  icon: string
  type: string
  target: number
  xpReward: number
  goldReward: number
  isActive: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `userAchievements`
```
Document ID: auto-generated
{
  userId: string
  achievementId: string
  progress: number
  isCompleted: boolean
  rewardClaimed: boolean
  unlockedAt?: Timestamp
  claimedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `flashReminders`
```
Document ID: auto-generated
{
  ownerId: string
  title: string
  message: string
  icon: string
  color: string
  priority: string
  active: boolean
  showOnDashboard: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `notifications`
```
Document ID: auto-generated
{
  toUserId: string
  title: string
  message: string
  type: string
  sentAt: Timestamp
  read: boolean
  readAt?: Timestamp
}
```

### Colecao: `surpriseMissionConfig`
```
Document ID: 'global' (singleton)
{
  isEnabled: boolean
  theme: string
  difficulty: string
  xpReward: number
  goldReward: number
  questionsCount: number
  lastUpdatedBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `dailySurpriseMissionStatus`
```
Document ID: auto-generated
{
  userId: string
  date: string
  completed: boolean
  score: number
  totalQuestions: number
  xpEarned: number
  goldEarned: number
  completedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `birthdayConfig`
```
Document ID: {userId}
{
  userId: string
  birthdayDate: string
  birthdayYear: number
  isEnabled: boolean
  specialXPBonus: number
  specialGoldBonus: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `birthdayEvents`
```
Document ID: auto-generated
{
  userId: string
  birthdayDate: string
  year: number
  age: number
  specialRewards: string[]
  celebrationCompleted: boolean
  celebrationCompletedAt?: Timestamp
  specialMessage: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `punishments`
```
Document ID: auto-generated
{
  userId: string
  isActive: boolean
  startDate: Timestamp
  endDate: Timestamp
  tasksCompleted: number
  tasksRequired: number
  activatedBy: string
  reason: string
  lastTaskCompletedAt?: Timestamp
  deactivatedAt?: Timestamp
  deactivatedReason?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Colecao: `punishmentTaskCompletions`
```
Document ID: auto-generated
{
  punishmentId: string
  userId: string
  completedAt: Timestamp
  taskNumber: number
  taskId: string
  taskTitle: string
}
```

### Colecao: `goldTransactions`
```
Document ID: auto-generated
{
  userId: string
  amount: number
  type: string
  source: string
  description: string
  relatedId?: string
  relatedTitle?: string
  metadata?: object
  balanceBefore: number
  balanceAfter: number
  createdAt: Timestamp
  createdBy?: string
}
```

### Colecao: `notes`
```
Document ID: auto-generated
{
  ownerId: string
  title: string
  content: string
  category?: string
  color?: string
  pinned: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## 3.3 Indices Firestore Necessarios

```
tasks: ownerId ASC, status ASC
tasks: ownerId ASC, active ASC, status ASC
rewards: ownerId ASC, active ASC
redemptions: userId ASC, createdAt DESC
notifications: toUserId ASC, read ASC, sentAt DESC
flashReminders: ownerId ASC, active ASC
achievements: ownerId ASC, isActive ASC
userAchievements: userId ASC, achievementId ASC
dailySurpriseMissionStatus: userId ASC, date DESC
punishments: userId ASC, isActive ASC
punishmentTaskCompletions: punishmentId ASC, taskNumber ASC
goldTransactions: userId ASC, createdAt DESC
notes: ownerId ASC, pinned DESC, createdAt DESC
```

---

## 3.4 Fluxo de Dados

### Real-time Listeners (onSnapshot)
Todas as colecoes principais usam listeners em tempo real:
- `tasks` - Atualiza lista quando admin adiciona/edita
- `rewards` - Atualiza quando admin modifica
- `progress` - Atualiza XP/Gold em tempo real
- `redemptions` - Atualiza status de resgates
- `notifications` - Novas notificacoes aparecem instantaneamente
- `flashReminders` - Lembretes aparecem/desaparecem
- `achievements` - Progresso atualiza em tempo real
- `userAchievements` - Conquistas desbloqueiam instantaneamente
- `punishments` - Modo punicao ativa/desativa em tempo real

### Timezone
- Sistema usa **GMT-3 (Brasilia)** para todas as datas
- Reset de tarefas acontece a meia-noite horario de Brasilia
- Funcoes utilitarias: `getTodayBrazil()`, `getTodayStartBrazil()`

---

# 4. FLUXOS DE USUARIO

## 4.1 Fluxo da Crianca

### Acesso Inicial
1. Abre app -> Tela de login
2. Faz login com email/senha
3. Sistema detecta role = 'child'
4. Redirect para `/flash` (HeroPanel)

### Dashboard Diario
1. Ve mensagem de boas-vindas personalizada
2. Ve barra de progresso do nivel atual
3. Ve resumo do dia (tarefas/XP/Gold)
4. Ve lembretes Flash ativos
5. Ve missao surpresa (se disponivel)
6. Ve conquistas proximas

### Completar Tarefa
1. Seleciona periodo (manha/tarde/noite)
2. Ve lista de tarefas do periodo
3. Clica em tarefa pendente
4. Animacao de conclusao
5. XP e Gold adicionados
6. Possivel level up
7. Possivel conquista desbloqueada

### Resgatar Recompensa
1. Clica no icone de recompensas
2. Ve lista de recompensas disponiveis
3. Recompensas bloqueadas mostram nivel necessario
4. Seleciona recompensa que tem Gold suficiente
5. Confirma resgate
6. Gold debitado
7. Aguarda aprovacao do pai

### Quiz Diario
1. Se habilitado, popup aparece
2. Responde perguntas
3. Ganha XP e Gold baseado em acertos
4. Marca como completado no dia

### Missao Surpresa
1. Se habilitada e nao completada hoje
2. Card especial aparece no dashboard
3. Clica para iniciar
4. 30 perguntas do tema configurado
5. Recompensa base + bonus por performance

---

## 4.2 Fluxo do Admin (Pai)

### Acesso Inicial
1. Abre app -> Tela de login
2. Faz login com email/senha
3. Sistema detecta role = 'admin'
4. Redirect para `/admin` (ParentPanel)

### Dashboard
1. Ve estatisticas gerais da crianca
2. Ve XP total, Gold, Nivel
3. Ve grafico de progresso
4. Ve tarefas do dia

### Gerenciar Tarefas
1. Ve lista de todas as tarefas
2. Pode criar nova tarefa (titulo, XP, Gold, periodo, frequencia)
3. Pode editar tarefa existente
4. Pode desativar/ativar tarefa
5. Pode deletar tarefa

### Gerenciar Recompensas
1. Ve lista de recompensas cadastradas
2. Pode criar nova (nome, descricao, custo Gold, nivel minimo)
3. Pode editar/desativar/deletar
4. Ve resgates pendentes
5. Pode aprovar/rejeitar resgates

### Gerenciar Conquistas
1. Ve lista de conquistas
2. Pode criar novas (tipo, meta, premio)
3. Ve progresso da crianca em cada uma

### Configurar Missao Surpresa
1. Ativa/desativa funcionalidade
2. Escolhe tema (ingles/matematica/geral/misto)
3. Escolhe dificuldade
4. Define recompensa base

### Ativar Punicao
1. Clica em "Ativar Modo Punicao"
2. Insere motivo
3. Confirma ativacao
4. Crianca fica em modo punicao por 7 dias ou 30 tarefas

### Configurar Aniversario
1. Define data de nascimento
2. Define bonus especiais
3. Define mensagem personalizada

### Ajustes Manuais
1. Pode adicionar/remover XP manualmente
2. Pode adicionar/remover Gold manualmente
3. Ve historico de transacoes

---

# 5. PONTOS DE MELHORIA E BUGS CONHECIDOS

## 5.1 Bugs Conhecidos

1. **Toggle de Quiz**: Estado visual as vezes nao atualiza imediatamente (corrigido recentemente)
2. **Listeners Duplicados**: Em alguns casos raros, listeners Firebase podem duplicar
3. **Cache de Quiz**: Usa localStorage, pode ter inconsistencia entre dispositivos

## 5.2 Limitacoes Tecnicas

1. **Single Child**: Sistema atual suporta apenas 1 crianca por admin
2. **Offline Limited**: Sem suporte robusto a modo offline
3. **Quiz Estatico**: Perguntas carregadas de JSON, nao dinamicas
4. **Sem Push Notifications Reais**: FCM configurado mas nao implementado completamente
5. **Sem Backup Automatico**: Dados dependem 100% do Firebase

## 5.3 Dividas Tecnicas

1. **Bundle Size**: Aplicacao grande (~1.5MB), precisa code-splitting
2. **Tipagem Incompleta**: Alguns `any` espalhados no codigo
3. **Testes**: Zero testes automatizados
4. **Documentacao no Codigo**: Comentarios escassos

## 5.4 Features Incompletas

1. **Multi-crianca**: Estrutura preparada mas nao implementada
2. **Relatorios PDF**: Mencionado mas nao existe
3. **Integracao com Calendario**: Apenas visualizacao basica
4. **Gamificacao Avancada**: Sem badges visuais, rankings, etc.

---

# 6. REQUISITOS PARA NOVA VERSAO

## 6.1 MANTER OBRIGATORIAMENTE

### Conceitos Core
- [x] Sistema de XP e Niveis com progressao clara
- [x] Sistema de Gold como moeda virtual
- [x] Tarefas divididas por periodo (manha/tarde/noite)
- [x] Reset automatico diario de tarefas
- [x] Recompensas reais que custam Gold
- [x] Fluxo de aprovacao de resgates pelo pai
- [x] Conquistas com metas e premios
- [x] Modo punicao com timer e contador de tarefas
- [x] Perfis separados: admin (pai) e child (crianca)

### Regras de Negocio
- [x] Tarefa so pode ser completada 1x por dia
- [x] Gold e debitado no momento do resgate (nao na aprovacao)
- [x] Punicao dura 7 dias OU 30 tarefas
- [x] Level up baseado em XP acumulado
- [x] Streak conta dias consecutivos com pelo menos 1 tarefa

### Dados Criticos
- [x] Historico de transacoes de Gold
- [x] Historico de tarefas completadas
- [x] Progresso de conquistas
- [x] Configuracoes de aniversario

## 6.2 MELHORAR/REPENSAR

### Arquitetura
- [ ] Suporte a multiplas criancas por familia
- [ ] Modo offline robusto com sync
- [ ] Push notifications funcionais
- [ ] Backup/export de dados

### Gamificacao
- [ ] Sistema de badges visuais
- [ ] Avatares customizaveis
- [ ] Ranking familiar (se multiplas criancas)
- [ ] Missoes semanais/mensais
- [ ] Eventos sazonais

### UX
- [ ] Onboarding guiado para novos usuarios
- [ ] Tutoriais interativos
- [ ] Feedback mais visual nas acoes
- [ ] Sons e haptics (mobile)

### Admin
- [ ] Dashboard com graficos mais ricos
- [ ] Relatorios exportaveis
- [ ] Templates de tarefas pre-definidos
- [ ] Sugestoes de recompensas por idade

## 6.3 SUGESTOES PARA MOBILE (SUPABASE)

### Banco de Dados (Supabase)
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'child')) NOT NULL,
  family_id UUID REFERENCES families(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Families (para multi-crianca)
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress
CREATE TABLE progress (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  available_gold INTEGER DEFAULT 0,
  total_gold_earned INTEGER DEFAULT 0,
  total_gold_spent INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  rewards_redeemed INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  last_activity_date DATE,
  quiz_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp INTEGER NOT NULL,
  gold INTEGER NOT NULL,
  period TEXT CHECK (period IN ('morning', 'afternoon', 'evening')) NOT NULL,
  scheduled_time TIME,
  frequency TEXT CHECK (frequency IN ('daily', 'weekday', 'weekend')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  status TEXT CHECK (status IN ('pending', 'done')) DEFAULT 'pending',
  last_completed_date DATE,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('toy', 'activity', 'treat', 'privilege', 'custom')),
  cost_gold INTEGER NOT NULL,
  emoji TEXT,
  is_active BOOLEAN DEFAULT true,
  required_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redemptions
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  reward_id UUID REFERENCES rewards(id) NOT NULL,
  cost_gold INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'delivered')) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  type TEXT CHECK (type IN ('xp', 'level', 'tasks', 'checkin', 'streak', 'redemptions', 'custom')),
  target INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  gold_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  achievement_id UUID REFERENCES achievements(id) NOT NULL,
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  reward_claimed BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Punishments
CREATE TABLE punishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_required INTEGER DEFAULT 30,
  activated_by UUID REFERENCES users(id) NOT NULL,
  reason TEXT,
  deactivated_at TIMESTAMPTZ,
  deactivated_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gold Transactions
CREATE TABLE gold_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT CHECK (type IN ('earned', 'spent', 'bonus', 'penalty', 'refund', 'adjustment')),
  source TEXT NOT NULL,
  description TEXT,
  related_id UUID,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies Sugeridas
```sql
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins can read children in their family
CREATE POLICY "Admins can read family members" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users admin
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.family_id = users.family_id
    )
  );

-- Similar policies for other tables...
```

### Real-time com Supabase
```typescript
// Subscription para tarefas
const subscription = supabase
  .channel('tasks')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `owner_id=eq.${userId}`
  }, (payload) => {
    // Atualizar estado local
  })
  .subscribe();
```

### Edge Functions Sugeridas
1. **reset-daily-tasks**: Roda via CRON a meia-noite GMT-3
2. **check-achievements**: Chamada apos cada acao que pode desbloquear
3. **process-punishment**: Verifica expiracao de punicoes
4. **birthday-check**: Verifica aniversarios diariamente

---

# 7. RESUMO EXECUTIVO

## O que e o Flash Missions
App de gamificacao para criancas cumprirem rotinas diarias, inspirado no Flash. Pai configura tarefas, crianca completa e ganha XP/Gold, troca por recompensas reais.

## Metricas-chave
- XP (experiencia) -> Determina nivel
- Gold (moeda) -> Compra recompensas
- Streak (dias consecutivos) -> Bonus/conquistas
- Tarefas completadas -> Progresso diario

## Diferenciais
- Tematica de super-heroi engajante
- Sistema de punicao educativo (nao punitivo demais)
- Aprovacao parental para recompensas
- Conquistas com metas claras

## Para reconstruir
1. Implementar autenticacao com 2 roles
2. Criar CRUD de tarefas com reset diario
3. Implementar economia de Gold
4. Criar sistema de niveis baseado em XP
5. Adicionar recompensas com fluxo de aprovacao
6. Implementar conquistas com tracking automatico
7. Adicionar modo punicao como feature especial
8. Real-time updates em todas as telas

---

*Documento gerado em: Janeiro 2025*
*Versao: 1.0*
