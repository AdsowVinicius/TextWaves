from flask_sqlalchemy import SQLAlchemy

# Instância única do SQLAlchemy
db = SQLAlchemy()

def init_database(app):
    """Inicializa o banco de dados com a aplicação Flask"""
    db.init_app(app)
    
    with app.app_context():
        try:
            db.create_all()
            print("Banco de dados inicializado com sucesso!")
            return True
        except Exception as e:
            print(f"Erro ao inicializar banco de dados: {str(e)}")
            return False