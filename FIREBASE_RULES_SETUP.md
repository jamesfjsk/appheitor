# 🔐 CONFIGURAÇÃO URGENTE - REGRAS FIRESTORE

## 🚨 **PROBLEMA IDENTIFICADO:**
Erro 400 (Bad Request) indica que as **regras de segurança** do Firestore estão bloqueando as operações.

## ✅ **SOLUÇÃO IMEDIATA:**

### 1. **Vá para o Firebase Console:**
- https://console.firebase.google.com/
- Selecione seu projeto: **APP HEITOR**

### 2. **Configure as Regras do Firestore:**
1. No menu lateral → **Firestore Database**
2. Clique na aba **"Regras"**
3. **SUBSTITUA** todo o conteúdo por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso total para usuários autenticados (modo desenvolvimento)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Permitir acesso às tarefas apenas para o dono
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Permitir acesso aos perfis de usuário
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. **Clique "Publicar"**

### 3. **Verificar Authentication:**
1. Vá em **Authentication** → **Usuários**
2. Confirme que os usuários `heitor2026@teste.com` e `pai1996@teste.com` existem
3. Se não existirem, crie-os:
   - Email: `heitor2026@teste.com` / Senha: `123456`
   - Email: `pai1996@teste.com` / Senha: `123456`

## 🧪 **TESTE APÓS CONFIGURAR:**
1. Faça login na aplicação
2. Verifique o console do navegador (F12)
3. Deve aparecer logs como:
   - `🔥 Usuário autenticado: [uid] [email]`
   - `🔥 DataContext: Carregando dados para usuário: [uid]`
   - `🔥 DataContext: Dados recebidos do Firestore: X documentos`

## ⚠️ **SE AINDA DER ERRO:**
- Copie e cole EXATAMENTE os logs do console
- Verifique se o projeto Firebase está ativo
- Confirme se as variáveis de ambiente estão corretas no arquivo `.env`

**Faça essas configurações e teste novamente!** 🚀