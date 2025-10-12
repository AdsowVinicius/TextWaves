"""Central configuration for the TextWaves backend."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Tuple


DEFAULT_PROFANITY_WORDS: Tuple[str, ...] = (
    "palavrão1",
    "palavrão2",
    "merda",
    "porra",
    "caralho",
    "abelha",
)


def _parse_csv_list(raw_value: str | None) -> Tuple[str, ...]:
    if not raw_value:
        return tuple()
    tokens = [token.strip() for token in raw_value.split(",")]
    return tuple(token for token in tokens if token)


@dataclass(slots=True)
class Settings:
    """Holds runtime configuration loaded from environment variables."""

    base_dir: Path = field(default_factory=lambda: Path(__file__).resolve().parent)
    upload_dir: Path = field(default_factory=lambda: Path(__file__).resolve().parent / "uploads")
    subtitles_dir_name: str = "videosSubtitles"
    ffmpeg_path: Path | None = None
    font_path: Path = Path(r"C:\\Windows\\Fonts\\arial.ttf")
    profanity_words: Tuple[str, ...] = DEFAULT_PROFANITY_WORDS
    beep_frequency: int = 1000
    beep_volume: float = 0.4

    @property
    def subtitles_dir(self) -> Path:
        return (self.base_dir.parent / self.subtitles_dir_name).resolve()

    @classmethod
    def from_env(cls) -> "Settings":
        base_dir = Path(os.getenv("TEXTWAVES_BASE_DIR", Path(__file__).resolve().parent))
        upload_dir = Path(os.getenv("TEXTWAVES_UPLOAD_DIR", base_dir / "uploads"))
        subtitles_dir_name = os.getenv("TEXTWAVES_SUBTITLES_DIR_NAME", "videosSubtitles")

        ffmpeg_env = os.getenv("TEXTWAVES_FFMPEG_PATH")
        ffmpeg_path = Path(ffmpeg_env) if ffmpeg_env else None

        font_path = Path(
            os.getenv("TEXTWAVES_FONT_PATH", r"C:\\Windows\\Fonts\\arial.ttf")
        )

        words = _parse_csv_list(os.getenv("TEXTWAVES_PROFANITY_WORDS"))
        if words:
            profanity_words = words
        else:
            profanity_words = DEFAULT_PROFANITY_WORDS

        beep_frequency = int(os.getenv("TEXTWAVES_BEEP_FREQUENCY", "1000"))
        beep_volume = float(os.getenv("TEXTWAVES_BEEP_VOLUME", "0.4"))

        settings = cls(
            base_dir=base_dir,
            upload_dir=upload_dir,
            subtitles_dir_name=subtitles_dir_name,
            ffmpeg_path=ffmpeg_path,
            font_path=font_path,
            profanity_words=profanity_words,
            beep_frequency=beep_frequency,
            beep_volume=beep_volume,
        )

        settings.upload_dir.mkdir(parents=True, exist_ok=True)
        settings.subtitles_dir.mkdir(parents=True, exist_ok=True)
        return settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings; cache can be cleared via ``get_settings.cache_clear()``."""

    return Settings.from_env()


def reload_settings() -> Settings:
    """Force reloading configuration from environment variables (useful for tests)."""

    get_settings.cache_clear()
    return get_settings()


settings = get_settings()
