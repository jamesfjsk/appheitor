# Deploy na Vercel (flashmissons.com)

Decisão de 15/09/2026: o site sai do bolt.new e passa a ser publicado pela Vercel, no domínio `https://flashmissons.com` (provisório; muda depois). Enquanto o Miner Missions é construído, o endereço público mostra o **teaser** ("A mina está sendo escavada"); o app de verdade continua inacessível para o Heitor.

## Como funciona o modo obras

- No site público (`flashmissons.com`, `www.flashmissons.com` e qualquer `*.vercel.app`) o teaser (`src/components/Teaser.tsx`) aparece por padrão, decidido em `src/main.tsx` pelo endereço. Não depende de variável na Vercel. Em `localhost` o site é o app normal.
- `VITE_MAINTENANCE=1` força o teaser em qualquer endereço (usado nos testes locais). `VITE_MAINTENANCE=0` desliga o teaser: é o que você põe na Vercel quando o jogo estiver pronto (e faz um redeploy, porque a variável entra no build).
- O teaser não carrega Firebase nem faz login: é uma página estática com o tema da mina, a barra "Obras: Etapa 1 de 5", a lista "O que vem por aí" e um bloco para minerar (5 golpes viram 1 diamante, contado só no navegador dele).
- **Atalho do pai**: abrir `https://flashmissons.com/?dev=minerar` uma vez libera o app de verdade nesse navegador (fica salvo em `localStorage.mm_dev`). `?dev=sair` volta ao teaser. O atalho é só para você; não passe para o Heitor.
- Quando o jogo estiver pronto: criar `VITE_MAINTENANCE=0` na Vercel e fazer um novo deploy (Deployments > Redeploy). Depois disso pode-se apagar a lista `PUBLIC_HOSTS` do `main.tsx`.
- Para mudar o texto "Etapa 1 de 5" e a lista de novidades, editar `src/components/Teaser.tsx` (constante `COMING` e a largura da barra).

## Passo a passo (uma vez)

1. **Commit e push** do repositório (`git push origin main`). A Vercel publica a partir do GitHub.
2. Em https://vercel.com: **Add New Project** > importar `jamesfjsk/appheitor`. Framework: Vite (detectado). Build: `npm run build`. Output: `dist`. O arquivo `vercel.json` já faz o rewrite para `index.html` (rotas `/login`, `/flash`, `/admin` funcionam ao recarregar).
3. **Environment Variables** (Production e Preview), copiando os valores do seu `.env` local:
   - (não precisa de `VITE_MAINTENANCE`: o teaser é automático no endereço público)
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_FIREBASE_VAPID_KEY` (opcionais)
   - `VITE_APP_ENV` = `production`
   - `VITE_OPENAI_API_KEY` (necessária para o app de verdade; a chave vai para o bundle como sempre foi, e sai do cliente na Etapa 2 com a Cloud Function)
   - Não colocar `PIXELLAB_API_KEY`, `TEST_CHILD_EMAIL` nem `TEST_CHILD_PASSWORD`: são só do computador.
4. **Deploy**. O primeiro endereço é `appheitor-xxxx.vercel.app`; teste o teaser lá.
5. **Domínio**: Project > Settings > Domains > adicionar `flashmissons.com` e `www.flashmissons.com`. A Vercel mostra os registros DNS: no registrador do domínio, apontar `A @ -> 76.76.21.21` e `CNAME www -> cname.vercel-dns.com` (usar exatamente o que a tela da Vercel mostrar). Remover os registros antigos que apontavam para o bolt.new. Propaga em minutos a algumas horas.
6. **Firebase Authentication**: console do Firebase > Authentication > Settings > Authorized domains > adicionar `flashmissons.com`, `www.flashmissons.com` e o `*.vercel.app` do projeto. Sem isso o login falha com `auth/unauthorized-domain` quando você usar o atalho `?dev=minerar`.
7. **Teste final**: abrir `https://flashmissons.com` (teaser), depois `https://flashmissons.com/?dev=minerar` (tela de login), entrar como pai e conferir o painel; `?dev=sair` para voltar.

## Deploys seguintes

Todo `git push` na `main` publica sozinho. Como a Etapa 1 está em andamento pelo Cursor, o Heitor continua vendo só o teaser mesmo que o push leve código incompleto: o teaser é decidido antes de carregar o app.

Se preferir publicar sem GitHub: `npx vercel --prod` na pasta do projeto (pede login na primeira vez).

## Checklist rápido

- [ ] Push feito
- [ ] Variáveis `VITE_FIREBASE_*`, `VITE_APP_ENV` e `VITE_OPENAI_API_KEY` no painel da Vercel
- [ ] Domínio apontado (A e CNAME)
- [ ] Domínios autorizados no Firebase Auth
- [ ] Teaser abre em `https://flashmissons.com`
- [ ] `?dev=minerar` abre o login; `?dev=sair` volta ao teaser
