from flask import Flask, request, jsonify
from ..utils import generate_str_file_and_video
from ..database.db_manager import save_video_data
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'mp4', 'avi', 'mov'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/output', methods=['POST'])
def upload_video():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(video_path)

        backend_directory = os.getcwd()
        output_video_name = f"output_{filename}"
        
        # Gerar arquivos .str e vídeo com legendas
        str_file, output_video, video_hash = generate_str_file_and_video(video_path, backend_directory, output_video_name)

        # Salvar dados no banco de dados
        save_video_data(video_hash, output_video, str_file)

        return jsonify({
            'video_hash': video_hash,
            'video_path': output_video,
            'str_file_path': str_file
        }), 200