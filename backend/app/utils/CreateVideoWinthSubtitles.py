import moviepy.editor as mp
import os

# Defina o caminho para o ffmpeg (se necessário)
os.environ["FFMPEG_BINARY"] = r"C:\\Program Files\\ffmpeg-4.4-full_build\\bin\\ffmpeg.exe"

def create_video_with_subtitles(video_path, subtitles, output_video_path, font_path):
    """Cria um novo vídeo com legendas sobrepostas em um retângulo na parte inferior."""
    print("######################-iniciando-######################")
    video_clip = mp.VideoFileClip(video_path)

    # Definindo o tamanho e a posição do retângulo para as legendas
    subtitle_height = 100  # Altura do retângulo das legendas
    video_height = video_clip.size[1]

    # Criando um clipe de fundo para as legendas
    def make_subtitle_clip(text, start, duration, font_path):
        return (mp.TextClip(text, font=font_path, fontsize=24, color='white', bg_color='black', size=(video_clip.size[0], subtitle_height))
        .set_position(('center', video_height - subtitle_height))  # Define a posição na parte inferior
        .set_start(start)
        .set_duration(duration))
    print("######################- iniciando integração de legendas -################")
    for start, end, text in subtitles:
        txt_clip = make_subtitle_clip(text, start, end - start, font_path)
        video_clip = mp.CompositeVideoClip([video_clip, txt_clip])

    video_clip.write_videofile(output_video_path, codec='libx264', fps=24)
    return video_clip





