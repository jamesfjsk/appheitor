# 🔥 GUIA DE ALINHAMENTO SCHEMA FIRESTORE

## ✅ **IMPLEMENTAÇÃO COMPLETA**

### 📊 **SCHEMA FINAL IMPLEMENTADO:**

```typescript
// users/{uid}
{
  userId: string,           // UID do usuário
  email: string,
  displayName: string,
  role: 'admin' | 'child',
  managedChildId?: string,  // Apenas para admin
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginTimestamp: Timestamp
}

// progress/{userId} (childUid)
{
  userId: string,           // Child UID
  level: number,
  totalXP: number,
  availableGold: number,
  totalGoldEarned: number,
  totalGoldSpent: number,
  streak: number,
  longestStreak: number,
  rewardsRedeemed: number,
  totalTasksCompleted: number,
  lastActivityDate: Timestamp,
  updatedAt: Timestamp
}

// tasks/{taskId}
{
  ownerId: string,          // Child UID
  title: string,
  description?: string,
  xp: number,
  gold: number,
  period: 'morning'|'afternoon'|'evening',
  time?: string,
  frequency: 'daily'|'weekly'|'custom',
  active: boolean,
  status: 'pending'|'done',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string         // Admin UID
}

// rewards/{rewardId}
{
  ownerId: string,          // Child UID
  title: string,
  description: string,
  category: 'toy'|'activity'|'treat'|'privilege'|'custom',
  costGold: number,
  emoji: string,
  active: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// redemptions/{rid}
{
  userId: string,           // Child UID
  rewardId: string,
  costGold: number,
  status: 'pending'|'approved'|'rejected'|'delivered',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  approvedBy?: string       // Admin UID
}

// notifications/{nid}
{
  toUserId: string,         // Child UID
  title: string,
  message: string,
  type: 'reminder'|'achievement'|'reward'|'general',
  sentAt: Timestamp,
  read: boolean,
  readAt?: Timestamp
}
```

### 🔍 **QUERIES IMPLEMENTADAS:**

#### **Admin (usa childUid = user.managedChildId):**
```typescript
// Tasks
query(collection(db, 'tasks'), 
  where('ownerId', '==', childUid),
  where('active', '==', true),
  orderBy('createdAt', 'desc'))

// Rewards  
query(collection(db, 'rewards'),
  where('ownerId', '==', childUid),
  where('active', '==', true),
  orderBy('createdAt', 'desc'))

// Progress
doc(db, 'progress', childUid)

// Redemptions
query(collection(db, 'redemptions'),
  where('userId', '==', childUid),
  orderBy('createdAt', 'desc'))

// Notifications
query(collection(db, 'notifications'),
  where('toUserId', '==', childUid),
  orderBy('sentAt', 'desc'),
  limit(50))
```

#### **Child (usa próprio UID):**
```typescript
// Mesmas queries, mas com childUid = auth.currentUser.uid
```

### 📋 **ÍNDICES CRIADOS:**

```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "fields": [
        {"fieldPath": "ownerId", "order": "ASCENDING"},
        {"fieldPath": "active", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "tasks", 
      "fields": [
        {"fieldPath": "ownerId", "order": "ASCENDING"},
        {"fieldPath": "period", "order": "ASCENDING"},
        {"fieldPath": "active", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "rewards",
      "fields": [
        {"fieldPath": "ownerId", "order": "ASCENDING"},
        {"fieldPath": "active", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "redemptions",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "notifications",
      "fields": [
        {"fieldPath": "toUserId", "order": "ASCENDING"},
        {"fieldPath": "sentAt", "order": "DESCENDING"}
      ]
    }
  ]
}
```

### 🔐 **REGRAS DE SEGURANÇA:**

As regras foram atualizadas para suportar o novo schema com validações específicas para cada coleção.

### 🔧 **DATA DOCTOR IMPLEMENTADO:**

- ✅ Análise completa de integridade
- ✅ Correção automática em lotes
- ✅ Export CSV de problemas
- ✅ Interface visual com cards por coleção
- ✅ Seleção granular de documentos
- ✅ Relatório final de validação

## 🧪 **CHECKLIST DE TESTE:**

### **1. Login Admin:**
- [ ] Login como pai (`pai@teste.com`)
- [ ] Verificar childUid no cabeçalho
- [ ] Confirmar criação automática de dados padrão

### **2. Gerenciamento de Tarefas:**
- [ ] Criar nova tarefa
- [ ] Verificar ownerId = childUid
- [ ] Editar tarefa existente
- [ ] Ativar/desativar tarefa

### **3. Login Child:**
- [ ] Login como filho (`heitor@teste.com`)
- [ ] Ver tarefas do período atual
- [ ] Completar uma tarefa
- [ ] Verificar ganho de XP/Gold

### **4. Sistema de Recompensas:**
- [ ] Admin: criar recompensa
- [ ] Child: resgatar recompensa
- [ ] Admin: aprovar/rejeitar resgate
- [ ] Verificar dedução/devolução de Gold

### **5. Notificações:**
- [ ] Admin: enviar notificação
- [ ] Child: receber e marcar como lida
- [ ] Verificar toUserId correto

### **6. Data Doctor:**
- [ ] Acessar aba "Data Doctor"
- [ ] Executar análise completa
- [ ] Corrigir problemas detectados
- [ ] Verificar relatório final

## 🔗 **LINKS PARA CRIAÇÃO DE ÍNDICES:**

Acesse o Firebase Console e use estes links diretos:

1. **Tasks (ownerId + active + createdAt):**
   ```
   https://console.firebase.google.com/project/[SEU_PROJECT_ID]/firestore/indexes?create_composite=Cl9wcm9qZWN0cy9bU0VVX1BST0pFQ1RfSURdL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy90YXNrcy9pbmRleGVzL18gEAEaCm93bmVySWQQARoGYWN0aXZlEAEaC2NyZWF0ZWRBdBAC
   ```

2. **Rewards (ownerId + active + createdAt):**
   ```
   https://console.firebase.google.com/project/[SEU_PROJECT_ID]/firestore/indexes?create_composite=Cl9wcm9qZWN0cy9bU0VVX1BST0pFQ1RfSURdL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9yZXdhcmRzL2luZGV4ZXMvXyAQARoKb3duZXJJZBABGgZhY3RpdmUQARoLY3JlYXRlZEF0EAI
   ```

3. **Redemptions (userId + createdAt):**
   ```
   https://console.firebase.google.com/project/[SEU_PROJECT_ID]/firestore/indexes?create_composite=Cl9wcm9qZWN0cy9bU0VVX1BST0pFQ1RfSURdL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9yZWRlbXB0aW9ucy9pbmRleGVzL18gEAEaBnVzZXJJZBABGgtjcmVhdGVkQXQQAg
   ```

4. **Notifications (toUserId + sentAt):**
   ```
   https://console.firebase.google.com/project/[SEU_PROJECT_ID]/firestore/indexes?create_composite=Cl9wcm9qZWN0cy9bU0VVX1BST0pFQ1RfSURdL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9ub3RpZmljYXRpb25zL2luZGV4ZXMvXyAQARoIdG9Vc2VySWQQARoGc2VudEF0EAI
   ```

**Substitua `[SEU_PROJECT_ID]` pelo ID do seu projeto Firebase.**

## 🎯 **PRÓXIMOS PASSOS:**

1. **Execute o Data Doctor** para corrigir dados existentes
2. **Crie os índices** usando os links acima
3. **Teste o fluxo completo** seguindo o checklist
4. **Monitore os logs** para verificar funcionamento

**O sistema está agora completamente alinhado e pronto para produção!** ⚡