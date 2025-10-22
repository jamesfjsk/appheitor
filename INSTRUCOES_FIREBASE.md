# 🔥 Configuração Firebase - 3 Passos Simples

## ⚡ Passo 1: Atualizar Regras do Firestore

### O que fazer:
1. Abra o arquivo **`firestore.rules.gold`** (está na raiz do projeto)
2. Copie TODO o conteúdo
3. Acesse: https://console.firebase.google.com/
4. Selecione seu projeto
5. Clique em **Firestore Database** (menu lateral)
6. Clique em **Rules** (Regras)
7. Cole o conteúdo copiado (substitua tudo)
8. Clique em **Publish** (Publicar)

### ✅ Pronto! Passo 1 completo.

---

## 🔧 Passo 2: Criar Índices

### O que fazer:
1. Ainda no Firebase Console
2. Vá em **Firestore Database** > **Indexes**
3. Clique em **Create Index** (3 vezes - um para cada índice)

### Índice 1:
- Collection ID: `goldTransactions`
- Field 1: `userId` → Ascending
- Field 2: `createdAt` → Descending
- Clique em **Create**

### Índice 2:
- Collection ID: `goldTransactions`
- Field 1: `userId` → Ascending
- Field 2: `type` → Ascending
- Field 3: `createdAt` → Descending
- Clique em **Create**

### Índice 3:
- Collection ID: `goldTransactions`
- Field 1: `userId` → Ascending
- Field 2: `source` → Ascending
- Field 3: `createdAt` → Descending
- Clique em **Create**

**Nota:** Os índices podem levar 2-5 minutos para ficar prontos.

### ✅ Pronto! Passo 2 completo.

---

## 🚀 Passo 3: Migrar Dados Históricos

### O que fazer:
1. Abra sua aplicação
2. Faça login como **admin**
3. Vá na aba **"Histórico Gold"** (ícone 💰)
4. Você verá um card roxo/azul no topo: **"Migração de Dados Históricos"**
5. Clique no botão **"Verificar Status"** (opcional - para ver o status atual)
6. Clique no botão **"Executar Migração"**
7. Confirme quando perguntar
8. Aguarde (pode levar 1-3 minutos)
9. Você verá: "✅ Migração concluída! X transações criadas."

### ✅ Pronto! Passo 3 completo.

---

## 🎉 TUDO PRONTO!

Agora você tem:
- ✅ Sistema de histórico de Gold completo funcionando
- ✅ Todas as transações antigas importadas
- ✅ Filtros avançados para análise
- ✅ Estatísticas visuais em tempo real
- ✅ Ferramenta de ajuste manual

---

## 📊 Como Usar o Novo Histórico

### Visualizar Transações:
- Vá em **"Histórico Gold"** no painel admin
- Veja todas as transações listadas com detalhes completos

### Filtrar Dados:
- **Por Período:** Hoje, 7 dias, 30 dias ou todos
- **Por Tipo:** Ganhos, Gastos, Bônus, Penalidades
- **Por Origem:** Tarefas, Recompensas, Conquistas, etc.

### Ver Estatísticas:
- **Total Ganho:** Quanto gold foi ganho no período
- **Total Gasto:** Quanto gold foi gasto no período
- **Saldo Líquido:** Diferença entre ganhos e gastos

### Ajustar Gold Manualmente:
1. Clique em **"Ajustar Gold"** (botão roxo no topo direito)
2. Digite o valor: `+50` para adicionar, `-30` para remover
3. Escreva o motivo (obrigatório)
4. Confirme

**O ajuste será registrado no histórico!**

---

## 🆘 Problemas Comuns

### "Erro ao carregar transações"
→ Aguarde 5 minutos (os índices estão sendo criados)

### "Nenhuma transação encontrada"
→ Execute a migração (Passo 3)

### "Permissão negada"
→ Verifique se publicou as regras (Passo 1)

---

## 🎯 Resumo Visual

```
Firebase Console
    ↓
1. Firestore Database → Rules → Colar → Publish
    ↓
2. Firestore Database → Indexes → Create (3x)
    ↓
3. Aplicação → Login Admin → Histórico Gold → Executar Migração
    ↓
   ✅ PRONTO!
```

---

## 💡 Dica Final

Depois de migrar, complete uma tarefa nova ou resgate uma recompensa para ver o sistema funcionando em tempo real. Cada ação agora é registrada automaticamente no histórico! 🎊
