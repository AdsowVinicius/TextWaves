

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Altera a senha do usuário atual"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        data = request.get_json()
        
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Senha atual e nova senha são obrigatórias'}), 400
        
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Senha atual incorreta'}), 401
        
        is_valid, msg = validate_password(data['new_password'])
        if not is_valid:
            return jsonify({'error': msg}), 400
        
        if user.check_password(data['new_password']):
            return jsonify({'error': 'Nova senha deve ser diferente da atual'}), 400
        
        user.set_password(data['new_password'])
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'Senha alterada com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500
