import re
import string
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
    replacement: str | None = None,
) -> tuple[list[tuple[float, float, str]], list[tuple[float, float, str]]]:
    """Return sanitized subtitles and the intervals that should be beeped.

    Args:
        segments: Iterable with Whisper-like segments containing start, end, text.
        forbidden_words: optional list of forbidden words. Defaults to DEFAULT_FORBIDDEN_WORDS.
        replacement: deprecated, ignored (cada palavra é mascarada com asteriscos iguais ao tamanho).

    Returns:
        (sanitized_subtitles, beep_intervals)
    """
    if forbidden_words is not None:
        word_list = tuple(forbidden_words)
    else:
        word_list = settings.profanity_words or DEFAULT_FORBIDDEN_WORDS
    pattern = _build_pattern(word_list)

    sanitized: list[tuple[float, float, str]] = []
    beep_intervals: list[tuple[float, float, str]] = []

    for segment in segments:
        start = float(segment.get("start", 0.0))
        end = float(segment.get("end", start))
        text = str(segment.get("text", ""))
        duration = end - start

        # Encontrar todas as ocorrências de palavras proibidas
        matches = list(pattern.finditer(text))

        segment_words = segment.get("words")
        used_precise_timing = False
        if isinstance(segment_words, list) and segment_words:
            for word_info in segment_words:
                raw_word = str(word_info.get("word", ""))
                if not raw_word.strip():
                    continue

                if not pattern.search(raw_word):
                    continue

                precise_start = word_info.get("start")
                precise_end = word_info.get("end")
                if precise_start is None or precise_end is None:
                    continue

                clean_label = raw_word.strip()
                # Remover pontuações das extremidades para exibir
                clean_label = clean_label.strip(string.punctuation + " ") or raw_word.strip()

                beep_intervals.append(
                    (float(precise_start), float(precise_end), clean_label)
                )
                used_precise_timing = True
        
        if matches and not used_precise_timing:
            # Calcular timing aproximado de cada palavra dentro do segmento
            words_in_segment = text.split()
            total_words = len(words_in_segment)
            
            for match in matches:
                matched_word = match.group(0)
                word_length = len(matched_word)
                
                # Estimar posição temporal da palavra no segmento
                # Baseado na posição do caractere no texto
                char_pos = match.start()
                char_ratio = char_pos / len(text) if len(text) > 0 else 0
                
                # Estimar duração da palavra (proporcional ao tamanho)
                avg_word_duration = duration / total_words if total_words > 0 else duration
                word_duration = avg_word_duration * 0.8  # Palavra individual é menor que média
                
                # Calcular timing do beep
                word_start = start + (duration * char_ratio)
                word_end = min(word_start + word_duration, end)
                
                beep_intervals.append((word_start, word_end, matched_word))
        
        # Substituir cada palavra pelo número correto de asteriscos
        def _mask(match: re.Match) -> str:
            return '*' * len(match.group(0))
        
        new_text = pattern.sub(_mask, text)
        sanitized.append((start, end, new_text))

    return sanitized, beep_intervals
