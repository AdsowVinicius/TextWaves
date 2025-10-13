from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import timedelta
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.utils import secure_filename

from config import settings
from utils.generateStrFileVideo import generate_str_file_and_video
from utils.session_cleaner import startup_cleanup

logging.basicConfig(
    level=os.getenv("TEXTWAVES_LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configurações JWT
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'textwaves-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Inicializar JWT
jwt = JWTManager(app)

# Configuração do banco de dados
default_db_path = settings.base_dir / 'instance' / 'textwaves.db'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', f'sqlite:///{default_db_path}')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializar banco de dados
from database.db_config import init_database
init_database(app)

# Registrar blueprints
from routes.auth_routes import auth_bp
from routes.user_management_routes import users_bp
from routes.preview_routes import preview_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api')
app.register_blueprint(preview_bp, url_prefix='/api')

# Executar limpeza de sessões antigas na inicialização (> 24 horas)
startup_cleanup(max_age_hours=24)

# Diretório para armazenar os vídeos enviados
app.config['UPLOAD_FOLDER'] = str(settings.upload_dir)
logger.info("UPLOAD_FOLDER configurado em: %s", app.config['UPLOAD_FOLDER'])

# Diretório do backend (ajustado para o seu caminho)
BACKEND_DIRECTORY = str(settings.base_dir.parent)
logger.info("BACKEND_DIRECTORY configurado em: %s", BACKEND_DIRECTORY)

ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.mkv', '.avi', '.webm'}


def _is_allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


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


@app.route('/api/config/profanity_words', methods=['GET'])
def get_profanity_words():
    return jsonify({
        'words': list(settings.profanity_words),
        'default_words': list(settings.profanity_words),
    })

@app.route('/open-api', methods=['GET'])
def open_api():
    return jsonify({"message": "Access granted to everyone!"})

@app.route('/process_video', methods=['POST'])
def process_video():
    try:
        # Verificar se há um arquivo de vídeo no request
        if 'video' not in request.files:
            return jsonify({'status': 'error', 'message': "Nenhum arquivo de vídeo enviado!"}), 400

        video_file = request.files['video']  # Obtendo o arquivo enviado
        if video_file.filename == '':
            return jsonify({'status': 'error', 'message': "Nenhum arquivo selecionado!"}), 400

        if not _is_allowed_file(video_file.filename):
            return jsonify({'status': 'error', 'message': "Formato de arquivo não suportado."}), 400

        safe_name = secure_filename(video_file.filename)
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
        try:
            video_file.save(video_path)
            logger.info("Arquivo salvo em: %s", video_path)
        except Exception as e:
            logger.exception("Erro ao salvar o arquivo")
            return jsonify({'status': 'error', 'message': f"Erro ao salvar o arquivo: {str(e)}"}), 500

        forbidden_words = _parse_forbidden_words(request.form.get('forbidden_words'))

        # Gerando um nome aleatório para o arquivo de saída
        output_video_name = f"{uuid.uuid4().hex}.mp4"

        # Chamando a função para gerar o arquivo .str e vídeo
        try:
            str_file_path, output_video_path, video_hash = generate_str_file_and_video(
                video_path,
                BACKEND_DIRECTORY,
                output_video_name,
                forbidden_words=forbidden_words,
            )
            logger.info("Arquivo processado com sucesso! video_hash=%s", video_hash)
        except Exception as e:
            logger.exception("Erro ao processar o vídeo")
            return jsonify({'status': 'error', 'message': f"Erro ao processar o vídeo: {str(e)}"}), 500

        # Preparando a resposta com o caminho dos arquivos gerados e o hash do vídeo
        response = {
            'status': 'success',
            'video_hash': video_hash,
            'str_file': str_file_path
        }

        # Retornando o vídeo diretamente ao cliente
        return send_file(output_video_path, as_attachment=False, mimetype='video/mp4')


    except Exception as e:
        # Caso ocorra algum erro, retornamos uma resposta de erro
        logger.exception("Erro inesperado ao processar vídeo")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)