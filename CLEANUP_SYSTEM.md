# Sistema de Limpeza Automática de Sessões

## 📋 Visão Geral

O sistema agora limpa automaticamente sessões antigas e arquivos temporários para manter a aplicação limpa e eficiente.

## ✨ Funcionalidades

### 1. **Limpeza na Inicialização do Servidor**
- Executa automaticamente quando o backend inicia
- Remove arquivos com mais de 24 horas
- Registra logs detalhados de cada operação

### 2. **Limpeza Após Renderização**
- Remove sessão e arquivos temporários após gerar o vídeo final
- Mantém apenas o vídeo final (que será limpo em 24h)
- Libera espaço imediatamente após o download

### 3. **Arquivos Removidos**
- `session_*.json` - Dados da sessão (legendas, configurações)
- `temp_audio_*.wav` - Áudio extraído temporariamente
- `final_*.mp4` - Vídeos finais renderizados (após 24h)

## 🔧 Configuração

### Tempo de Retenção
```python
# Padrão: 24 horas
startup_cleanup(max_age_hours=24)

# Personalizar (exemplo: 12 horas)
startup_cleanup(max_age_hours=12)

# Limpar tudo (para testes)
startup_cleanup(max_age_hours=0)
```

### Diretórios Monitorados
- `backend/app/uploads/` - Diretório principal de uploads
- `uploads/` - Diretório raiz (para arquivos temporários)

## 📝 Logs

O sistema registra todas as operações:

```
2025-10-12 21:30:00 [INFO] Iniciando limpeza de sessões antigas (> 24h)...
2025-10-12 21:30:00 [INFO] Sessão antiga removida: session_abc123.json
2025-10-12 21:30:00 [INFO] Áudio temporário removido: temp_audio_abc123.wav
2025-10-12 21:30:00 [INFO] Limpeza concluída: 5 arquivos removidos (sessões: 2, áudios: 2, vídeos: 1, erros: 0)
```

## 🎯 Benefícios

1. **Espaço em Disco**: Remove automaticamente arquivos desnecessários
2. **Performance**: Menos arquivos = busca mais rápida
3. **Privacidade**: Dados temporários não ficam armazenados indefinidamente
4. **Manutenção Zero**: Funciona automaticamente, sem intervenção manual
5. **Logs Auditáveis**: Rastreabilidade completa de todas as operações

## 🔄 Fluxo de Trabalho

```
1. Usuário faz upload → Sessão criada
2. Processamento → Arquivos temporários criados
3. Edição → Sessão mantida
4. Renderização final → Sessão removida automaticamente
5. Vídeo final disponível → Será limpo em 24h
6. Reiniciar servidor → Limpa tudo > 24h
```

## 🛠️ Funções Disponíveis

### `startup_cleanup(max_age_hours=24)`
Limpa sessões antigas na inicialização do servidor.

### `clean_old_sessions(max_age_hours=24)`
Limpa arquivos mais antigos que o tempo especificado. Retorna contadores de arquivos removidos.

### `clean_session_by_hash(video_hash)`
Remove uma sessão específica e todos os seus arquivos relacionados.

## ⚙️ Integração

### No `app.py`
```python
from utils.session_cleaner import startup_cleanup

# ... após registrar blueprints
startup_cleanup(max_age_hours=24)
```

### No `preview_routes.py`
```python
from utils.session_cleaner import clean_session_by_hash

# ... após renderizar vídeo final
clean_session_by_hash(video_hash)
```

## 🧪 Testes

Execute o script de teste:
```bash
python test_session_cleaner.py
```

## 📊 Estatísticas

O sistema retorna contadores para monitoramento:
```python
counters = {
    'sessions': 2,      # Sessões JSON removidas
    'temp_audio': 2,    # Arquivos de áudio removidos
    'final_videos': 1,  # Vídeos finais removidos
    'errors': 0         # Erros durante limpeza
}
```

## 🔒 Segurança

- Tratamento de erros robusto (não trava o servidor)
- Logs de todas as operações
- Verifica existência antes de remover
- Não remove vídeos originais do usuário

## 🚀 Próximas Melhorias Possíveis

1. Tarefa agendada (cron-like) para limpeza periódica
2. Dashboard de estatísticas de armazenamento
3. Configuração via arquivo `.env`
4. Notificações de limpeza para administradores
5. Backup automático antes de limpar
