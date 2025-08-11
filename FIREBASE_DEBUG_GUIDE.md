# 🔥 GUIA COMPLETO DE DEBUG FIREBASE

## 📋 PROBLEMAS IDENTIFICADOS E SOLUÇÕES

### 1. 🚨 **VARIÁVEIS DE AMBIENTE**
**Problema:** Configurações Firebase não estão sendo carregadas
**Solução:**
1. Copie `.env.example` para `.env`
2. Vá em Firebase Console > Configurações do Projeto
3. Copie TODAS as configurações para o arquivo `.env`

### 2. 🚨 **FIRESTORE DATABASE NÃO CRIADO**
**Problema:** Erro "failed-precondition" ou "client is offline"
**Solução:**
1. Firebase Console > Firestore Database
2. "Criar banco de dados"
3. Modo de teste
4. Localização: southamerica-east1

### 3. 🚨 **REGRAS DE SEGURANÇA**
**Problema:** Erro "permission-denied"
**Solução:**
1. Firestore Database > Regras
2. Substitua por:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
3. Publicar

### 4. 🚨 **AUTHENTICATION NÃO CONFIGURADO**
**Problema:** Não consegue fazer login
**Solução:**
1. Firebase Console > Authentication
2. Sign-in method
3. Habilitar Email/senha
4. Permitir inscrições

## 🔍 COMO DEBUGAR

### 1. **Abra o Console do Navegador (F12)**
Procure por estas mensagens:

✅ **SUCESSO:**
```
🔥 Firebase Config Debug: { apiKey: "AIza...", ... }
✅ Firebase App inicializado com sucesso
✅ Firebase Auth inicializado com sucesso
✅ Firestore inicializado com sucesso
✅ Teste de escrita Firestore: SUCESSO
```

❌ **ERRO - Variáveis de ambiente:**
```
❌ Variáveis de ambiente Firebase faltando
❌ FIREBASE NÃO CONFIGURADO!
```

❌ **ERRO - Firestore não criado:**
```
❌ Teste de conexão Firestore falhou
💡 SOLUÇÃO: Firestore Database não foi criado
```

❌ **ERRO - Regras de segurança:**
```
❌ Teste de conexão Firestore falhou
💡 SOLUÇÃO: Regras de segurança bloqueando acesso
```

### 2. **Verificar Arquivo .env**
O arquivo `.env` deve existir na raiz do projeto com:
```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=app-heitor.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=app-heitor
...
```

### 3. **Verificar Firebase Console**
- ✅ Firestore Database criado
- ✅ Authentication habilitado
- ✅ Regras publicadas
- ✅ Projeto ativo

## 🛠️ CHECKLIST DE VERIFICAÇÃO

### Firebase Console:
- [ ] Projeto criado
- [ ] Firestore Database criado (não Storage!)
- [ ] Authentication > Email/senha habilitado
- [ ] Regras de segurança publicadas

### Código:
- [ ] Arquivo `.env` existe
- [ ] Todas as variáveis preenchidas
- [ ] Console mostra logs de sucesso
- [ ] Sem erros no console

### Teste:
- [ ] Login funciona
- [ ] Dados são salvos no Firestore
- [ ] Não há erros de conexão

## 🚀 PRÓXIMOS PASSOS

1. **Execute o debug completo**
2. **Verifique TODOS os logs no console**
3. **Corrija os problemas um por um**
4. **Teste o login novamente**

Se ainda houver problemas, copie TODOS os logs do console e envie para análise.