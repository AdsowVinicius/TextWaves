from flask import Flask, request, jsonify, send_file
from flask_jwt_extended import JWTManager
from utils.generateStrFileVideo import generate_str_file_and_video
import os
import uuid
from flask_cors import CORS
from datetime import timedelta

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configurações JWT
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'textwaves-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Inicializar JWT
jwt = JWTManager(app)

# Configuração do banco de dados
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///textwaves.db')
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
app.register_blueprint(preview_bp)

# Diretório para armazenar os vídeos enviados
UPLOAD_FOLDER = 'uploads'
try:
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Cria a pasta 'uploads' se não existir
    print(f"UPLOAD_FOLDER configurado em: {os.path.abspath(UPLOAD_FOLDER)}")
except Exception as e:
    print(f"Erro ao criar o diretório 'uploads': {str(e)}")

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Diretório do backend (ajustado para o seu caminho)
BACKEND_DIRECTORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(f"BACKEND_DIRECTORY configurado em: {BACKEND_DIRECTORY}")

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

        # Salvando o arquivo de vídeo no diretório de uploads
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_file.filename)
        try:
            video_file.save(video_path)
            print(f"Arquivo salvo em: {video_path}")
        except Exception as e:
            print(f"Erro ao salvar o arquivo: {str(e)}")
            return jsonify({'status': 'error', 'message': f"Erro ao salvar o arquivo: {str(e)}"}), 500

        # Gerando um nome aleatório para o arquivo de saída
        output_video_name = f"{uuid.uuid4().hex}.mp4"

        # Chamando a função para gerar o arquivo .str e vídeo
        try:
            str_file_path, output_video_path, video_hash = generate_str_file_and_video(
                video_path, BACKEND_DIRECTORY, output_video_name
            )
            print("Arquivo processado com sucesso!")
        except Exception as e:
            print(f"Erro ao processar o vídeo: {str(e)}")
            return jsonify({'status': 'error', 'message': f"Erro ao processar o vídeo: {str(e)}"}), 500
        from flask import jsonify, send_file

        # Chamando a função para gerar o arquivo .str e vídeo
        
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
        print(f"Erro inesperado: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)