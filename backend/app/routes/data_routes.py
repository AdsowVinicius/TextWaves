from flask import Blueprint, jsonify, request, Response
from utils.progress_tracker import get_progress, generate_sse_message, cleanup_progress
import json

data_bp = Blueprint("data", __name__)

@data_bp.route('/send', methods=['POST'])
def send_data():
    data = request.get_json()
    # Salve os dados no banco de dados ou processe-os aqui
    return jsonify({"message": "Data received successfully"}), 200

@data_bp.route('/fetch', methods=['GET'])
def fetch_data():
    # Exemplo de envio de dados para o frontend
    data = [{"id": 1, "name": "Sample Data"}]
    return jsonify(data), 200

@data_bp.route('/video_progress/<session_id>', methods=['GET'])
def video_progress(session_id):
    """
    SSE endpoint para monitorar progresso de processamento de vídeo em tempo real.
    Retorna EventStream que atualiza a cada 500ms até completar.
    """
    def generate_progress():
        max_attempts = 6000  # 50 minutos (6000 * 0.5s)
        attempts = 0
        
        while attempts < max_attempts:
            progress = get_progress(session_id)
            
            # Enviar progresso atual
            yield generate_sse_message(session_id)
            
            # Se completou (100%) ou erro, parar stream
            if progress.get('progress', 0) >= 100 or progress.get('error'):
                cleanup_progress(session_id)
                break
            
            attempts += 1
            # Pequena pausa para não sobrecarregar conexão (500ms)
            import time
            time.sleep(0.5)
    
    return Response(
        generate_progress(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )

@data_bp.route('/video_progress/<session_id>', methods=['DELETE'])
def cleanup_video_progress(session_id):
    """Limpar progresso de uma sessão"""
    cleanup_progress(session_id)
    return jsonify({"message": "Progress cleanup completed"}), 200
