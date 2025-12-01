#!/usr/bin/env python
"""Script para criar um usuário de teste no banco de dados."""

import sys
import os

# Adicionar os diretórios corretos ao path
backend_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.join(backend_dir, 'app')
sys.path.insert(0, app_dir)

# Importar depois de configurar path
import app as app_module
from database.db_config import db
from models.user_model import User

def create_test_user():
    """Cria um usuário de teste para login."""
    
    with app_module.app.app_context():
        # Verificar se usuário já existe
        user = User.query.filter_by(username='testuser').first()
        if user:
            print("✓ Usuário 'testuser' já existe!")
            return
        
        # Criar novo usuário com password no construtor
        new_user = User(
            username='testuser',
            email='test@example.com',
            password='Test123!'
        )
        new_user.role = 'admin'
        
        db.session.add(new_user)
        db.session.commit()
        
        print(f"\n✅ Usuário criado com sucesso!")
        print(f"   Username: testuser")
        print(f"   Email: test@example.com")
        print(f"   Password: Test123!")
        print(f"   Role: admin")
        print(f"\nAgora você pode fazer login no frontend com essas credenciais.")

if __name__ == '__main__':
    create_test_user()
