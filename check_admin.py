"""Script para verificar e criar usuário admin de teste."""
import sys
import os

# Adicionar o diretório backend/app ao path
backend_app_path = os.path.join(os.path.dirname(__file__), 'backend', 'app')
sys.path.insert(0, backend_app_path)

from models.user_model import User, db
from database.db_config import init_database
from flask import Flask

print("\n" + "="*70)
print(" 🔐 VERIFICAÇÃO DE USUÁRIO ADMIN")
print("="*70)

# Criar app Flask temporário para acessar o banco
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///backend/instance/textwaves.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

init_database(app)

with app.app_context():
    # Verificar usuários existentes
    total_users = User.query.count()
    admin_users = User.query.filter_by(role='admin').count()
    
    print(f"\n📊 Status do Banco de Dados:")
    print(f"   • Total de usuários: {total_users}")
    print(f"   • Usuários admin: {admin_users}")
    
    if admin_users == 0:
        print("\n⚠️  NENHUM ADMIN ENCONTRADO!")
        print("\n🔧 Criando usuário admin de teste...")
        
        try:
            # Criar usuário admin
            admin = User(
                username='admin',
                email='admin@textwaves.com',
                role='admin',
                is_active=True
            )
            admin.set_password('admin123')
            
            db.session.add(admin)
            db.session.commit()
            
            print("\n✅ Usuário admin criado com sucesso!")
            print("\n📝 Credenciais:")
            print("   Username: admin")
            print("   Email: admin@textwaves.com")
            print("   Senha: admin123")
            print("\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!")
            
        except Exception as e:
            print(f"\n❌ Erro ao criar admin: {e}")
            db.session.rollback()
    else:
        print("\n✅ Usuário(s) admin encontrado(s)!")
        print("\n📝 Lista de admins:")
        
        admins = User.query.filter_by(role='admin').all()
        for admin in admins:
            status = "🟢 Ativo" if admin.is_active else "🔴 Inativo"
            print(f"   • {admin.username} ({admin.email}) - {status}")
        
    print("\n" + "="*70)
    print(" 🎯 COMO TESTAR O DASHBOARD")
    print("="*70)
    print("""
1. Faça login no frontend com um usuário admin
2. Vá para o Dashboard
3. As estatísticas devem aparecer na aba "Visão Geral"
4. Se aparecer erro 403, significa que:
   ✗ Você não está logado
   ✗ OU seu usuário não é admin

💡 Dica: O PRIMEIRO usuário a se registrar vira admin automaticamente!
    """)
    print("="*70 + "\n")
