"""Utilitário para limpeza automática de sessões antigas."""
from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

try:
    from app.config import settings
except ImportError:  # pragma: no cover
    from config import settings

logger = logging.getLogger(__name__)


def clean_old_sessions(max_age_hours: int = 24) -> dict[str, int]:
    """Remove sessões e arquivos temporários mais antigos que max_age_hours.
    
    Args:
        max_age_hours: Idade máxima em horas para manter arquivos
        
    Returns:
        Dicionário com contadores de arquivos removidos
    """
    upload_dir = settings.upload_dir
    now = time.time()
    max_age_seconds = max_age_hours * 3600
    
    counters = {
        'sessions': 0,
        'temp_audio': 0,
        'final_videos': 0,
        'errors': 0
    }
    
    if not upload_dir.exists():
        logger.warning(f"Diretório de uploads não existe: {upload_dir}")
        return counters
    
    # Limpar sessões antigas (session_*.json)
    for session_file in upload_dir.glob("session_*.json"):
        try:
            file_age = now - os.path.getmtime(session_file)
            if file_age > max_age_seconds:
                session_file.unlink()
                counters['sessions'] += 1
                logger.info(f"Sessão antiga removida: {session_file.name}")
        except Exception as e:
            counters['errors'] += 1
            logger.error(f"Erro ao remover sessão {session_file.name}: {e}")
    
    # Limpar arquivos de áudio temporários (temp_audio_*.wav)
    for audio_file in upload_dir.glob("temp_audio_*.wav"):
        try:
            file_age = now - os.path.getmtime(audio_file)
            if file_age > max_age_seconds:
                audio_file.unlink()
                counters['temp_audio'] += 1
                logger.info(f"Áudio temporário removido: {audio_file.name}")
        except Exception as e:
            counters['errors'] += 1
            logger.error(f"Erro ao remover áudio {audio_file.name}: {e}")
    
    # Limpar vídeos finais antigos (final_*.mp4)
    for video_file in upload_dir.glob("final_*.mp4"):
        try:
            file_age = now - os.path.getmtime(video_file)
            if file_age > max_age_seconds:
                video_file.unlink()
                counters['final_videos'] += 1
                logger.info(f"Vídeo final removido: {video_file.name}")
        except Exception as e:
            counters['errors'] += 1
            logger.error(f"Erro ao remover vídeo {video_file.name}: {e}")
    
    # Também limpar da pasta raiz uploads se existir
    root_uploads = settings.base_dir / 'uploads'
    if root_uploads.exists() and root_uploads != upload_dir:
        for temp_audio in root_uploads.glob("temp_audio_*.wav"):
            try:
                file_age = now - os.path.getmtime(temp_audio)
                if file_age > max_age_seconds:
                    temp_audio.unlink()
                    counters['temp_audio'] += 1
                    logger.info(f"Áudio temporário removido (raiz): {temp_audio.name}")
            except Exception as e:
                counters['errors'] += 1
                logger.error(f"Erro ao remover áudio (raiz) {temp_audio.name}: {e}")
    
    total_removed = counters['sessions'] + counters['temp_audio'] + counters['final_videos']
    if total_removed > 0:
        logger.info(f"Limpeza concluída: {total_removed} arquivos removidos "
                   f"(sessões: {counters['sessions']}, áudios: {counters['temp_audio']}, "
                   f"vídeos: {counters['final_videos']}, erros: {counters['errors']})")
    
    return counters


def clean_session_by_hash(video_hash: str, *, keep_final_video: bool = False) -> bool:
    """Remove uma sessão específica e seus arquivos relacionados.
    
    Args:
        video_hash: Hash do vídeo da sessão a ser removida
        
    Returns:
        True se removeu com sucesso, False caso contrário
    """
    upload_dir = settings.upload_dir
    removed = False
    
    try:
        # Remover session JSON
        session_file = upload_dir / f"session_{video_hash}.json"
        if session_file.exists():
            session_file.unlink()
            logger.info(f"Sessão removida: {session_file.name}")
            removed = True
        
        # Remover áudio temporário
        audio_file = upload_dir / f"temp_audio_{video_hash}.wav"
        if audio_file.exists():
            audio_file.unlink()
            logger.info(f"Áudio temporário removido: {audio_file.name}")
        
        # Também verificar na pasta raiz
        root_uploads = settings.base_dir / 'uploads'
        if root_uploads.exists():
            root_audio = root_uploads / f"temp_audio_{video_hash}.wav"
            if root_audio.exists():
                root_audio.unlink()
                logger.info(f"Áudio temporário removido (raiz): {root_audio.name}")
        
        # Remover vídeo final
        final_video = upload_dir / f"final_{video_hash}.mp4"
        if final_video.exists():
            if keep_final_video:
                logger.info(
                    "Vídeo final preservado (keep_final_video=True): %s",
                    final_video.name,
                )
            else:
                final_video.unlink()
                logger.info(f"Vídeo final removido: {final_video.name}")
        
        return removed
        
    except Exception as e:
        logger.error(f"Erro ao limpar sessão {video_hash}: {e}")
        return False


def startup_cleanup(max_age_hours: int = 24) -> None:
    """Executa limpeza de sessões antigas na inicialização do servidor.
    
    Args:
        max_age_hours: Idade máxima em horas para manter arquivos
    """
    logger.info(f"Iniciando limpeza de sessões antigas (> {max_age_hours}h)...")
    counters = clean_old_sessions(max_age_hours)
    
    total = counters['sessions'] + counters['temp_audio'] + counters['final_videos']
    if total == 0:
        logger.info("Nenhuma sessão antiga encontrada.")
    elif counters['errors'] > 0:
        logger.warning(f"Limpeza concluída com {counters['errors']} erro(s).")
