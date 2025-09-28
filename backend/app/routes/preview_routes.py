from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import json
import uuid
from utils.audioExtract import extract_audio_from_video
from utils.transcribeAudio import transcribe_audio
import hashlib

preview_bp = Blueprint('preview', __name__)

@preview_bp.route('/process_video_preview', methods=['POST'])
def process_video_preview():
    """Processa o vídeo apenas para extrair legendas, sem renderizar"""
    try:
        if 'video' not in request.files:
            return jsonify({'status': 'error', 'message': "Nenhum arquivo de vídeo enviado!"}), 400

        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({'status': 'error', 'message': "Nenhum arquivo selecionado!"}), 400

        # Salvar arquivo temporário
        upload_folder = 'uploads'
        os.makedirs(upload_folder, exist_ok=True)
        
        video_path = os.path.join(upload_folder, video_file.filename)
        video_file.save(video_path)

        # Gerar hash único
        with open(video_path, 'rb') as vf:
            video_hash = hashlib.sha256(vf.read()).hexdigest()[:10]

        # Extrair áudio
        audio_path = os.path.join(upload_folder, f"temp_audio_{video_hash}.wav")
        extract_audio_from_video(video_path, audio_path)

        # Transcrever áudio
        transcribed_result = transcribe_audio(audio_path)
        segments = transcribed_result['segments']

        # Criar estrutura de legendas
        subtitles = []
        for i, segment in enumerate(segments):
            subtitle = {
                'id': i,
                'start': segment['start'],
                'end': segment['end'],
                'text': segment['text'].strip(),
                'confidence': segment.get('confidence', 0.5)
            }
            subtitles.append(subtitle)

        # Salvar dados da sessão
        session_data = {
            'video_hash': video_hash,
            'video_path': video_path,
            'subtitles': subtitles,
            'video_info': {
                'filename': video_file.filename,
                'duration': transcribed_result.get('duration', 0)
            }
        }

        session_file = os.path.join(upload_folder, f"session_{video_hash}.json")
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)

        # Limpar arquivo de áudio temporário
        if os.path.exists(audio_path):
            os.remove(audio_path)

        return jsonify({
            'status': 'success',
            'video_hash': video_hash,
            'subtitles': subtitles,
            'video_info': session_data['video_info']
        })

    except Exception as e:
        print(f"Erro no processo de preview: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@preview_bp.route('/update_subtitles', methods=['POST'])
def update_subtitles():
    """Atualiza as legendas editadas pelo usuário"""
    try:
        data = request.get_json()
        video_hash = data.get('video_hash')
        updated_subtitles = data.get('subtitles')

        if not video_hash or not updated_subtitles:
            return jsonify({'status': 'error', 'message': 'Dados incompletos'}), 400

        # Carregar sessão existente
        session_file = os.path.join('uploads', f"session_{video_hash}.json")
        if not os.path.exists(session_file):
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada'}), 404

        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)

        # Atualizar legendas
        session_data['subtitles'] = updated_subtitles

        # Salvar sessão atualizada
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)

        return jsonify({
            'status': 'success',
            'message': 'Legendas atualizadas com sucesso'
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@preview_bp.route('/render_final_video', methods=['POST'])
def render_final_video():
    """Renderiza o vídeo final com as legendas editadas"""
    try:
        from utils.CreateVideoWinthSubtitles import create_video_with_subtitles
        from flask import send_file
        
        data = request.get_json()
        video_hash = data.get('video_hash')
        subtitle_config = data.get('subtitle_config', {})

        if not video_hash:
            return jsonify({'status': 'error', 'message': 'Hash do vídeo é obrigatório'}), 400

        # Carregar sessão
        session_file = os.path.join('uploads', f"session_{video_hash}.json")
        if not os.path.exists(session_file):
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada'}), 404

        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)

        video_path = session_data['video_path']
        subtitles = session_data['subtitles']

        # Converter legendas para o formato esperado
        subtitle_tuples = [(sub['start'], sub['end'], sub['text']) for sub in subtitles]

        # Caminho do vídeo final
        output_video_name = f"final_{video_hash}.mp4"
        output_video_path = os.path.join('uploads', output_video_name)

        # Renderizar vídeo
        font_path = "C:\\Windows\\Fonts\\arial.ttf"
        create_video_with_subtitles(video_path, subtitle_tuples, output_video_path, font_path)

        return send_file(output_video_path, as_attachment=False, mimetype='video/mp4')

    except Exception as e:
        print(f"Erro na renderização: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@preview_bp.route('/get_session/<video_hash>', methods=['GET'])
def get_session(video_hash):
    """Recupera dados da sessão"""
    try:
        session_file = os.path.join('uploads', f"session_{video_hash}.json")
        if not os.path.exists(session_file):
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada'}), 404

        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)

        return jsonify({
            'status': 'success',
            'data': session_data
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500