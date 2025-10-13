import importlib
import sys
from pathlib import Path

APP_UTILS_PATH = Path(__file__).resolve().parents[1] / "app"
if str(APP_UTILS_PATH) not in sys.path:
    sys.path.insert(0, str(APP_UTILS_PATH))

profanity_module = importlib.import_module("utils.profanity_filter")
censor_segments = profanity_module.censor_segments


def test_censor_segments_masks_forbidden_words():
    segments = [
        {"start": 0.0, "end": 1.5, "text": "Palavra teste aparece aqui"},
        {"start": 2.0, "end": 3.0, "text": "Nada suspeito"},
        {"start": 3.0, "end": 4.0, "text": "Outro Teste no final"},
    ]

    sanitized, beeps = censor_segments(
        segments,
        forbidden_words=["teste"],
        replacement="[censurado]",  # replacement é ignorado, usa asteriscos
    )

    # Agora usa asteriscos correspondentes ao tamanho da palavra
    assert sanitized == [
        (0.0, 1.5, "Palavra ***** aparece aqui"),  # "teste" = 5 letras
        (2.0, 3.0, "Nada suspeito"),
        (3.0, 4.0, "Outro ***** no final"),  # "Teste" = 5 letras
    ]

    # Beeps agora são precisos por palavra, não por segmento inteiro
    assert len(beeps) == 2  # Uma para cada ocorrência de "teste"
    # Verificar que os beeps estão dentro dos segmentos corretos
    assert 0.0 <= beeps[0][0] < beeps[0][1] <= 1.5
    assert 3.0 <= beeps[1][0] < beeps[1][1] <= 4.0


def test_censor_segments_no_matches_returns_original():
    segments = [
        {"start": 0.0, "end": 1.0, "text": "texto limpo"},
        {"start": 1.0, "end": 2.0, "text": "mais palavras"},
    ]

    sanitized, beeps = censor_segments(segments, forbidden_words=["xxx"])

    assert sanitized == [
        (0.0, 1.0, "texto limpo"),
        (1.0, 2.0, "mais palavras"),
    ]
    assert beeps == []
