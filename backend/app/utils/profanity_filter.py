import re
from typing import Iterable, Sequence, Tuple

try:
    from app.config import settings, DEFAULT_PROFANITY_WORDS
except ImportError:  # pragma: no cover - fallback for script execution
    from config import settings, DEFAULT_PROFANITY_WORDS

DEFAULT_FORBIDDEN_WORDS: Tuple[str, ...] = DEFAULT_PROFANITY_WORDS


def _build_pattern(words: Iterable[str]) -> re.Pattern:
    escaped = [re.escape(word) for word in words if word]
    if not escaped:
        return re.compile(r"^$", re.IGNORECASE)  # pattern that never matches
    return re.compile(r"\b(" + "|".join(escaped) + r")\b", re.IGNORECASE)


def censor_segments(
    segments: Sequence[dict],
    forbidden_words: Iterable[str] | None = None,
    replacement: str = "******",
) -> tuple[list[tuple[float, float, str]], list[tuple[float, float]]]:
    """Return sanitized subtitles and the intervals that should be beeped.

    Args:
        segments: Iterable with Whisper-like segments containing start, end, text.
        forbidden_words: optional list of forbidden words. Defaults to DEFAULT_FORBIDDEN_WORDS.
        replacement: text used to mask the forbidden word inside the subtitles.

    Returns:
        (sanitized_subtitles, beep_intervals)
    """
    if forbidden_words is not None:
        word_list = tuple(forbidden_words)
    else:
        word_list = settings.profanity_words or DEFAULT_FORBIDDEN_WORDS
    pattern = _build_pattern(word_list)

    sanitized: list[tuple[float, float, str]] = []
    beep_intervals: list[tuple[float, float]] = []

    for segment in segments:
        start = float(segment.get("start", 0.0))
        end = float(segment.get("end", start))
        text = str(segment.get("text", ""))

        def _mask(match: re.Match) -> str:
            return replacement

        new_text, substitutions = pattern.subn(_mask, text)

        if substitutions > 0:
            beep_intervals.append((start, end))

        sanitized.append((start, end, new_text))

    return sanitized, beep_intervals
