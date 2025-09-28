from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from functools import wraps

# Importe o modelo de usuário
from models.user_model import User, db

# Blueprint para gerenciamento de usuários
users_bp = Blueprint('users', __name__)

def admin_required(f):
    """Decorator para verificar se o usuário é admin"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin():
            return jsonify({'error': 'Acesso negado. Privilégios de administrador necessários'}), 403
            
        return f(*args, **kwargs)
    return decorated_function

@users_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    """Lista todos os usuários (apenas admin)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '', type=str)
        role_filter = request.args.get('role', '', type=str)
        
        # Construir query
        query = User.query
        
        # Filtro de busca
        if search:
            query = query.filter(
                (User.username.contains(search)) | 
                (User.email.contains(search))
            )
        
        # Filtro de role
        if role_filter:
            query = query.filter(User.role == role_filter)
        
        # Ordenação
        query = query.order_by(User.created_at.desc())
        
        # Paginação
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        users = [user.to_dict() for user in pagination.items]
        
        return jsonify({
            'users': users,
            'pagination': {
                'page': page,
                'pages': pagination.pages,
                'per_page': per_page,
                'total': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/users/<string:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """Obter detalhes de um usuário específico"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """Criar novo usuário (apenas admin)"""
    try:
        data = request.get_json()
        
        # Validação dos campos obrigatórios
        required_fields = ['username', 'email', 'password', 'role']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Campo {field} é obrigatório'}), 400
        
        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        role = data['role']
        
        # Validações
        if role not in ['admin', 'user']:
            return jsonify({'error': 'Role deve ser "admin" ou "user"'}), 400
        
        # Verificar se usuário já existe
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Nome de usuário já existe'}), 409
            
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 409
        
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
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/users/<string:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Atualizar usuário (apenas admin)"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        data = request.get_json()
        
        # Atualizar campos
        if 'username' in data and data['username'].strip():
            new_username = data['username'].strip()
            if new_username != user.username:
                if User.query.filter_by(username=new_username).first():
                    return jsonify({'error': 'Nome de usuário já existe'}), 409
                user.username = new_username
        
        if 'email' in data and data['email'].strip():
            new_email = data['email'].strip().lower()
            if new_email != user.email:
                if User.query.filter_by(email=new_email).first():
                    return jsonify({'error': 'Email já cadastrado'}), 409
                user.email = new_email
        
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        if 'role' in data and data['role'] in ['admin', 'user']:
            user.role = data['role']
        
        if 'is_active' in data:
            user.is_active = bool(data['is_active'])
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário atualizado com sucesso',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/users/<string:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Deletar usuário (apenas admin)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Não permitir deletar a si mesmo
        if user_id == current_user_id:
            return jsonify({'error': 'Você não pode deletar sua própria conta'}), 400
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        # Verificar se não é o único admin
        if user.is_admin():
            admin_count = User.query.filter_by(role='admin', is_active=True).count()
            if admin_count <= 1:
                return jsonify({'error': 'Não é possível deletar o único administrador ativo'}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'Usuário deletado com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/users/<string:user_id>/toggle-status', methods=['PATCH'])
@admin_required
def toggle_user_status(user_id):
    """Ativar/desativar usuário"""
    try:
        current_user_id = get_jwt_identity()
        
        # Não permitir alterar status próprio
        if user_id == current_user_id:
            return jsonify({'error': 'Você não pode alterar o status da sua própria conta'}), 400
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        # Se for admin, verificar se não é o único ativo
        if user.is_admin() and user.is_active:
            active_admin_count = User.query.filter_by(role='admin', is_active=True).count()
            if active_admin_count <= 1:
                return jsonify({'error': 'Não é possível desativar o único administrador ativo'}), 400
        
        user.is_active = not user.is_active
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        status = 'ativado' if user.is_active else 'desativado'
        
        return jsonify({
            'message': f'Usuário {status} com sucesso',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/users/stats', methods=['GET'])
@admin_required
def get_user_stats():
    """Obter estatísticas de usuários"""
    try:
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        admin_users = User.query.filter_by(role='admin').count()
        regular_users = User.query.filter_by(role='user').count()
        
        # Usuários criados nos últimos 7 dias
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_users = User.query.filter(User.created_at >= seven_days_ago).count()
        
        return jsonify({
            'stats': {
                'total_users': total_users,
                'active_users': active_users,
                'inactive_users': total_users - active_users,
                'admin_users': admin_users,
                'regular_users': regular_users,
                'recent_users': recent_users
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500