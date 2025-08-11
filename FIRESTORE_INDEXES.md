# 📊 Índices Firestore Necessários - Flash Missions

## Índices Compostos Obrigatórios

### 1. Tasks Collection
```
Collection: tasks
Fields: userId (Ascending), createdAt (Descending)
```

### 2. Rewards Collection  
```
Collection: rewards
Fields: userId (Ascending), createdAt (Descending)
```

### 3. Redemptions Collection
```
Collection: redemptions
Fields: userId (Ascending), createdAt (Descending)
```

## Como Criar os Índices

### Opção 1: Firebase Console (Recomendado)
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Firestore Database** > **Índices**
3. Clique em **Criar índice**
4. Configure cada índice conforme especificado acima

### Opção 2: Automático via Erro
1. Execute a aplicação
2. Os erros de índice aparecerão no console com links diretos
3. Clique nos links para criar automaticamente

### Opção 3: Firebase CLI
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar projeto
firebase init firestore

# Deploy índices (se configurados no firestore.indexes.json)
firebase deploy --only firestore:indexes
```

## Verificação
Após criar os índices:
1. Aguarde 2-5 minutos para propagação
2. Recarregue a aplicação
3. Verifique se não há mais erros de índice no console

## Status dos Índices
- ✅ **Single Field**: Criados automaticamente pelo Firestore
- ⚠️ **Composite**: Precisam ser criados manualmente (listados acima)

## Observações
- Índices são específicos por projeto Firebase
- Não afetam a funcionalidade, apenas a performance
- Obrigatórios para queries com `where` + `orderBy`