# 🔧 Debug do Modo Punição - Persistência no Firestore

## Problema Identificado

O modo punição está funcionando apenas localmente (no navegador) mas não está sendo persistido no Firestore. Ao limpar cache ou acessar de outro navegador, a punição desaparece.

## Causas Possíveis

### 1. **Regras de Segurança do Firestore Não Atualizadas**

As regras de segurança foram adicionadas ao arquivo `firestore.rules`, mas **PRECISAM SER DEPLOYADAS** para o Firebase.

**Status:** As regras estão no arquivo local mas podem não estar no servidor Firebase.

### 2. **Usuário Não Configurado Como Admin**

O sistema verifica se o usuário tem `role: 'admin'` no documento `users/{uid}` do Firestore.

## ✅ Checklist de Verificação

### Passo 1: Deploy das Regras do Firestore

Execute o comando para fazer deploy das regras:

```bash
firebase deploy --only firestore:rules
```

**Ou** se estiver usando npm scripts:

```bash
npm run firebase deploy -- --only firestore:rules
```

### Passo 2: Verificar se Usuário é Admin

1. Abra o Console do Firebase: https://console.firebase.google.com
2. Vá em **Firestore Database**
3. Navegue até a coleção `users`
4. Encontre o documento do seu usuário (use o UID do usuário logado)
5. Verifique se o campo `role` existe e está definido como `"admin"`

**Se o campo `role` não existir ou for diferente de `"admin"`, adicione/edite:**

```json
{
  "role": "admin",
  "email": "seu-email@exemplo.com",
  "displayName": "Seu Nome",
  // outros campos...
}
```

### Passo 3: Verificar Console do Navegador

1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Tente ativar o modo punição
4. Observe os logs detalhados:

**Logs Esperados (SUCESSO):**
```
🔄 AdminControls: Requesting punishment activation... {childUid: "...", adminUid: "..."}
🔄 FirestoreService: Activating punishment mode... {userId: "...", adminUid: "...", reason: "..."}
📊 FirestoreService: Found existing active punishments: 0
💾 FirestoreService: Saving punishment data to Firestore... xyz123
✅ FirestoreService: Punishment mode activated successfully: xyz123
✅ AdminControls: Punishment activated successfully! xyz123
```

**Logs de ERRO (Permission Denied):**
```
❌ AdminControls: Error activating punishment: FirebaseError: Missing or insufficient permissions
Error code: permission-denied
```

**Logs de ERRO (Network):**
```
❌ AdminControls: Error activating punishment: FirebaseError: Failed to fetch
Error code: unavailable
```

### Passo 4: Verificar no Firebase Console se os Dados Foram Salvos

1. Abra o Console do Firebase
2. Vá em **Firestore Database**
3. Procure pela coleção `punishmentMode`
4. Verifique se existem documentos com:
   - `userId`: UID da criança
   - `isActive`: true
   - `startDate`, `endDate`, etc.

Se a coleção `punishmentMode` **NÃO EXISTIR** ou estiver **VAZIA**, o problema é de permissão.

## 🔐 Regras de Segurança Necessárias

As seguintes regras foram adicionadas ao `firestore.rules`:

```javascript
// ---------- PUNISHMENT MODE ----------
match /punishmentMode/{punishmentId} {
  // Admin pode ler tudo; criança só pode ler sua própria punição
  allow read: if signedIn() && (isAdmin() || resource.data.userId == request.auth.uid);

  // Apenas admin pode criar punições
  allow create: if signedIn() && isAdmin();

  // Apenas admin pode atualizar punições
  allow update: if signedIn() && isAdmin();

  // Apenas admin pode deletar punições
  allow delete: if signedIn() && isAdmin();
}

// ---------- PUNISHMENT TASK COMPLETIONS ----------
match /punishmentTaskCompletions/{completionId} {
  // Admin pode ler tudo; criança só pode ler suas próprias
  allow read: if signedIn() && (isAdmin() || resource.data.userId == request.auth.uid);

  // Criança pode criar suas próprias completions; admin também
  allow create: if signedIn() && (
    isAdmin() || request.resource.data.userId == request.auth.uid
  );

  // Apenas admin pode atualizar/deletar
  allow update, delete: if signedIn() && isAdmin();
}
```

A função helper `isAdmin()` já existe no arquivo:

```javascript
function isAdmin() {
  return signedIn() &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## 🐛 Logs Adicionados para Debug

O código agora inclui logs detalhados em 3 pontos:

### 1. AdminControls (Interface do Painel Admin)
- Log quando inicia ativação
- Log de sucesso com ID da punição
- Log de erro com código e mensagem detalhada

### 2. FirestoreService (Camada de Banco de Dados)
- Log ao iniciar ativação
- Log de punições existentes encontradas
- Log ao desativar punições antigas
- Log ao salvar nova punição
- Log de sucesso final
- Log de erro com stack trace completo

### 3. PunishmentContext (Estado Global)
- Log ao configurar listener
- Log quando recebe atualização de punição
- Log ao limpar listener

## 🚀 Após Resolver

Depois de fazer o deploy das regras e verificar o role admin:

1. **Limpe o cache do navegador** (Ctrl+Shift+Del)
2. **Recarregue a página** (F5)
3. **Faça login novamente**
4. **Tente ativar o modo punição**
5. **Abra outro navegador** ou aba anônima para testar a persistência
6. **Verifique o Firestore Console** para confirmar que os dados estão lá

## 📝 Comandos Úteis

```bash
# Deploy apenas das regras do Firestore
firebase deploy --only firestore:rules

# Ver status das regras deployadas
firebase firestore:rules get

# Testar regras localmente (emulador)
firebase emulators:start --only firestore

# Build do projeto
npm run build
```

## ✨ Melhorias Implementadas

1. **Desativação Automática de Punições Anteriores**: Quando uma nova punição é ativada, automaticamente desativa qualquer punição ativa anterior do mesmo usuário
2. **Logs Detalhados**: Todos os passos são logados no console para facilitar debug
3. **Mensagens de Erro Específicas**: Diferencia entre erro de permissão e outros erros
4. **Regras de Segurança Robustas**: Apenas admin pode ativar/desativar; criança pode apenas ler sua própria punição

## 🎯 Teste Final

Para confirmar que está funcionando:

1. ✅ Ative modo punição no Painel Admin
2. ✅ Veja mensagem de sucesso
3. ✅ A tela da criança deve mostrar o Modo Punição imediatamente
4. ✅ Abra o Firestore Console e veja o documento em `punishmentMode`
5. ✅ Limpe cache do navegador e recarregue - modo punição deve continuar ativo
6. ✅ Abra em outro navegador/dispositivo - modo punição deve estar ativo
7. ✅ Desative modo punição - deve desativar imediatamente

---

**Se após seguir todos os passos o problema persistir, compartilhe os logs do console para análise mais detalhada.**
