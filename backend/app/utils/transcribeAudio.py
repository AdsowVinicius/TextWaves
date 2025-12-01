import whisper
import os
from threading import Lock

# Cache global para modelo Whisper (economiza tempo de carregamento)
_whisper_model = None
_model_lock = Lock()

def get_whisper_model(model_name: str = "large"):
    """
    Obtém modelo Whisper do cache ou carrega uma única vez.
    Evita recarregar o modelo a cada requisição (+5 segundos por requisição).
    """
    global _whisper_model
    
    if _whisper_model is not None:
        return _whisper_model
    
    with _model_lock:
        # Double-check locking pattern para thread-safety
        if _whisper_model is not None:
            return _whisper_model
        
        print(f"[Whisper] Carregando modelo '{model_name}' (primeira vez - pode levar 30s)...")
        _whisper_model = whisper.load_model(model_name)
        print(f"[Whisper] Modelo '{model_name}' carregado com sucesso em cache")
        return _whisper_model

def transcribe_audio(audio_path):
    """Transcreve o áudio usando Whisper e retorna o texto e os tempos."""
    if not os.path.exists(audio_path):
        print(f"Erro: O arquivo {audio_path} não foi encontrado.")
        return None
    
    try:
        model = get_whisper_model("large")
        transcribed_result = model.transcribe(
            audio_path,
            verbose=False,
            word_timestamps=True,
            task="transcribe",
        )
        return transcribed_result
    except Exception as e:
        print(f"Erro ao transcrever o áudio: {e}")
        return None