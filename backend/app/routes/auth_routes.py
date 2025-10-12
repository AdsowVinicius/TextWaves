from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from datetime import datetime, timedelta
import re
from sqlalchemy import func

# Importe o modelo de usuário
from models.user_model import User, TokenBlacklist, db

# Blueprint para autenticação
auth_bp = Blueprint('auth', __name__)

def validate_email(email):
    """Valida formato do email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Valida força da senha"""
    if len(password) < 6:
        return False, "Senha deve ter pelo menos 6 caracteres"
    return True, ""

@auth_bp.route('/register', methods=['POST'])
def register():
    """Registra um novo usuário"""
    try:
        data = request.get_json()
        
        # Validação dos campos obrigatórios
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Campo {field} é obrigatório'}), 400

        username = data['username'].strip()
        username_lower = username.lower()
        email = data['email'].strip().lower()
        password = data['password']
        role = data.get('role', 'user')  # Default: user
        
        # Validações
        if not validate_email(email):
            return jsonify({'error': 'Formato de email inválido'}), 400
            
        is_valid, msg = validate_password(password)
        if not is_valid:
            return jsonify({'error': msg}), 400
        
        # Verificar se usuário já existe
        if User.query.filter(func.lower(User.username) == username_lower).first():
            return jsonify({'error': 'Nome de usuário já existe'}), 409
            
        if User.query.filter(func.lower(User.email) == email).first():
            return jsonify({'error': 'Email já cadastrado'}), 409
        
        # Verificar se é o primeiro usuário (será admin)
        is_first_user = User.query.count() == 0
        if is_first_user:
            role = 'admin'
        
        # Criar usuário
        user = User(
            username=username,
            email=email,
            password=password,
            role=role
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'user': user.to_dict(),
            'is_first_user': is_first_user
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Autentica um usuário"""
    try:
        data = request.get_json()
        
        if not data or not data.get('login') or not data.get('password'):
            return jsonify({'error': 'Login e senha são obrigatórios'}), 400

        login_input = data['login'].strip()
        login_normalized = login_input.lower()
        password = data['password']
        
        # Buscar usuário por email ou username
        user = User.query.filter(
            (func.lower(User.email) == login_normalized) |
            (func.lower(User.username) == login_normalized)
        ).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Credenciais inválidas'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Usuário desativado'}), 401
        
        # Atualizar último login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Criar tokens
        access_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(hours=24)
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            expires_delta=timedelta(days=30)
        )
        
        return jsonify({
            'message': 'Login realizado com sucesso',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Renova o token de acesso"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Usuário inválido'}), 401
        
        new_token = create_access_token(
            identity=user_id,
            expires_delta=timedelta(hours=24)
        )
        
        return jsonify({
            'access_token': new_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Faz logout do usuário (adiciona token na blacklist)"""
    try:
        jti = get_jwt()['jti']
        user_id = get_jwt_identity()
        
        # Adicionar token na blacklist
        blacklisted_token = TokenBlacklist(
            jti=jti,
            token_type='access',
            user_id=user_id,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        db.session.add(blacklisted_token)
        db.session.commit()
        
        return jsonify({'message': 'Logout realizado com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Retorna perfil do usuário atual"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        return jsonify({
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Atualiza perfil do usuário atual"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        data = request.get_json()
        
        # Campos permitidos para atualização
        if 'username' in data and data['username'].strip():
            new_username = data['username'].strip()
            if new_username != user.username:
                if User.query.filter_by(username=new_username).first():
                    return jsonify({'error': 'Nome de usuário já existe'}), 409
                user.username = new_username
        
        if 'email' in data and data['email'].strip():
            new_email = data['email'].strip().lower()
            if not validate_email(new_email):
                return jsonify({'error': 'Formato de email inválido'}), 400
            if new_email != user.email:
                if User.query.filter_by(email=new_email).first():
                    return jsonify({'error': 'Email já cadastrado'}), 409
                user.email = new_email
        
        if 'password' in data and data['password']:
            is_valid, msg = validate_password(data['password'])
            if not is_valid:
                return jsonify({'error': msg}), 400
            user.set_password(data['password'])
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Perfil atualizado com sucesso',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500