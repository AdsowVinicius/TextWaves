# 🔒 Erro 403 em /api/users/stats - Documentação

## O que é o erro 403?

O erro `403 Forbidden` em `/api/users/stats` é **comportamento esperado e correto**! Significa que o endpoint está protegido e requer privilégios de administrador.

## Por que acontece?

O endpoint `/api/users/stats` está protegido pelo decorator `@admin_required`, que:

1. ✅ Verifica se o usuário está autenticado (tem token JWT válido)
2. ✅ Verifica se o usuário tem `role='admin'`
3. ❌ Se qualquer condição falhar → retorna 403

## Quando é normal ver esse erro?

### ✅ Situações normais (erro esperado):
- **Usuário não está logado** (sem token JWT)
- **Usuário comum** tentando acessar área admin
- **Token expirado** e não foi renovado
- **Usuário foi deslogado** mas a página não foi recarregada

### ❌ Situações problemáticas:
- Admin logado mas recebendo 403 (possível bug no token)
- Token não sendo enviado no header (problema no frontend)

## Como resolver?

### Para usuários:

1. **Faça login com uma conta admin**:
   ```
   - O primeiro usuário a se registrar vira admin automaticamente
   - OU solicite privilégios de admin ao administrador do sistema
   ```

2. **Verifique se está logado**:
   - Olhe no canto superior do Dashboard
   - Deve aparecer "Bem-vindo, [seu nome]" e badge "Admin"

3. **Se você é admin mas ainda vê o erro**:
   - Faça logout e login novamente
   - Limpe o localStorage do navegador (F12 → Application → Local Storage)
   - Verifique se o token não expirou

### Para desenvolvedores:

#### Verificar token no navegador:
```javascript
// Abra o Console (F12)
console.log('Token:', localStorage.getItem('accessToken'));
console.log('User:', JSON.parse(localStorage.getItem('user')));
```

#### Verificar no backend se usuário é admin:
```python
# No backend/app, execute:
from models.user_model import User
from database.db_config import db, init_database
from flask import Flask

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/textwaves.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

init_database(app)

with app.app_context():
    admins = User.query.filter_by(role='admin').all()
    for admin in admins:
        print(f"Admin: {admin.username} ({admin.email})")
```

## Comportamento atual do frontend

O Dashboard já trata corretamente o erro 403:

```javascript
// frontend/src/components/Dashboard.jsx, linha 23-33
const loadStats = async () => {
  try {
    const response = await apiCall('http://localhost:5000/api/users/stats');
    
    if (response.ok) {
      const data = await response.json();
      setStats(data.stats);
    } else if (response.status === 403) {
      console.warn('Acesso negado às estatísticas. Verifique se você é admin.');
      setStats(null);  // Apenas não mostra as estatísticas
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
};
```

**Resultado**: Usuários comuns veem o Dashboard mas sem as estatísticas (isso é correto).

## Endpoints protegidos por admin_required

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/users` | GET | Listar todos os usuários |
| `/api/users/<id>` | GET | Ver detalhes de usuário |
| `/api/users/<id>/role` | PUT | Alterar role de usuário |
| `/api/users/<id>` | DELETE | Deletar usuário |
| `/api/users/stats` | GET | **Estatísticas do sistema** |

## Resumo

✅ **O erro 403 NÃO é um bug!** É proteção de segurança funcionando corretamente.

✅ **O frontend já trata o erro** e não mostra mensagens irritantes ao usuário.

✅ **Para ver as estatísticas**, basta fazer login com uma conta admin.

💡 **Dica**: O primeiro usuário a se registrar no sistema automaticamente vira admin!

## Logs normais

É completamente normal ver nos logs:

```
2025-10-12 21:34:23,360 [INFO] werkzeug - 127.0.0.1 - - [12/Oct/2025 21:34:23] "GET /api/users/stats HTTP/1.1" 403 -
```

Isso só significa que alguém sem permissão tentou acessar. O sistema bloqueou corretamente! 🔒✅
