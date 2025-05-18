import whisper
from app.utils.transcribeAudio import transcribe_audio
audio_path = "C:\\Users\\adsow\\Desktop\\TexWaves\\backend\\videosSubtitles\\temp_audio.wav"
transcribed_result = transcribe_audio(audio_path)

# Verificar o que foi transcrito
print("Texto transcrito:", transcribed_result['text'])

# Exibir os segmentos transcritos com tempos de início e fim
for segment in transcribed_result['segments']:
    print(f"Início: {segment['start']} | Fim: {segment['end']} | Texto: {segment['text']}") 