from __future__ import annotations

import json
import os
import hashlib
import uuid

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

try:
    from app.config import settings
except ImportError:  # pragma: no cover - fallback for script execution
    from config import settings
from utils.audioExtract import extract_audio_from_video
from utils.transcribeAudio import transcribe_audio
from utils.profanity_filter import censor_segments
from utils.session_cleaner import clean_session_by_hash
from utils.CreateVideoWinthSubtitles import (
    SubtitleRenderingOptions,
    create_video_with_subtitles,
)
from utils.progress_tracker import initialize_progress, update_progress, set_error
from models.video_model import VideoTask

preview_bp = Blueprint('preview', __name__)


def _parse_forbidden_words(raw_value: str | None) -> list[str] | None:
    if not raw_value:
        return None

    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        parsed = [item.strip() for item in raw_value.split(',') if item.strip()]
    else:
        if isinstance(parsed, (list, tuple)):
            parsed = [str(item).strip() for item in parsed if str(item).strip()]
        elif isinstance(parsed, str):
            parsed = [parsed.strip()] if parsed.strip() else []
        else:
            parsed = []

    return parsed if parsed else None


@preview_bp.route('/process_video_preview', methods=['POST'])
@jwt_required()
def process_video_preview():
    """Processa o vídeo apenas para extrair legendas, sem renderizar"""
    try:
        user_id = get_jwt_identity()
        if 'video' not in request.files:
            return jsonify({'status': 'error', 'message': "Nenhum arquivo de vídeo enviado!"}), 400

        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({'status': 'error', 'message': "Nenhum arquivo selecionado!"}), 400

        forbidden_words = _parse_forbidden_words(request.form.get('forbidden_words'))

        # Salvar arquivo temporário
        upload_folder = 'uploads'
        os.makedirs(upload_folder, exist_ok=True)

        safe_name = secure_filename(video_file.filename) or f"video_{uuid.uuid4().hex}.mp4"
        unique_name = f"upload_{uuid.uuid4().hex}_{safe_name}"
        video_path = os.path.join(upload_folder, unique_name)
        video_file.save(video_path)

        # Gerar hash único
        with open(video_path, 'rb') as vf:
            video_hash = hashlib.sha256(vf.read()).hexdigest()[:10]

        session_file = os.path.join(upload_folder, f"session_{video_hash}.json")
        VideoTask.create_or_reset(
            video_hash=video_hash,
            user_id=str(user_id),
            filename=video_file.filename,
            session_path=session_file,
        )

        # Inicializar rastreamento de progresso
        initialize_progress(video_hash)
        VideoTask.record_progress(
            video_hash,
            stage='uploading',
            progress=5,
            message='Arquivo recebido',
            status='processing',
        )
        update_progress(video_hash, 'extracting_audio', 10, 'Extraindo áudio do vídeo...')
        VideoTask.record_progress(
            video_hash,
            stage='extracting_audio',
            progress=10,
            message='Extraindo áudio do vídeo...',
            status='processing',
        )

        # Extrair áudio
        audio_path = os.path.join(upload_folder, f"temp_audio_{video_hash}.wav")
        extract_audio_from_video(video_path, audio_path)

        # Transcrever áudio
        update_progress(video_hash, 'transcribing', 40, 'Transcrevendo áudio com Whisper...')
        VideoTask.record_progress(
            video_hash,
            stage='transcribing',
            progress=40,
            message='Transcrevendo áudio com Whisper...',
        )
        transcribed_result = transcribe_audio(audio_path)
        segments = transcribed_result['segments']
        VideoTask.update_metadata(
            video_hash,
            duration_seconds=transcribed_result.get('duration'),
        )

        update_progress(video_hash, 'censoring', 70, 'Detectando palavras e gerando beeps...')
        VideoTask.record_progress(
            video_hash,
            stage='censoring',
            progress=70,
            message='Detectando palavras e gerando beeps...',
        )
        sanitized_subtitles, beep_intervals = censor_segments(
            segments,
            forbidden_words=forbidden_words,
        )

        # Criar estrutura de legendas
        subtitles = []
        for i, (start, end, text) in enumerate(sanitized_subtitles):
            subtitle = {
                'id': i,
                'start': start,
                'end': end,
                'text': text.strip(),
                'raw_text': segments[i].get('text', '').strip(),
                'confidence': segments[i].get('confidence', 0.5)
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
            },
            'forbidden_words': forbidden_words or list(settings.profanity_words),
            'beep_intervals': beep_intervals,
        }

        session_file = os.path.join(upload_folder, f"session_{video_hash}.json")
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)

        # Limpar arquivo de áudio temporário
        if os.path.exists(audio_path):
            os.remove(audio_path)

        update_progress(video_hash, 'completed', 100, 'Preview pronto!')
        VideoTask.record_progress(
            video_hash,
            stage='completed',
            progress=100,
            message='Preview pronto!',
            status='preview_ready',
        )

        return jsonify({
            'status': 'success',
            'video_hash': video_hash,
            'subtitles': subtitles,
            'video_info': session_data['video_info'],
            'forbidden_words': session_data['forbidden_words'],
            'beep_intervals': beep_intervals,
        })

    except Exception as e:
        print(f"Erro no processo de preview: {str(e)}")
        if 'video_hash' in locals():
            set_error(video_hash, str(e))
            VideoTask.mark_error(video_hash, str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500


@preview_bp.route('/update_subtitles', methods=['POST'])
@jwt_required()
def update_subtitles():
    """Atualiza as legendas editadas pelo usuário"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        video_hash = data.get('video_hash')
        updated_subtitles = data.get('subtitles')
        forbidden_words = data.get('forbidden_words')
        beep_intervals = data.get('beep_intervals')  # Novo: aceitar beeps editados

        if not video_hash or not updated_subtitles:
            return jsonify({'status': 'error', 'message': 'Dados incompletos'}), 400

        task = VideoTask.get_for_user(video_hash, str(user_id))
        if task is None:
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada para este usuário'}), 404

        # Carregar sessão existente
        session_file = os.path.join('uploads', f"session_{video_hash}.json")
        if not os.path.exists(session_file):
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada'}), 404

        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)

        # Atualizar legendas
        session_data['subtitles'] = updated_subtitles
        if forbidden_words is not None:
            filtered_words = [str(word).strip() for word in forbidden_words if str(word).strip()]
            if filtered_words:
                session_data['forbidden_words'] = filtered_words
            else:
                session_data['forbidden_words'] = list(settings.profanity_words)
        
        # Atualizar beep intervals se fornecidos
        if beep_intervals is not None:
            session_data['beep_intervals'] = beep_intervals

        # Salvar sessão atualizada
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)

        return jsonify({
            'status': 'success',
            'message': 'Legendas e beeps atualizados com sucesso'
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@preview_bp.route('/render_final_video', methods=['POST'])
@jwt_required()
def render_final_video():
    """Renderiza o vídeo final com as legendas editadas"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        video_hash = data.get('video_hash')
        subtitle_config = data.get('subtitle_config', {})
        requested_words = data.get('forbidden_words')
        custom_beep_intervals = data.get('beep_intervals')  # Novo: beeps editados do frontend

        if not video_hash:
            return jsonify({'status': 'error', 'message': 'Hash do vídeo é obrigatório'}), 400

        # Inicializar rastreamento de progresso
        initialize_progress(video_hash)
        update_progress(video_hash, 'loading_session', 5, 'Carregando sessão...')

        task = VideoTask.get_for_user(video_hash, str(user_id))
        if task is None:
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada para este usuário'}), 404

        VideoTask.record_progress(
            video_hash,
            stage='loading_session',
            progress=5,
            message='Carregando sessão...',
            status='rendering',
        )

        # Carregar sessão
        session_file = os.path.join('uploads', f"session_{video_hash}.json")
        if not os.path.exists(session_file):
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada'}), 404

        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)

        video_path = session_data['video_path']
        subtitles = session_data['subtitles']
        session_words = session_data.get('forbidden_words', list(settings.profanity_words))

        if isinstance(requested_words, (list, tuple)):
            forbidden_words = [str(word).strip() for word in requested_words if str(word).strip()]
            if not forbidden_words:
                forbidden_words = session_words
        else:
            forbidden_words = session_words

        # Usar beeps editados se fornecidos, senão recalcular
        update_progress(video_hash, 'processing_beeps', 20, 'Processando beeps...')
        VideoTask.record_progress(
            video_hash,
            stage='processing_beeps',
            progress=20,
            message='Processando beeps...',
        )
        if custom_beep_intervals is not None and isinstance(custom_beep_intervals, list):
            # Usar beeps editados pelo usuário
            beep_intervals = [
                (float(b[0]), float(b[1]))
                for b in custom_beep_intervals
                if isinstance(b, (list, tuple)) and len(b) >= 2
            ]
        else:
            # Recalcular beeps automaticamente
            segment_dicts = [
                {
                    'start': sub['start'],
                    'end': sub['end'],
                    'text': sub.get('raw_text', sub['text']),
                }
                for sub in subtitles
            ]

            sanitized_subtitles, beep_intervals = censor_segments(
                segment_dicts,
                forbidden_words=forbidden_words,
            )

        # Sempre usar legendas da sessão (já editadas)
        subtitle_tuples = [(sub['start'], sub['end'], sub['text']) for sub in subtitles]

        # Caminho do vídeo final
        output_video_name = f"final_{video_hash}.mp4"
        output_video_path = os.path.join('uploads', output_video_name)

        # Renderizar vídeo
        update_progress(video_hash, 'rendering_video', 40, 'Renderizando vídeo com efeitos...')
        VideoTask.record_progress(
            video_hash,
            stage='rendering_video',
            progress=40,
            message='Renderizando vídeo com efeitos...',
        )
        subtitle_options = SubtitleRenderingOptions(font_path=str(settings.font_path))
        create_video_with_subtitles(
            video_path,
            subtitle_tuples,
            output_video_path,
            subtitle_options,
            beep_intervals=beep_intervals,
            beep_frequency=settings.beep_frequency,
            beep_volume=settings.beep_volume,
        )

        update_progress(video_hash, 'finalizing', 90, 'Finalizando arquivo...')
        VideoTask.record_progress(
            video_hash,
            stage='finalizing',
            progress=90,
            message='Finalizando arquivo...',
        )

        # Limpar sessão e arquivos temporários após renderização
        # (mantém apenas o vídeo final por 24h para download)
        clean_session_by_hash(video_hash, keep_final_video=True)
        VideoTask.clear_session_reference(video_hash)

        update_progress(video_hash, 'completed', 100, 'Vídeo pronto para download!')
        VideoTask.mark_completed(
            video_hash,
            output_video_path,
            message='Vídeo pronto para download!',
        )

        return send_file(output_video_path, as_attachment=False, mimetype='video/mp4')

    except Exception as e:
        print(f"Erro na renderização: {str(e)}")
        if 'video_hash' in locals():
            set_error(video_hash, str(e))
            VideoTask.mark_error(video_hash, str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500


@preview_bp.route('/get_session/<video_hash>', methods=['GET'])
@jwt_required()
def get_session(video_hash):
    """Recupera dados da sessão"""
    try:
        user_id = get_jwt_identity()
        task = VideoTask.get_for_user(video_hash, str(user_id))
        if task is None:
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada para este usuário'}), 404
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


@preview_bp.route('/get_video/<video_hash>', methods=['GET'])
@jwt_required()
def get_video(video_hash):
    """Serve o vídeo original para preview"""
    try:
        user_id = get_jwt_identity()
        task = VideoTask.get_for_user(video_hash, str(user_id))
        if task is None:
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada para este usuário'}), 404
        session_file = os.path.join('uploads', f"session_{video_hash}.json")
        if not os.path.exists(session_file):
            return jsonify({'status': 'error', 'message': 'Sessão não encontrada'}), 404

        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)

        video_path = session_data.get('video_path')
        if not video_path or not os.path.exists(video_path):
            return jsonify({'status': 'error', 'message': 'Vídeo não encontrado'}), 404

        return send_file(video_path, mimetype='video/mp4')

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500