from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Iterable

try:
    from app.config import settings
except ImportError:  # pragma: no cover - fallback for script execution
    from config import settings
from .audioExtract import extract_audio_from_video
from .CreateVideoWinthSubtitles import SubtitleRenderingOptions, create_video_with_subtitles
from .profanity_filter import censor_segments
from .transcribeAudio import transcribe_audio


logger = logging.getLogger(__name__)


def generate_str_file_and_video(
    video_path: str,
    backend_directory: str | None,
    name_output: str,
    forbidden_words: Iterable[str] | None = None,
) -> tuple[str, str, str]:
    source_video = Path(video_path)
    if not source_video.exists():
        raise FileNotFoundError(f"Vídeo de origem não encontrado: {source_video}")

    base_dir = Path(backend_directory) if backend_directory else settings.base_dir.parent
    subtitles_dir = (base_dir / settings.subtitles_dir_name).resolve()
    subtitles_dir.mkdir(parents=True, exist_ok=True)

    with source_video.open('rb') as video_file:
        video_hash = hashlib.sha256(video_file.read()).hexdigest()[:10]
    logger.info("Processando vídeo %s | hash=%s", source_video, video_hash)

    output_video_path = subtitles_dir / f"{video_hash}_{name_output}.mp4"
    str_file_path = subtitles_dir / f"{video_hash}.str"
    audio_path = subtitles_dir / f"temp_audio_{video_hash}.wav"

    try:
        extract_audio_from_video(str(source_video), str(audio_path))
        logger.debug("Áudio temporário gerado em %s", audio_path)

        transcribed_result = transcribe_audio(str(audio_path))
        segments = transcribed_result['segments']
        logger.debug("%d segmentos transcritos", len(segments))

        subtitles, beep_intervals = censor_segments(segments, forbidden_words=forbidden_words)

        with str_file_path.open('w', encoding='utf-8') as str_file:
            for start, end, text in subtitles:
                str_file.write(f"{start:.3f} --> {end:.3f}\n{text}\n\n")
        logger.info("Arquivo .str salvo em %s", str_file_path)

        subtitle_options = SubtitleRenderingOptions(font_path=str(settings.font_path))

        create_video_with_subtitles(
            str(source_video),
            subtitles,
            str(output_video_path),
            subtitle_options,
            beep_intervals=beep_intervals,
            beep_frequency=settings.beep_frequency,
            beep_volume=settings.beep_volume,
        )
        logger.info("Novo vídeo com legendas salvo em %s", output_video_path)

    finally:
        if audio_path.exists():
            try:
                audio_path.unlink()
                logger.debug("Arquivo de áudio temporário removido: %s", audio_path)
            except OSError:
                logger.warning("Não foi possível remover o áudio temporário: %s", audio_path)

    return str(str_file_path), str(output_video_path), video_hash

    