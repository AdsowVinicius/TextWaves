from moviepy.editor import VideoFileClip

def extract_audio_from_video(video_path, audio_path):
    """Extrai áudio de um vídeo e salva no formato WAV."""
    video = VideoFileClip(video_path)
    audio = video.audio
    audio.write_audiofile(audio_path, codec='pcm_s16le')  # Forçando o codec WAV adequado
