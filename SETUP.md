# 🚀 Guia de Configuração - Flash Missions

## 📋 Checklist de Configuração

### ✅ 1. Firebase Setup (PRIMEIRO PASSO)

#### 1.1 Criar Projeto Firebase
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nome: `flash-missions-heitor` (ou seu nome preferido)
4. Desabilite Google Analytics (opcional para este projeto)
5. Clique em "Criar projeto"

#### 1.2 Configurar Authentication
1. No painel Firebase, vá em **Authentication**
2. Clique em "Começar"
3. Na aba **Sign-in method**:
   - Habilite **Email/senha**
   - ✅ Marque "Permitir que os usuários se inscrevam"
   - ❌ Desmarque "Exigir verificação de email" (para facilitar testes)

#### 1.3 Configurar Firestore Database
1. Vá em **Firestore Database**
2. Clique em "Criar banco de dados"
3. Escolha **Modo de teste** (por enquanto)
4. Selecione localização: **southamerica-east1** (São Paulo)

#### 1.4 Configurar Web App
1. No painel principal, clique no ícone **</>** (Web)
2. Nome do app: `Flash Missions Web`
3. ✅ Marque "Configurar Firebase Hosting"
4. Clique em "Registrar app"
5. **COPIE as configurações** que aparecem (vamos usar no próximo passo)

#### 1.5 Configurar Messaging (Notificações)
1. Vá em **Cloud Messaging**
2. Clique em "Começar"
3. Gere um **Certificado de chave da Web** (Web Push certificates)
4. **COPIE a chave VAPID** (vamos usar depois)

---

### 🔧 2. Próximos Passos (após Firebase)

- [ ] **Configurar variáveis de ambiente**
- [ ] **Configurar regras de segurança Firestore**
- [ ] **Configurar PWA (Progressive Web App)**
- [ ] **Configurar notificações push**
- [ ] **Deploy para produção**
- [ ] **Configurar domínio personalizado**

---

## 📝 Informações que você precisa coletar:

Após criar o projeto Firebase, você terá estas informações:

```javascript
// Exemplo das configurações Firebase
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "flash-missions-heitor.firebaseapp.com",
  projectId: "flash-missions-heitor",
  storageBucket: "flash-missions-heitor.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345"
};
```

**VAPID Key para notificações:**
```
BPXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx
```

---

## ⚡ Ação Imediata

**Faça agora:**
1. Crie o projeto Firebase seguindo os passos acima
2. Copie as configurações do Firebase
3. Me envie as configurações para eu atualizar o código

**Exemplo do que preciso:**
```
Minhas configurações Firebase:
apiKey: "AIza..."
authDomain: "meu-projeto.firebaseapp.com"
projectId: "meu-projeto"
...
```

Assim que você tiver essas informações, vou configurar tudo automaticamente no código! 🚀