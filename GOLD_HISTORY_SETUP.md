# 💰 Histórico de Gold - Guia de Configuração

## 🎯 Visão Geral

O sistema de histórico de Gold foi completamente reformulado para rastrear **todas as transações de gold** de forma detalhada e organizada. Cada alteração de gold agora é registrada como uma transação individual com informações completas.

## 🔧 Configuração do Firestore

### 1. Criar a Coleção `goldTransactions`

Acesse o Firebase Console e crie a coleção **`goldTransactions`** com a seguinte estrutura:

```javascript
{
  userId: string,              // UID do usuário filho
  amount: number,              // Quantidade de gold (positivo = ganho, negativo = gasto)
  type: string,                // 'earned' | 'spent' | 'bonus' | 'penalty' | 'refund' | 'adjustment'
  source: string,              // 'task_completion' | 'reward_redemption' | 'daily_bonus' | 'daily_penalty' | 'admin_adjustment' | etc.
  description: string,         // Descrição legível da transação
  relatedId: string,           // ID do item relacionado (taskId, rewardId, etc.) - OPCIONAL
  relatedTitle: string,        // Título do item relacionado - OPCIONAL
  metadata: object,            // Informações adicionais contextuais - OPCIONAL
  balanceBefore: number,       // Saldo de gold antes da transação
  balanceAfter: number,        // Saldo de gold depois da transação
  createdAt: timestamp,        // Data e hora da transação
  createdBy: string            // UID do admin (para ajustes manuais) - OPCIONAL
}
```

### 2. Criar Índices Compostos

No Firebase Console, vá em **Firestore Database > Indexes** e crie os seguintes índices:

#### Índice 1: Listar transações por usuário ordenadas por data
```
Collection: goldTransactions
Fields:
  - userId (Ascending)
  - createdAt (Descending)
```

#### Índice 2: Filtrar por usuário e tipo
```
Collection: goldTransactions
Fields:
  - userId (Ascending)
  - type (Ascending)
  - createdAt (Descending)
```

#### Índice 3: Filtrar por usuário e origem
```
Collection: goldTransactions
Fields:
  - userId (Ascending)
  - source (Ascending)
  - createdAt (Descending)
```

### 3. Configurar Regras de Segurança

Adicione as seguintes regras ao `firestore.rules`:

```javascript
// Transações de Gold
match /goldTransactions/{transactionId} {
  // Admins podem ler todas as transações do filho gerenciado
  allow read: if isAdmin() &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.managedChildId == resource.data.userId;

  // Crianças podem ler suas próprias transações
  allow read: if isChild() && resource.data.userId == request.auth.uid;

  // Apenas o sistema pode criar/atualizar transações (através de Cloud Functions ou aplicação)
  // Para ajustes manuais, use a função adjustGoldManually do FirestoreService
  allow write: if false;
}
```

## 📊 Funcionalidades Implementadas

### 1. Registro Automático de Transações

Todas as seguintes ações agora registram transações automaticamente:

- ✅ **Conclusão de Tarefas**: Registra gold ganho de cada tarefa
- ✅ **Resgate de Recompensas**: Registra gold gasto em recompensas
- ✅ **Rejeição de Resgates**: Registra reembolso de gold
- ✅ **Bônus Diários**: Registra gold ganho por completar todas as tarefas
- ✅ **Penalidades Diárias**: Registra gold perdido por tarefas incompletas

### 2. Componente GoldHistory

Novo componente completo localizado em:
```
src/components/parent/GoldHistory.tsx
```

**Recursos do componente:**
- 📅 Filtros por período (hoje, 7 dias, 30 dias, todos)
- 🏷️ Filtros por tipo de transação (ganhos, gastos, bônus, penalidades, etc.)
- 📍 Filtros por origem (tarefas, recompensas, conquistas, etc.)
- 📊 Cards de estatísticas com totais de ganhos, gastos e saldo líquido
- 📝 Lista detalhada de todas as transações com:
  - Ícone específico por tipo de origem
  - Descrição completa da transação
  - Item relacionado (tarefa, recompensa, etc.)
  - Data e hora exata
  - Valores de saldo antes e depois
- ⚙️ Ferramenta de ajuste manual de gold com motivo obrigatório
- 🎨 Interface visual com cores diferenciadas para ganhos (verde) e gastos (vermelho)
- 🔄 Atualização em tempo real via listeners do Firestore

