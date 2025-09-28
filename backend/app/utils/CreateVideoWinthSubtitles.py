import moviepy.editor as mp
import os

# Configurar o caminho para o ffmpeg baseado na estrutura do projeto
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
ffmpeg_path = os.path.join(backend_dir, "app", "ffmpeg", "bin", "ffmpeg.exe")

# Verificar se o ffmpeg existe no projeto
if os.path.exists(ffmpeg_path):
    os.environ["FFMPEG_BINARY"] = ffmpeg_path
    print(f"FFmpeg configurado em: {ffmpeg_path}")
else:
    print(f"FFmpeg não encontrado em: {ffmpeg_path}")
    # Fallback para o caminho padrão se existir
    fallback_path = r"C:\Program Files\ffmpeg\bin\ffmpeg.exe"
    if os.path.exists(fallback_path):
        os.environ["FFMPEG_BINARY"] = fallback_path
        print(f"Usando FFmpeg do sistema: {fallback_path}")
    else:
        print("FFmpeg não encontrado. Pode ser necessário instalar o FFmpeg.")

def calculate_subtitle_parameters(video_width, video_height):
    """Calcula parâmetros dinâmicos para as legendas baseados nas proporções do vídeo."""
    # Cálculo da proporção do vídeo (aspect ratio)
    aspect_ratio = video_width / video_height
    
    # Área total do vídeo para cálculos proporcionais
    video_area = video_width * video_height
    
    # Ajuste da altura da legenda baseado na proporção
    # Para vídeos mais largos (16:9, 21:9), usar porcentagem menor da altura
    # Para vídeos mais quadrados (4:3, 1:1), usar porcentagem maior
    if aspect_ratio >= 2.0:  # Ultrawide (21:9 ou maior)
        height_percentage = 0.08
    elif aspect_ratio >= 1.7:  # Widescreen (16:9)
        height_percentage = 0.1
    elif aspect_ratio >= 1.3:  # Standard (4:3)
        height_percentage = 0.12
    else:  # Square ou portrait
        height_percentage = 0.15
    
    subtitle_height = max(60, int(video_height * height_percentage))
    
    # Cálculo do tamanho da fonte baseado na área do vídeo e proporção
    # Usa uma fórmula que considera tanto a largura quanto a altura
    base_size = int((video_area ** 0.5) * 0.02)  # Raiz quadrada da área * fator
    
    # Ajustes baseados na proporção
    if aspect_ratio >= 2.0:  # Ultrawide
        font_size = max(18, int(base_size * 1.1))
    elif aspect_ratio >= 1.7:  # Widescreen
        font_size = max(16, int(base_size))
    elif aspect_ratio >= 1.3:  # Standard
        font_size = max(14, int(base_size * 0.9))
    else:  # Square ou portrait
        font_size = max(12, int(base_size * 0.8))
    
    # Margem proporcional
    side_margin = max(10, int(video_width * 0.05))
    bottom_margin = max(10, int(video_height * 0.02))
    
    # Largura da legenda
    subtitle_width = video_width - (2 * side_margin)
    
    return {
        'subtitle_height': subtitle_height,
        'font_size': font_size,
        'side_margin': side_margin,
        'bottom_margin': bottom_margin,
        'subtitle_width': subtitle_width,
        'aspect_ratio': aspect_ratio
    }

def create_video_with_subtitles(video_path, subtitles, output_video_path, font_path):
    """Cria um novo vídeo com legendas sobrepostas com tamanho ajustado às proporções do vídeo."""
    print("######################-iniciando-######################")
    video_clip = mp.VideoFileClip(video_path)
    
    # Obtendo as dimensões do vídeo
    video_width = video_clip.size[0]
    video_height = video_clip.size[1]
    
    # Calculando parâmetros dinâmicos baseados nas proporções do vídeo
    params = calculate_subtitle_parameters(video_width, video_height)
    
    print(f"Dimensões do vídeo: {video_width}x{video_height}")
    print(f"Proporção do vídeo: {params['aspect_ratio']:.2f}")
    print(f"Altura da legenda: {params['subtitle_height']}px")
    print(f"Tamanho da fonte: {params['font_size']}px")
    print(f"Largura da legenda: {params['subtitle_width']}px")

    # Criando um clipe de fundo para as legendas com parâmetros dinâmicos
    def make_subtitle_clip(text, start, duration, font_path):
        return (mp.TextClip(text, 
                           font=font_path, 
                           fontsize=params['font_size'], 
                           color='white', 
                           bg_color='rgba(0,0,0,0.8)',  # Fundo semi-transparente
                           size=(params['subtitle_width'], params['subtitle_height']),
                           method='caption',  # Permite quebra de linha automática
                           align='center')
                .set_position(('center', video_height - params['subtitle_height'] - params['bottom_margin']))
                .set_start(start)
                .set_duration(duration))
    
    print("######################- iniciando integração de legendas -################")
    
    # Lista para armazenar todos os clipes de legenda
    subtitle_clips = []
    
    for start, end, text in subtitles:
        txt_clip = make_subtitle_clip(text, start, end - start, font_path)
        subtitle_clips.append(txt_clip)
    
    # Compondo o vídeo final com todas as legendas de uma vez (mais eficiente)
    if subtitle_clips:
        final_video = mp.CompositeVideoClip([video_clip] + subtitle_clips)
    else:
        final_video = video_clip
    
    final_video.write_videofile(output_video_path, codec='libx264', fps=24)
    return final_video





