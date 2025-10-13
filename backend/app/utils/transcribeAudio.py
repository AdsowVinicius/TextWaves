import whisper
import os

def transcribe_audio(audio_path):
    """Transcreve o áudio usando Whisper e retorna o texto e os tempos."""
    if not os.path.exists(audio_path):
        print(f"Erro: O arquivo {audio_path} não foi encontrado.")
        return None
    
    try:
        model = whisper.load_model("large")
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