# 🧪 Guia de Teste - Editor de Beeps

## ⚠️ IMPORTANTE: Limpar Sessões Antigas

Antes de testar, **SEMPRE** delete as sessões antigas:

```powershell
Remove-Item -Path "backend\app\uploads\session_*.json" -Force
Remove-Item -Path "backend\app\uploads\final_*.mp4" -Force -ErrorAction SilentlyContinue
```

**Por quê?** Porque as sessões antigas foram criadas com o código antigo e não têm os novos campos (`beep_intervals`).

## 📋 Checklist de Teste

### 1. ✅ Limpar Sessões Antigas
```powershell
# Execute no terminal
Remove-Item -Path "c:\Users\adsow\Desktop\TG\TextWaves-main\TextWaves-main\backend\app\uploads\session_*.json" -Force
```

### 2. ✅ Verificar Servidores Rodando

**Backend:**
```bash
cd backend
python app/app.py
# Deve mostrar: Running on http://127.0.0.1:5000
```

**Frontend:**
```bash
cd frontend
npm run dev
# Deve mostrar: Local: http://localhost:5173
```

### 3. ✅ Fazer Upload de Vídeo Novo

1. Acesse `http://localhost:5173`
2. Clique em "Novo Vídeo"
3. Escolha palavras proibidas (ex: pai, abelha)
4. Selecione o vídeo Rick e Morty
5. Clique em "Enviar"

### 4. ✅ Verificar no Editor

Você deve ver:

**✓ Legendas com asteriscos corretos:**
```
Olá seu *** (3 asteriscos para "pai")
A ****** chegou (6 asteriscos para "abelha")
```

**✓ Seção de Beeps:**
```
🔊 Intervalos de Beep (X)
[Mostrar Editor]
```

### 5. ✅ Testar Editor de Beeps

1. Clique em **"Mostrar Editor"**
2. Você deve ver:
   ```
   ℹ️ Os beeps são calculados automaticamente...
   [➕ Adicionar Beep no Tempo Atual]
   
   🔇 Beep #1 (pai)
   Início: 0.21s | Fim: 0.51s | Duração: 0.30s
   [▶ Ir para 0.21s] [🗑️]
   
   🔇 Beep #2 (abelha)
   Início: 2.79s | Fim: 3.29s | Duração: 0.50s
   [▶ Ir para 2.79s] [🗑️]
   ```

### 6. ✅ Testar Funcionalidades

**Ir para Beep:**
- Clique em "▶ Ir para X.XXs"
- O vídeo deve pular para aquele momento
- O beep deve ficar vermelho quando ativo

**Editar Timing:**
- Modifique "Início" ou "Fim"
- A duração deve atualizar automaticamente

**Adicionar Beep Manual:**
- Reproduza o vídeo até 10s
- Clique em "➕ Adicionar Beep no Tempo Atual"
- Um novo beep deve aparecer

**Remover Beep:**
- Clique no 🗑️
- O beep deve desaparecer

### 7. ✅ Salvar e Renderizar

1. Clique em **"Salvar Edições"**
   - Deve mostrar: "Legendas e beeps salvos com sucesso!"

2. Clique em **"Gerar Vídeo Final"**
   - Deve iniciar renderização
   - Vídeo final deve ter:
     - ✅ Asteriscos corretos
     - ✅ Beeps nos momentos editados

## 🐛 Problemas Comuns

### Problema: Asteriscos errados (todos com 6 *)
**Causa:** Sessão antiga carregada
**Solução:** Delete sessões antigas e reprocesse

### Problema: Sem beeps na lista
**Causa:** Nenhuma palavra proibida encontrada
**Solução:** Verifique se escolheu palavras que aparecem no vídeo

### Problema: Editor não aparece
**Causa:** Frontend não recarregou
**Solução:** Recarregue a página (Ctrl+R ou F5)

### Problema: Beeps não salvam
**Causa:** Erro no backend
**Solução:** Veja console do backend para erros

## 📊 Logs Esperados

### Backend (Console)
```
2025-10-12 22:00:00 [INFO] Sessão antiga removida: session_xxx.json
2025-10-12 22:00:01 [INFO] "POST /api/process_video_preview HTTP/1.1" 200
2025-10-12 22:00:02 [INFO] "GET /api/get_session/xxx HTTP/1.1" 200
2025-10-12 22:00:10 [INFO] "POST /api/update_subtitles HTTP/1.1" 200
2025-10-12 22:00:20 [INFO] "POST /api/render_final_video HTTP/1.1" 200
```

### Frontend (Console do Navegador)
```javascript
// Verifique com F12 → Console
console.log(beepIntervals);
// Deve mostrar: [{id: 0, start: 0.21, end: 0.51, word: "pai"}, ...]
```

## ✅ Teste Completo Passou Se:

- [ ] Asteriscos têm tamanho correto (3 para "pai", 6 para "abelha")
- [ ] Editor de beeps aparece
- [ ] Lista mostra todos os beeps
- [ ] Botão "Ir para" funciona
- [ ] Editar timing funciona
- [ ] Adicionar beep manual funciona
- [ ] Remover beep funciona
- [ ] Salvar edições funciona
- [ ] Renderizar vídeo final funciona
- [ ] Vídeo final tem beeps nos lugares corretos

## 🎯 Resultado Esperado

**Legendas:**
```
[00:00.00 --> 00:01.50] Olá seu ***
[00:02.00 --> 00:03.00] A ****** chegou
```

**Beeps:**
```
Beep 1: 0.21s - 0.51s (palavra "pai")
Beep 2: 2.79s - 3.29s (palavra "abelha")
```

**Vídeo Final:**
- ✅ Som: BEEP curto de ~0.3s apenas nas palavras
- ✅ Legenda: Asteriscos com tamanho correto
- ✅ Timing: Preciso conforme editado

---

## 🚀 Comandos Rápidos

**Limpar tudo e recomeçar:**
```powershell
# Terminal no diretório raiz
Remove-Item -Path "backend\app\uploads\session_*.json" -Force
Remove-Item -Path "backend\app\uploads\final_*.mp4" -Force -ErrorAction SilentlyContinue
Write-Host "✓ Pronto para novo teste!" -ForegroundColor Green
```

**Verificar sessões:**
```powershell
Get-ChildItem "backend\app\uploads\session_*.json"
```

**Ver conteúdo de uma sessão:**
```powershell
Get-Content "backend\app\uploads\session_XXX.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```
