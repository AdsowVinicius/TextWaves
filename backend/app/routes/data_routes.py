from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.models import db

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
