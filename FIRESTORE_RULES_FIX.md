# 🚨 SOLUÇÃO URGENTE - ERRO 400 FIRESTORE

## 🔍 **PROBLEMA IDENTIFICADO:**
Erro **400 (Bad Request)** nas chamadas para `firestore.googleapis.com` indica que as **regras de segurança** do Firestore estão incorretas ou muito restritivas.

## ✅ **SOLUÇÃO IMEDIATA:**

### 1. **Vá para Firebase Console:**
- https://console.firebase.google.com/
- Selecione seu projeto: **APP HEITOR**

### 2. **Configure as Regras do Firestore:**
1. No menu lateral → **Firestore Database**
2. Clique na aba **"Regras"** (não "Dados")
3. **APAGUE** todo o conteúdo atual
4. **COLE** exatamente isto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso total para usuários autenticados (modo desenvolvimento)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. **Clique "Publicar"** (botão azul)
6. **Aguarde** a confirmação "Regras publicadas com sucesso"

### 3. **Teste Imediatamente:**
1. Volte para a aplicação
2. Recarregue a página (F5)
3. Tente fazer login novamente
4. **Verifique o console** - os erros 400 devem parar

## 🎯 **O QUE ESSAS REGRAS FAZEM:**
- Permitem **leitura e escrita** para qualquer usuário **autenticado**
- Bloqueiam acesso para usuários **não autenticados**
- São **seguras** para desenvolvimento e uso pessoal

## ⚠️ **SE AINDA DER ERRO:**
1. Verifique se clicou em **"Publicar"** nas regras
2. Aguarde 1-2 minutos para propagação
3. Recarregue a aplicação completamente
4. Se persistir, me envie uma captura da tela das regras publicadas

**Esta é a causa raiz do problema!** 🎯