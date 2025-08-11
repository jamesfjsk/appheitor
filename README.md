# 🚀 Flash Missions - Sistema Gamificado para Crianças

Sistema completo de gamificação de tarefas para crianças com tema super-heróico do Flash, desenvolvido com React, TypeScript, Tailwind CSS e Firebase.

## ✨ Funcionalidades

### 👶 **Painel Infantil (Heitor)**
- **Interface temática do Flash** com cores vibrantes e animações
- **Sistema XP/Gold** com progressão de níveis
- **Missões diárias** organizadas por período (manhã, tarde, noite)
- **Loja de recompensas** com sistema de resgate
- **Conquistas e badges** para motivação
- **Calendário de progresso** visual
- **Sons e animações** para feedback positivo
- **Modo offline** com sincronização automática

### 👨‍💼 **Painel Administrativo (Pai)**
- **Dashboard completo** com métricas e estatísticas
- **Gerenciamento de tarefas** (criar, editar, ativar/desativar)
- **Sistema de recompensas** configurável
- **Aprovação de resgates** com notificações
- **Controles administrativos** (ajustar XP/Gold, reset)
- **Histórico detalhado** de atividades
- **Sistema de notificações** para comunicação
- **Sincronização em tempo real** com Firebase

### 🔥 **Firebase Integration**
- **Authentication** com email/senha
- **Firestore** para dados em tempo real
- **Cloud Messaging** para notificações push
- **Offline support** com cache local
- **Sincronização automática** entre dispositivos

## 🛠️ Tecnologias

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Animações:** Framer Motion
- **Backend:** Firebase (Auth, Firestore, Messaging)
- **Build:** Vite
- **UI/UX:** Design system customizado com tema Flash
- **PWA:** Service Worker para notificações

## 📦 Instalação

### 1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/flash-missions.git
cd flash-missions
```

### 2. **Instale as dependências**
```bash
npm install
```

### 3. **Configure o Firebase**

#### 3.1 Criar projeto Firebase
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nome: `flash-missions-heitor`
4. Desabilite Google Analytics (opcional)

#### 3.2 Configurar Authentication
1. No painel Firebase → **Authentication**
2. Clique em "Começar"
3. Na aba **Sign-in method**:
   - Habilite **Email/senha**
   - ✅ Marque "Permitir que os usuários se inscrevam"
   - ❌ Desmarque "Exigir verificação de email"

#### 3.3 Configurar Firestore Database
1. Vá em **Firestore Database**
2. Clique em "Criar banco de dados"
3. Escolha **Modo de teste**
4. Selecione localização: **southamerica-east1** (São Paulo)

#### 3.4 Configurar Web App
1. No painel principal, clique no ícone **</>** (Web)
2. Nome do app: `Flash Missions Web`
3. ✅ Marque "Configurar Firebase Hosting"
4. **COPIE as configurações** que aparecem

#### 3.5 Configurar Cloud Messaging (Opcional)
1. Vá em **Cloud Messaging**
2. Clique em "Começar"
3. Gere um **Certificado de chave da Web** (VAPID)

### 4. **Configure as variáveis de ambiente**

Copie o arquivo `.env.example` para `.env` e preencha com suas configurações do Firebase:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
VITE_FIREBASE_MEASUREMENT_ID=seu_measurement_id

# VAPID Key for Push Notifications (opcional)
VITE_FIREBASE_VAPID_KEY=sua_vapid_key_aqui
```

### 5. **Execute o projeto**
```bash
npm run dev
```

## 🎮 Como usar

### **Primeiro acesso:**
1. Acesse `http://localhost:5173`
2. Escolha o perfil (Heitor ou Pai)
3. **Com Firebase:** Crie uma conta nova
4. **Sem Firebase:** Use qualquer email/senha para demo

### **Contas de exemplo (modo demo):**
- **Heitor:** `heitor@demo.com` / `123456`
- **Pai:** `pai@demo.com` / `123456`

### **Fluxo típico:**
1. **Pai** cria tarefas e recompensas
2. **Heitor** completa missões e ganha XP/Gold
3. **Heitor** resgata recompensas na loja
4. **Pai** aprova os resgates
5. Sistema sincroniza automaticamente entre painéis

## 🏗️ Arquitetura

### **Estrutura de pastas:**
```
src/
├── components/          # Componentes React
│   ├── auth/           # Autenticação
│   ├── hero/           # Painel infantil
│   ├── parent/         # Painel administrativo
│   └── common/         # Componentes compartilhados
├── contexts/           # Context API (Estado global)
├── config/             # Configurações (Firebase)
├── types/              # Tipos TypeScript
└── styles/             # Estilos globais
```

### **Contextos principais:**
- **AuthContext:** Autenticação e usuários
- **DataContext:** Tarefas, recompensas, progresso
- **NotificationContext:** Sistema de notificações
- **SoundContext:** Efeitos sonoros
- **OfflineContext:** Suporte offline

### **Tipos de dados:**
- **Task:** Tarefas/missões
- **Reward:** Recompensas da loja
- **UserProgress:** Progresso do usuário (XP, Gold, nível)
- **Achievement:** Conquistas desbloqueáveis
- **RewardRedemption:** Resgates de recompensas

## 🎨 Design System

### **Cores:**
- **Flash Theme:** Vermelho (#C8102E), Amarelo (#FFD700)
- **Parent Theme:** Azul (#2563EB), Cinza (#374151)
- **Estados:** Verde (sucesso), Vermelho (erro), Amarelo (aviso)

### **Tipografia:**
- **Infantil:** Comic Neue (divertida)
- **Adulto:** Inter (profissional)
- **Destaque:** Poppins (títulos)

### **Componentes:**
- **Botões:** Diferentes estilos para cada público
- **Cards:** Glassmorphism para painel infantil
- **Animações:** Framer Motion para transições suaves
- **Responsivo:** Mobile-first design

## 🔧 Scripts disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Linter ESLint
```

## 📱 PWA e Notificações

O sistema suporta:
- **Instalação como PWA** no dispositivo
- **Notificações push** via Firebase Cloud Messaging
- **Funcionamento offline** com cache local
- **Sincronização automática** quando volta online

## 🚀 Deploy

### **Netlify (Recomendado):**
1. Conecte o repositório no Netlify
2. Configure as variáveis de ambiente
3. Deploy automático a cada commit

### **Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🎯 Roadmap

- [ ] **Multiplayer:** Suporte para múltiplas crianças
- [ ] **Relatórios:** Dashboard avançado com gráficos
- [ ] **Integração:** APIs externas (calendário, escola)
- [ ] **Gamificação:** Mais elementos de jogo (clãs, batalhas)
- [ ] **Mobile App:** Versão nativa React Native
- [ ] **IA:** Sugestões inteligentes de tarefas

## 📞 Suporte

- **Email:** suporte@flashmissions.com
- **Discord:** [Flash Missions Community](https://discord.gg/flashmissions)
- **Documentação:** [docs.flashmissions.com](https://docs.flashmissions.com)

---

**Desenvolvido com ❤️ para tornar as tarefas diárias uma aventura emocionante!** ⚡