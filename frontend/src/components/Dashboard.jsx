import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin() && activeTab === 'overview') {
      loadStats();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { apiCall } = useAuth();
      const response = await apiCall('http://localhost:5000/api/users/stats');
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      await logout();
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🎥 TextWaves Dashboard</h1>
          <span className="user-info">
            Bem-vindo, <strong>{user?.username}</strong>
            {isAdmin() && <span className="admin-badge">Admin</span>}
          </span>
        </div>
        <div className="header-right">
          <button className="btn btn-outline" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Visão Geral
        </button>
        
        <button 
          className={`nav-btn ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          🎬 Meus Vídeos
        </button>

        {isAdmin() && (
          <button 
            className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Gerenciar Usuários
          </button>
        )}

        <button 
          className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          ⚙️ Perfil
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="tab-content">
            <h2>📊 Visão Geral</h2>
            
            {isAdmin() && stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>👥 Total de Usuários</h3>
                  <div className="stat-number">{stats.total_users}</div>
                </div>
                
                <div className="stat-card">
                  <h3>✅ Usuários Ativos</h3>
                  <div className="stat-number">{stats.active_users}</div>
                </div>
                
                <div className="stat-card">
                  <h3>🔒 Administradores</h3>
                  <div className="stat-number">{stats.admin_users}</div>
                </div>
                
                <div className="stat-card">
                  <h3>📈 Novos (7 dias)</h3>
                  <div className="stat-number">{stats.recent_users}</div>
                </div>
              </div>
            )}

            <div className="welcome-section">
              <h3>🚀 Bem-vindo ao TextWaves!</h3>
              <p>Sistema avançado de legendagem automática de vídeos.</p>
              
              <div className="quick-actions">
                <button className="btn btn-primary">
                  📤 Novo Vídeo
                </button>
                <button className="btn btn-secondary">
                  📋 Ver Histórico
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="tab-content">
            <h2>🎬 Meus Vídeos</h2>
            <div className="empty-state">
              <p>Nenhum vídeo processado ainda.</p>
              <button className="btn btn-primary">Processar Primeiro Vídeo</button>
            </div>
          </div>
        )}

        {activeTab === 'users' && isAdmin() && (
          <UserManagement />
        )}

        {activeTab === 'profile' && (
          <div className="tab-content">
            <h2>⚙️ Perfil do Usuário</h2>
            <div className="profile-section">
              <div className="profile-info">
                <h3>Informações Pessoais</h3>
                <div className="info-row">
                  <label>Nome de usuário:</label>
                  <span>{user?.username}</span>
                </div>
                <div className="info-row">
                  <label>Email:</label>
                  <span>{user?.email}</span>
                </div>
                <div className="info-row">
                  <label>Tipo de conta:</label>
                  <span className={`role ${user?.role}`}>
                    {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </span>
                </div>
                <div className="info-row">
                  <label>Membro desde:</label>
                  <span>{new Date(user?.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="profile-actions">
                <button className="btn btn-secondary">
                  ✏️ Editar Perfil
                </button>
                <button className="btn btn-outline">
                  🔒 Alterar Senha
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;