### 3. Integração no Painel Administrativo

O novo componente substitui o `DailyRewardsHistory` na aba **"Histórico Gold"** do painel administrativo.

Para acessar:
1. Faça login como admin
2. Navegue até a aba **"Histórico Gold" (💰)**
3. Use os filtros para explorar as transações

## 🛠️ Ferramentas Administrativas

### Ajuste Manual de Gold

Admins podem adicionar ou remover gold manualmente através da interface:

1. Clique no botão **"Ajustar Gold"** no canto superior direito
2. Insira o valor (use `+` para adicionar, `-` para remover)
3. Forneça um motivo obrigatório para o ajuste
4. Confirme a operação

**Exemplo:**
- Valor: `+50`
- Motivo: "Recompensa especial por bom comportamento na escola"

Todos os ajustes manuais são registrados no histórico com o UID do admin que realizou a ação.

## 📈 Visualização de Estatísticas

O novo sistema fornece três cards de estatísticas principais:

### 1. Total Ganho
- Soma de todo gold positivo no período filtrado
- Cor verde indicando ganhos
- Ícone de seta para cima

### 2. Total Gasto
- Soma de todo gold negativo no período filtrado
- Cor vermelha indicando gastos
- Ícone de seta para baixo

### 3. Saldo Líquido
- Diferença entre ganhos e gastos
- Cor azul para saldo positivo, laranja para negativo
- Mostra a tendência geral no período

## 🔍 Tipos de Transação

### Tipos (`type`)
- `earned`: Gold ganho (tarefas, conquistas, etc.)
- `spent`: Gold gasto (resgates de recompensas)
- `bonus`: Bônus especiais (completar todas as tarefas)
- `penalty`: Penalidades (tarefas não concluídas)
- `refund`: Reembolso (resgate rejeitado)
- `adjustment`: Ajuste manual do admin

### Origens (`source`)
- `task_completion`: Conclusão de tarefa
- `reward_redemption`: Resgate de recompensa
- `daily_bonus`: Bônus diário
- `daily_penalty`: Penalidade diária
- `redemption_refund`: Reembolso de resgate
- `admin_adjustment`: Ajuste manual do admin
- `achievement`: Conquista desbloqueada
- `quiz`: Quiz completado
- `surprise_mission`: Missão surpresa
- `birthday`: Aniversário

## 🚀 Próximos Passos

### Após Configurar o Firestore:

1. ✅ **Teste o Sistema**
   - Complete uma tarefa e verifique se a transação foi registrada
   - Resgate uma recompensa e confirme o registro
   - Teste os filtros no histórico

2. ✅ **Verifique os Índices**
   - Acesse transações filtradas para verificar se os índices estão funcionando
   - Se aparecer erro de índice, clique no link fornecido pelo Firebase para criar automaticamente

3. ✅ **Teste Ajustes Manuais**
   - Use a ferramenta de ajuste manual
   - Confirme que o histórico mostra o ajuste com o motivo fornecido

## 📝 Notas Importantes

### Retrocompatibilidade
- O sistema antigo (`DailyRewardsHistory`) ainda existe no código, mas não é mais usado
- Transações antigas não serão exibidas automaticamente - apenas novas transações a partir da implementação
- Para importar histórico antigo, seria necessário um script de migração (não implementado)

### Desempenho
- O listener de tempo real é limitado a 100 transações mais recentes
- Para períodos longos, use os filtros para reduzir o conjunto de dados
- Os cálculos de estatísticas são realizados no cliente após carregar os dados

### Segurança
- Transações não podem ser editadas ou excluídas manualmente
- Apenas admins podem ver o histórico completo de transações
- Ajustes manuais requerem autenticação e são auditados

## 🎉 Conclusão

O novo sistema de histórico de Gold oferece:
- ✅ Rastreamento completo e detalhado de todas as transações
- ✅ Interface visual intuitiva e organizada
- ✅ Filtros poderosos para análise de dados
- ✅ Estatísticas em tempo real
- ✅ Ferramentas administrativas seguras
- ✅ Auditoria completa de ajustes manuais

O painel administrativo agora tem visibilidade total de todas as movimentações de gold do usuário!
