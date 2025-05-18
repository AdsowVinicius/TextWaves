import numpy as np
import subprocess
import scipy.io.wavfile as wav
import os

# Caminho para o executável ffmpeg
ffmpeg = r"C:\\Program Files\\ffmpeg-4.4-full_build\\bin"

def detect_pauses(audio_path):
    """Detecta pausas no áudio e retorna os intervalos de silêncio com precisão de 3 casas decimais."""
    # Extrair o áudio do arquivo usando FFmpeg (usando subprocess para chamar o ffmpeg)
    command = [ffmpeg, '-i', audio_path, 'temp_audio.wav']
    subprocess.run(command, check=True)

    # Carregar o áudio extraído
    sample_rate, audio = wav.read('temp_audio.wav')
    
    # Normalizar o áudio
    audio = audio / np.max(np.abs(audio))
    
    # Defina o limiar de silêncio
    silence_threshold = 0.05
    
    # Identificar índices de silêncio
    silence_indices = np.where(np.abs(audio) < silence_threshold)[0]
    
    # Encontrar os intervalos de silêncio
    non_silents = []
    start = None
    for i in range(1, len(silence_indices)):
        if silence_indices[i] - silence_indices[i - 1] > 1:  # Intervalo de silêncio encontrado
            if start is not None:
                non_silents.append((round(start / sample_rate, 3), round(silence_indices[i - 1] / sample_rate, 3)))
            start = silence_indices[i]
    
    # Adicionar o último intervalo se necessário
    if start is not None and silence_indices[-1] - silence_indices[-2] > 1:
        non_silents.append((round(start / sample_rate, 3), round(silence_indices[-1] / sample_rate, 3)))
    
    return non_silents



