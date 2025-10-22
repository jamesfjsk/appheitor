# ⚡ Setup Rápido do Firebase - Histórico de Gold

## 🎯 O que você precisa fazer

Siga estes 3 passos simples:

---

## 📝 PASSO 1: Copiar Regras do Firestore

1. Abra o arquivo **`firestore.rules.gold`** na raiz do projeto
2. **COPIE TODO O CONTEÚDO** do arquivo
3. Acesse o [Firebase Console](https://console.firebase.google.com/)
4. Selecione seu projeto
5. Vá em **Firestore Database** > **Rules** (Regras)
6. **COLE** o conteúdo copiado, substituindo as regras antigas
7. Clique em **"Publicar"** ou **"Publish"**

✅ **Pronto!** As regras de segurança estão configuradas.

---

## 🔧 PASSO 2: Criar Índices Compostos

**Opção A: Links Diretos (RECOMENDADO)**

Clique nos links abaixo para criar os índices automaticamente:

### Índice 1: Transações por usuário e data
```
https://console.firebase.google.com/project/SEU_PROJETO_ID/firestore/indexes?create_composite=Clxnb2xkVHJhbnNhY3Rpb25zEAEaCgoGdXNlcklkEAEaDAoIY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg
```

**Substitua `SEU_PROJETO_ID` pelo ID do seu projeto Firebase**

### Índice 2: Transações por usuário, tipo e data
```
https://console.firebase.google.com/project/SEU_PROJETO_ID/firestore/indexes?create_composite=ClJnb2xkVHJhbnNhY3Rpb25zEAEaCgoGdXNlcklkEAEaCgoEdHlwZRABGgwKCGNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI
```

### Índice 3: Transações por usuário, origem e data
```
https://console.firebase.google.com/project/SEU_PROJETO_ID/firestore/indexes?create_composite=ClRnb2xkVHJhbnNhY3Rpb25zEAEaCgoGdXNlcklkEAEaDAoGc291cmNlEAEaDAoIY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg
```

**Opção B: Criar Manualmente**

Se os links não funcionarem, crie manualmente no Firebase Console:

1. Vá em **Firestore Database** > **Indexes** (Índices)
2. Clique em **"Create Index"** ou **"Criar Índice"**

**Índice 1:**
- Collection: `goldTransactions`
- Fields:
  - `userId` → Ascending
  - `createdAt` → Descending

**Índice 2:**
- Collection: `goldTransactions`
- Fields:
  - `userId` → Ascending
  - `type` → Ascending
  - `createdAt` → Descending

**Índice 3:**
- Collection: `goldTransactions`
- Fields:
  - `userId` → Ascending
  - `source` → Ascending
  - `createdAt` → Descending

✅ **Pronto!** Os índices estão criados (podem levar alguns minutos para ficar prontos).

---

## 🚀 PASSO 3: Executar Migração de Dados

1. **Faça login** no painel administrativo da aplicação
2. Vá até a aba **"Histórico Gold" (💰)**
3. Você verá um card roxo no topo chamado **"Migração de Dados Históricos"**
4. Clique em **"Verificar Status"** para ver quantas transações já existem
5. Clique em **"Executar Migração"** para importar todo o histórico
6. Aguarde alguns segundos/minutos dependendo da quantidade de dados
7. ✅ Você verá uma mensagem de sucesso com quantas transações foram criadas!

**Exemplo de mensagem de sucesso:**
```
✅ Migração concluída! 347 transações criadas.
```

---

## 🎉 Pronto! Sistema Configurado

Após completar os 3 passos, você terá:

- ✅ Regras de segurança configuradas
- ✅ Índices otimizados para consultas rápidas
- ✅ Todo o histórico de gold migrado
- ✅ Novo histórico completo funcionando!

---

## 📊 Testando o Sistema

1. Vá até **"Histórico Gold"** no painel administrativo
2. Você verá todas as transações listadas com:
   - Descrição completa
   - Data e hora
   - Valores antes e depois
   - Origem (tarefa, recompensa, etc.)
3. Use os filtros para explorar:
   - Por período (hoje, 7 dias, 30 dias)
   - Por tipo (ganhos, gastos, bônus)
   - Por origem (tarefas, recompensas, etc.)
4. Veja as estatísticas no topo:
   - Total ganho
   - Total gasto
   - Saldo líquido

---

## ⚙️ Ajuste Manual de Gold

Se precisar adicionar ou remover gold manualmente:

1. No **"Histórico Gold"**, clique em **"Ajustar Gold"** no canto superior direito
2. Digite o valor:
   - Números positivos para adicionar: `+50`
   - Números negativos para remover: `-30`
3. Forneça um motivo obrigatório
4. Confirme

O ajuste será registrado no histórico com seu nome de admin!

---

## 🔍 Verificação de Problemas

Se algo não funcionar:

### Erro ao carregar transações
- Verifique se os índices foram criados corretamente
- Aguarde alguns minutos (índices levam tempo para ficar prontos)

### Transações não aparecem
- Execute a migração (Passo 3)
- Verifique se as regras do Firestore foram publicadas

### Erro de permissão
- Confirme que você está logado como admin
- Verifique as regras do Firestore (Passo 1)

---

## 📞 Dúvidas?

Se tiver problemas, verifique:
1. Console do navegador (F12) para mensagens de erro
2. Firebase Console > Firestore > Indexes para status dos índices
3. Firebase Console > Firestore > Rules para conferir as regras publicadas

---

## 🎊 Recursos do Novo Sistema

- 📊 Histórico completo de todas as transações
- 🔍 Filtros avançados por período, tipo e origem
- 📈 Estatísticas visuais em tempo real
- ⚙️ Ajuste manual com auditoria
- 🎨 Interface bonita e organizada
- 🔄 Atualização automática em tempo real
- 💾 Dados persistidos de forma segura

**Aproveite o novo sistema de histórico de Gold!** 💰✨
