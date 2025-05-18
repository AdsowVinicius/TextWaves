from flask import Flask
from app.models import db
from app.utils.db_config import init_db
from app.routes import auth_routes, data_routes
from app import *
# Agora você pode usar diretamente as funções importadas


def create_app():
    app = Flask(__name__)

    # Configurações da aplicação
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
    app.config['SECRET_KEY'] = 'sua_chave_secreta'

    # Inicializar banco de dados
    db.init_app(app)
    with app.app_context():
        init_db()

    # Registrar rotas
    app.register_blueprint(auth_routes.auth_bp, url_prefix="/auth")
    app.register_blueprint(data_routes.data_bp, url_prefix="/data")

    return app
