import logging
import os
from dataclasses import dataclass
from typing import Iterable, Sequence, Tuple

import numpy as np
import moviepy.editor as mp
import moviepy.audio.fx.all as afx
from moviepy.audio.AudioClip import AudioClip, CompositeAudioClip
from moviepy.video.tools.subtitles import SubtitlesClip


logger = logging.getLogger(__name__)

# Configurar o caminho para o ffmpeg baseado na estrutura do projeto
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
ffmpeg_path = os.path.join(backend_dir, "app", "ffmpeg", "bin", "ffmpeg.exe")

# Verificar se o ffmpeg existe no projeto
if os.path.exists(ffmpeg_path):
    os.environ["FFMPEG_BINARY"] = ffmpeg_path
    logger.info("FFmpeg configurado em: %s", ffmpeg_path)
else:
    logger.warning("FFmpeg não encontrado em: %s", ffmpeg_path)
    fallback_path = r"C:\Program Files\ffmpeg\bin\ffmpeg.exe"
    if os.path.exists(fallback_path):
        os.environ["FFMPEG_BINARY"] = fallback_path
        logger.info("Usando FFmpeg do sistema: %s", fallback_path)
    else:
        logger.error("FFmpeg não encontrado. Pode ser necessário instalar o FFmpeg.")


@dataclass
class SubtitleRenderingOptions:
    font_path: str
    font_color: str = "white"
    bg_color: str = "rgba(0,0,0,0.8)"
    align: str = "center"
    method: str = "caption"
    stroke_color: str | None = None
    stroke_width: int = 0

def calculate_subtitle_parameters(video_width, video_height):
    """Calcula parâmetros dinâmicos para as legendas baseados nas proporções do vídeo."""
    # Cálculo da proporção do vídeo (aspect ratio)
    aspect_ratio = video_width / video_height
    
    # Área total do vídeo para cálculos proporcionais
    video_area = video_width * video_height
    
    # Ajuste da altura da legenda baseado na proporção
    # Para vídeos mais largos (16:9, 21:9), usar porcentagem menor da altura
    # Para vídeos mais quadrados (4:3, 1:1), usar porcentagem maior
    if aspect_ratio >= 2.0:  # Ultrawide (21:9 ou maior)
        height_percentage = 0.08
    elif aspect_ratio >= 1.7:  # Widescreen (16:9)
        height_percentage = 0.1
    elif aspect_ratio >= 1.3:  # Standard (4:3)
        height_percentage = 0.12
    else:  # Square ou portrait
        height_percentage = 0.15
    
    subtitle_height = max(60, int(video_height * height_percentage))
    
    # Cálculo do tamanho da fonte baseado na área do vídeo e proporção
    # Usa uma fórmula que considera tanto a largura quanto a altura
    base_size = int((video_area ** 0.5) * 0.02)  # Raiz quadrada da área * fator
    
    # Ajustes baseados na proporção
    if aspect_ratio >= 2.0:  # Ultrawide
        font_size = max(18, int(base_size * 1.1))
    elif aspect_ratio >= 1.7:  # Widescreen
        font_size = max(16, int(base_size))
    elif aspect_ratio >= 1.3:  # Standard
        font_size = max(14, int(base_size * 0.9))
    else:  # Square ou portrait
        font_size = max(12, int(base_size * 0.8))
    
    # Margem proporcional
    side_margin = max(10, int(video_width * 0.05))
    bottom_margin = max(10, int(video_height * 0.02))
    
    # Largura da legenda
    subtitle_width = video_width - (2 * side_margin)
    
    return {
        'subtitle_height': subtitle_height,
        'font_size': font_size,
        'side_margin': side_margin,
        'bottom_margin': bottom_margin,
        'subtitle_width': subtitle_width,
        'aspect_ratio': aspect_ratio
    }

def create_video_with_subtitles(
    video_path: str,
    subtitles: Sequence[Tuple[float, float, str]],
    output_video_path: str,
    subtitle_options: SubtitleRenderingOptions,
    beep_intervals: Iterable[Tuple[float, float]] | None = None,
    beep_frequency: int = 1000,
    beep_volume: float = 0.4,
    ducking_volume: float | None = 0.35,
    codec: str = "libx264",
    fps: int = 24,
):
    """Renderiza um vídeo com legendas e opcionalmente insere beeps em trechos proibidos."""

    logger.info("Iniciando processamento de legendas para %s", video_path)
    video_clip = mp.VideoFileClip(video_path)
    video_width, video_height = video_clip.size

    params = calculate_subtitle_parameters(video_width, video_height)
    logger.debug(
        "Video size=%sx%s | aspect=%.2f | subtitle_size=(w=%s, h=%s) | font=%s",
        video_width,
        video_height,
        params['aspect_ratio'],
        params['subtitle_width'],
        params['subtitle_height'],
        params['font_size'],
    )

    def _make_textclip(txt: str) -> mp.TextClip:
        textclip_kwargs = {
            "font": subtitle_options.font_path,
            "fontsize": params['font_size'],
            "color": subtitle_options.font_color,
            "bg_color": subtitle_options.bg_color,
            "method": subtitle_options.method,
            "align": subtitle_options.align,
            "size": (params['subtitle_width'], params['subtitle_height']),
        }
        if subtitle_options.stroke_color and subtitle_options.stroke_width > 0:
            textclip_kwargs["stroke_color"] = subtitle_options.stroke_color
            textclip_kwargs["stroke_width"] = subtitle_options.stroke_width

        return mp.TextClip(**textclip_kwargs)

    subtitle_clip = SubtitlesClip(subtitles, _make_textclip)
    subtitle_clip = subtitle_clip.set_position(
        ("center", video_height - params['subtitle_height'] - params['bottom_margin'])
    )

    final_video = mp.CompositeVideoClip([video_clip, subtitle_clip])

    audio_clip = video_clip.audio
    beep_items: list[Tuple[float, float]] = list(beep_intervals or [])

    if audio_clip and beep_items:
        base_audio = audio_clip
        if ducking_volume is not None:
            base_audio = audio_clip.fx(afx.volumex, max(0.0, min(1.0, ducking_volume)))

        def make_beep(duration: float) -> AudioClip:
            def _tone(t):
                return beep_volume * np.sin(2 * np.pi * beep_frequency * t)

            return AudioClip(_tone, duration=duration, fps=44100)

        beep_clips = []
        for start, end in beep_items:
            duration = max(0.05, float(end) - float(start))
            beep_clip = make_beep(duration).set_start(float(start))
            beep_clips.append(beep_clip)

        composite_parts: list[AudioClip] = [base_audio]
        composite_parts.extend(beep_clips)
        composite_audio: AudioClip = CompositeAudioClip(composite_parts)
    else:
        composite_audio = audio_clip

    if composite_audio:
        composite_audio = composite_audio.set_duration(final_video.duration)
        final_video = final_video.set_audio(composite_audio)

    logger.info("Exportando vídeo legendado para %s", output_video_path)
    final_video.write_videofile(output_video_path, codec=codec, fps=fps)
    return final_video





