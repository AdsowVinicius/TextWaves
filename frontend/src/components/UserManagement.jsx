import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './UserManagement.css';

const UserManagement = () => {
  const { apiCall } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    page: 1,
    per_page: 10
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await apiCall(`http://localhost:5000/api/users?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall('http://localhost:5000/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowCreateModal(false);
        setNewUser({ username: '', email: '', password: '', role: 'user' });
        loadUsers();
      } else {
        const errorData = await response.json();
        alert('Erro: ' + errorData.error);
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      alert('Erro de conexão');
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      const response = await apiCall(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setEditingUser(null);
        loadUsers();
      } else {
        const errorData = await response.json();
        alert('Erro: ' + errorData.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro de conexão');
    }
  };

  const handleToggleStatus = async (userId) => {
    if (!confirm('Tem certeza que deseja alterar o status deste usuário?')) {
      return;
    }

    try {
      const response = await apiCall(`http://localhost:5000/api/users/${userId}/toggle-status`, {
        method: 'PATCH',
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        loadUsers();
      } else {
        const errorData = await response.json();
        alert('Erro: ' + errorData.error);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro de conexão');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Tem certeza que deseja DELETAR este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await apiCall(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        loadUsers();
      } else {
        const errorData = await response.json();
        alert('Erro: ' + errorData.error);
      }
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      alert('Erro de conexão');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: field !== 'page' ? 1 : value // Reset page when other filters change
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="tab-content">
      <div className="users-header">
        <h2>👥 Gerenciamento de Usuários</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="users-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="🔍 Buscar por nome ou email..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os tipos</option>
            <option value="admin">Administradores</option>
            <option value="user">Usuários</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filters.per_page}
            onChange={(e) => handleFilterChange('per_page', parseInt(e.target.value))}
            className="filter-select"
          >
            <option value={5}>5 por página</option>
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </div>
      </div>

      {/* Tabela de usuários */}
      <div className="users-table-container">
        {loading ? (
          <div className="loading">Carregando usuários...</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Último login</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <strong>{user.username}</strong>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? '🔒 Admin' : '👤 Usuário'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? '✅ Ativo' : '❌ Inativo'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>{user.last_login ? formatDate(user.last_login) : 'Nunca'}</td>
                  <td>
                    <div className="user-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditingUser(user)}
                        title="Editar usuário"
                      >
                        ✏️
                      </button>
                      
                      <button
                        className={`btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleToggleStatus(user.id)}
                        title={user.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {user.is_active ? '🔒' : '🔓'}
                      </button>
                      
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Deletar usuário"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            disabled={!pagination.has_prev}
            onClick={() => handleFilterChange('page', pagination.page - 1)}
          >
            ⬅️ Anterior
          </button>
          
          <span className="page-info">
            Página {pagination.page} de {pagination.pages} 
            ({pagination.total} usuários)
          </span>
          
          <button
            className="btn btn-sm"
            disabled={!pagination.has_next}
            onClick={() => handleFilterChange('page', pagination.page + 1)}
          >
            Próxima ➡️
          </button>
        </div>
      )}

      {/* Modal de criação de usuário */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>➕ Criar Novo Usuário</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ❌
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="user-form">
              <div className="form-group">
                <label>Nome de usuário:</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Senha:</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Tipo:</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="user">👤 Usuário</option>
                  <option value="admin">🔒 Administrador</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de edição de usuário */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>✏️ Editar Usuário</h3>
              <button 
                className="close-btn"
                onClick={() => setEditingUser(null)}
              >
                ❌
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateUser(editingUser.id, editingUser);
            }} className="user-form">
              <div className="form-group">
                <label>Nome de usuário:</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Nova senha (deixe vazio para não alterar):</label>
                <input
                  type="password"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Tipo:</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                >
                  <option value="user">👤 Usuário</option>
                  <option value="admin">🔒 Administrador</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;