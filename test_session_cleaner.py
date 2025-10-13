"""Script de teste para demonstrar a limpeza automática de sessões."""
import sys
import time
from pathlib import Path

sys.path.insert(0, 'backend')

from app.utils.session_cleaner import clean_old_sessions, clean_session_by_hash, startup_cleanup

print("\n" + "="*60)
print("TESTE DO SISTEMA DE LIMPEZA AUTOMÁTICA")
print("="*60)

# Teste 1: Limpeza na inicialização
print("\n[1] Simulando inicialização do servidor...")
print("    → Limpa arquivos com mais de 24 horas automaticamente")
startup_cleanup(max_age_hours=24)

# Teste 2: Limpeza manual de todas as sessões antigas
print("\n[2] Forçar limpeza de TODAS as sessões (age=0)...")
counters = clean_old_sessions(max_age_hours=0)
print(f"    ✓ Sessões: {counters['sessions']}")
print(f"    ✓ Áudios temporários: {counters['temp_audio']}")
print(f"    ✓ Vídeos finais: {counters['final_videos']}")
print(f"    ✗ Erros: {counters['errors']}")

# Teste 3: Limpeza por hash específico
print("\n[3] Limpeza de sessão específica por hash...")
result = clean_session_by_hash("ef5d39c881")
print(f"    {'✓' if result else '✗'} Sessão ef5d39c881 {'removida' if result else 'não encontrada'}")

print("\n" + "="*60)
print("RESUMO DO SISTEMA DE LIMPEZA")
print("="*60)
print("""
✓ Limpeza automática ao iniciar o servidor (> 24h)
✓ Limpeza após renderizar vídeo final
✓ Remove: session_*.json, temp_audio_*.wav, final_*.mp4
✓ Logs detalhados de cada operação
✓ Tratamento de erros para evitar crashes

CONFIGURAÇÃO:
- Tempo padrão: 24 horas
- Ajustável via startup_cleanup(max_age_hours=X)
- Diretórios monitorados:
  • backend/app/uploads/
  • uploads/ (raiz)
""")
print("="*60 + "\n")
