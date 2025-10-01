# 🔧 Guia de Recuperação de XP

## Como Acessar

1. Faça login como **Admin**
2. No painel administrativo, clique na aba **"Recuperar XP"** 🔧
3. A ferramenta será aberta diretamente no painel

## Como Usar

### Passo 1: Selecionar Usuário
- Use o dropdown para selecionar o usuário (ex: Heitor)
- Você verá o nome e role do usuário selecionado

### Passo 2: Investigar
- Clique no botão **"Investigar Perda de XP"**
- A ferramenta vai:
  - ✅ Buscar todas as tarefas completadas
  - ✅ Calcular XP total ganho
  - ✅ Calcular Gold ganho e gasto
  - ✅ Comparar com progresso atual no banco

### Passo 3: Analisar o Relatório

A ferramenta mostrará 4 seções principais:

#### 📊 Progresso Atual no Banco
- O que está salvo AGORA no Firestore
- Total XP, Level, Gold Disponível

#### ✅ Valores Estimados (Corretos)
- Calculado baseado no histórico de tarefas
- O que DEVERIA estar no banco

#### ⚠️ Diferenças Detectadas
- Comparação lado a lado
- Mostra quanto XP/Gold foi perdido
- **Exemplo:**
  ```
  Diferença de XP: +3247 XP (perdeu 3247 XP)
  Diferença de Level: +32 níveis
  Diferença de Gold: +341 gold
  ```

#### 📋 Recomendações
- Instruções específicas sobre o que fazer
- Se detectar perda, recomenda restauração

### Passo 4: Restaurar (Se Necessário)

Se houver perda de XP detectada:

1. **Botão "Restaurar XP e Gold"** aparecerá
2. Clique no botão
3. **Uma confirmação será mostrada:**
   ```
   ⚠️ ATENÇÃO: Isso irá restaurar:

   XP: 0 → 3247
   Level: 1 → 33
   Gold: 0 → 341

   Deseja continuar?
   ```
4. Revise os valores com cuidado
5. Clique **OK** para confirmar
6. A ferramenta vai:
   - ✅ Fazer backup dos valores antigos
   - ✅ Restaurar XP, Level e Gold corretos
   - ✅ Re-investigar para confirmar
   - ✅ Mostrar sucesso

## Como Funciona a Recuperação

### Cálculo do XP
```
XP Total = Σ (XP de cada tarefa completada) + Σ (XP de conquistas resgatadas)
```

### Cálculo do Level
```
Level = ⌊XP Total ÷ 100⌋ + 1
```

### Cálculo do Gold
```
Gold Disponível = (Total Gold Ganho) - (Gold Gasto em Resgates)
```

## Fontes de Dados Analisadas

A ferramenta busca dados em:
- 📋 **Tasks**: Todas as tarefas com status "done"
- 🏆 **Achievements**: Conquistas desbloqueadas e resgatadas
- 🎁 **Redemptions**: Resgates de recompensas (gold gasto)
- 👤 **Progress**: Progresso atual salvo no banco

## Segurança

### Backups Automáticos
Antes de restaurar, a ferramenta salva:
- ✅ XP anterior
- ✅ Level anterior
- ✅ Gold anterior
- ✅ Timestamp da restauração
- ✅ Motivo da restauração

### Validação
- ✅ Confirmação obrigatória antes de restaurar
- ✅ Mostra exatamente o que vai ser alterado
- ✅ Re-investigação automática após restauração

### Logs
Tudo é logado no console:
```
🔍 XP Recovery: Starting investigation for user [userId]
📊 Current Progress: {...}
📋 Found X tasks
🏆 XP from achievements: Y
✅ XP Recovery: XP restored successfully!
```

## Exemplo de Uso Real

### Cenário: Heitor perdeu todo o XP

**Antes:**
- XP: 0
- Level: 1
- Gold: 0

**Após Investigação:**
```
⚠️ PERDA DE XP DETECTADA: 3247 XP faltando
📈 XP atual: 0, Esperado: 3247
🎯 Use a função restoreXP() para recuperar o progresso
```

**Após Restauração:**
- XP: 3247 ✅
- Level: 33 ✅
- Gold: 341 ✅

## Solução de Problemas

### "Nenhum usuário encontrado"
- Certifique-se de estar logado como admin
- Verifique se há usuários cadastrados no sistema

### "Nenhuma tarefa encontrada"
- O usuário pode não ter completado tarefas ainda
- Verifique se as tarefas estão marcadas como "done" no Firestore

### "Erro ao restaurar"
- Verifique permissões do Firestore
- Confira se o documento de progresso existe
- Veja os logs no console para detalhes

## Quando Usar Esta Ferramenta

✅ **Use quando:**
- XP do usuário desapareceu inexplicavelmente
- Level voltou para 1 sem motivo
- Gold foi zerado
- Suspeita de perda de dados

❌ **Não use quando:**
- O progresso está correto
- Foi um reset intencional
- Não há tarefas completadas para recuperar

## Prevenção de Perdas Futuras

Para evitar perdas de dados no futuro:

1. **Monitore o Firebase Doctor** regularmente
2. **Use o Data Doctor** para verificar integridade dos dados
3. **Verifique os logs** se algo parecer estranho
4. **Faça backups** antes de mudanças grandes

## Suporte Técnico

Se encontrar problemas:
1. Abra o console do navegador (F12)
2. Vá para a aba "Console"
3. Procure por erros em vermelho
4. Copie a mensagem de erro completa
5. Compartilhe com o suporte técnico
