import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserManagement from "./UserManagement";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, logout, isAdmin, apiCall } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [videoHistory, setVideoHistory] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState("");
  const navigate = useNavigate();

  const loadVideoHistory = useCallback(async (silent = false) => {
    if (!silent) {
      setVideosLoading(true);
      setVideosError("");
    }

    try {
      const response = await apiCall("http://localhost:5000/api/videos");

      if (response.ok) {
        const data = await response.json();
        setVideoHistory(Array.isArray(data.videos) ? data.videos : []);
        setVideosError("");
      } else {
        let payload = {};
        try {
          payload = await response.json();
        } catch (jsonError) {
          payload = {};
        }
        const message =
          payload.error ||
          payload.message ||
          "Não foi possível carregar o histórico de vídeos.";
        setVideosError(message);
      }
    } catch (error) {
      setVideosError(`Erro ao carregar vídeos: ${error.message}`);
    } finally {
      if (!silent) {
        setVideosLoading(false);
      }
    }
  }, [apiCall]);

  useEffect(() => {
    if (isAdmin() && activeTab === "overview") {
      loadStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "videos") {
      loadVideoHistory();
    }
  }, [activeTab, loadVideoHistory]);

  useEffect(() => {
    if (activeTab !== "videos") {
      return;
    }

    const hasPending = videoHistory.some((video) =>
      ["processing", "rendering", "preview_ready"].includes(video.status)
    );

    if (!hasPending) {
      return;
    }

    const interval = setInterval(() => {
      loadVideoHistory(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, videoHistory, loadVideoHistory]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await apiCall("http://localhost:5000/api/users/stats");

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else if (response.status === 403) {
        console.warn(
          "Acesso negado às estatísticas. Verifique se você é admin."
        );
        setStats(null);
      } else {
        console.error("Erro ao carregar estatísticas:", response.status);
        setStats(null);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "—";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds)) {
      return null;
    }
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const remainingSeconds = total % 60;
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
  };

  const getStatusConfig = (status) => {
    const map = {
      processing: { label: "Processando preview", className: "status-processing" },
      preview_ready: { label: "Preview pronto", className: "status-preview" },
      rendering: { label: "Renderizando vídeo", className: "status-rendering" },
      completed: { label: "Concluído", className: "status-completed" },
      error: { label: "Erro", className: "status-error" },
    };
    return map[status] || { label: "Em andamento", className: "status-default" };
  };

  const handleOpenVideo = (video) => {
    if (!video?.video_hash) {
      return;
    }

    if (!video.can_resume) {
      alert("A sessão deste vídeo expirou. Envie o arquivo novamente para editar.");
      return;
    }

    navigate(`/Editor?video_hash=${video.video_hash}`);
  };

  const handleDownloadVideo = async (video) => {
    if (!video?.video_hash) {
      return;
    }

    setVideosError("");

    try {
      const response = await apiCall(
        `http://localhost:5000/api/videos/${video.video_hash}/download`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        let payload = {};
        try {
          payload = await response.json();
        } catch (jsonError) {
          payload = {};
        }

        const message =
          payload.error || payload.message || "Falha ao baixar o vídeo.";
        setVideosError(message);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const stem = video.filename
        ? video.filename.replace(/\.[^/.]+$/, "")
        : "video";
      link.download = `${stem}_textwaves.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setVideosError(`Erro ao baixar vídeo: ${error.message}`);
    }
  };

  const handleDeleteVideo = async (video) => {
    if (!video?.video_hash) {
      return;
    }

    const confirmDelete = window.confirm(
      "Tem certeza que deseja remover este vídeo do histórico?"
    );
    if (!confirmDelete) {
      return;
    }

    setVideosError("");

    try {
      const response = await apiCall(
        `http://localhost:5000/api/videos/${video.video_hash}`,
        {
          method: "DELETE",
        }
      );

      let payload = {};
      try {
        payload = await response.json();
      } catch (jsonError) {
        payload = {};
      }

      if (!response.ok) {
        const message =
          payload.error ||
          payload.message ||
          "Não foi possível remover o vídeo do histórico.";
        setVideosError(message);
        return;
      }

      setVideoHistory((prev) =>
        prev.filter((item) => item.video_hash !== video.video_hash)
      );
    } catch (error) {
      setVideosError(`Erro ao excluir vídeo: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair?")) {
      await logout();
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditMessage("");

    try {
      const response = await apiCall("http://localhost:5000/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: editFormData.username,
          email: editFormData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEditMessage("✓ Perfil atualizado com sucesso!");
        setTimeout(() => {
          setShowEditModal(false);
          setEditMessage("");
          window.location.reload();
        }, 1500);
      } else {
        setEditMessage(`✗ Erro: ${data.message || data.error || "Falha ao atualizar perfil"}`);
      }
    } catch (error) {
      setEditMessage(`✗ Erro de conexão: ${error.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage("");

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setPasswordMessage("✗ As senhas não correspondem!");
      setPasswordLoading(false);
      return;
    }

    if (passwordFormData.newPassword.length < 6) {
      setPasswordMessage("✗ A nova senha deve ter pelo menos 6 caracteres!");
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await apiCall(
        "http://localhost:5000/api/auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_password: passwordFormData.currentPassword,
            new_password: passwordFormData.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage("✓ Senha alterada com sucesso!");
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordMessage("");
          setPasswordFormData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        }, 1500);
      } else {
        setPasswordMessage(`✗ Erro: ${data.message || data.error || "Falha ao alterar senha"}`);
      }
    } catch (error) {
      setPasswordMessage(`✗ Erro de conexão: ${error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-lista">
          <button
            className={`nav-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            📊 Visão Geral
          </button>

          <button
            className={`nav-btn ${activeTab === "videos" ? "active" : ""}`}
            onClick={() => setActiveTab("videos")}
          >
            🎬 Meus Vídeos
          </button>

          {isAdmin() && (
            <button
              className={`nav-btn ${activeTab === "users" ? "active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              👥 Gerenciar Usuários
            </button>
          )}

          <button
            className={`nav-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            ⚙️ Perfil
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        {activeTab === "overview" && (
          <div className="tab-content">
            <h2 className="titulo-dashboard">📊 Visão Geral</h2>

            {isAdmin() && loading && (
              <div className="loading-state">
                <p>Carregando estatísticas...</p>
              </div>
            )}

            {isAdmin() && !loading && stats === null && (
              <div className="info-message">
                <p>
                  ℹ️ Não foi possível carregar as estatísticas. Verifique suas
                  permissões.
                </p>
              </div>
            )}

            {isAdmin() && !loading && stats && (
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
              <h3>Bem-vindo ao TextWaves!</h3>
              <p>Sistema avançado de legendagem automática de vídeos.</p>

              <div className="quick-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/Projeto")}
                >
                  📤 Novo Vídeo
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setActiveTab("videos")}
                >
                  📋 Ver Histórico
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "videos" && (
          <div className="tab-content">
            <h2 className="titulo-dashboard">🎬 Meus Vídeos</h2>

            {videosError && (
              <div className="info-message error">
                <p>{videosError}</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => loadVideoHistory(false)}
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {videosLoading && (
              <div className="loading-state">
                <p>Carregando histórico...</p>
              </div>
            )}

            {!videosLoading && videoHistory.length === 0 && !videosError && (
              <div className="empty-state">
                <p>Nenhum vídeo processado ainda.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/Projeto")}
                >
                  Processar Primeiro Vídeo
                </button>
              </div>
            )}

            {!videosLoading && videoHistory.length > 0 && (
              <div className="video-list">
                {videoHistory.map((video) => {
                  const status = getStatusConfig(video.status);
                  const progressValue = Math.round(video.progress ?? 0);
                  const durationLabel = formatDuration(video.duration_seconds);

                  return (
                    <div className="video-card" key={video.video_hash}>
                      <div className="video-card-header">
                        <div>
                          <h3 className="video-title">{video.filename}</h3>
                          <span className={`video-status ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <span className="video-hash">#{video.video_hash}</span>
                      </div>

                      <p className="video-message">
                        {video.message ||
                          (video.status === "error"
                            ? "Falha no processamento."
                            : "Aguardando atualização de status...")}
                      </p>

                      {video.status === "error" && video.last_error && (
                        <p className="video-error-detail">{video.last_error}</p>
                      )}

                      <div className="progress-wrapper">
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.max(0, Math.min(100, progressValue))}%`,
                            }}
                          ></div>
                        </div>
                        <span className="progress-value">
                          {Math.max(0, Math.min(100, progressValue))}%
                        </span>
                      </div>

                      <div className="video-meta">
                        <span>Iniciado: {formatDateTime(video.created_at)}</span>
                        {video.updated_at && (
                          <span>Atualizado: {formatDateTime(video.updated_at)}</span>
                        )}
                        {durationLabel && <span>Duração: {durationLabel}</span>}
                      </div>

                      {!video.can_resume && (
                        <p className="video-note">
                          Sessão expirada. Envie o vídeo novamente para editar.
                        </p>
                      )}

                      <div className="video-actions">
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenVideo(video)}
                          disabled={!video.can_resume}
                          title={
                            video.can_resume
                              ? "Abrir vídeo no editor"
                              : "Sessão expirada. Envie o vídeo novamente para editar."
                          }
                        >
                          Abrir no Editor
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleDownloadVideo(video)}
                          disabled={!video.final_available}
                          title={
                            video.final_available
                              ? "Baixar vídeo final"
                              : "Renderização ainda em andamento"
                          }
                        >
                          Baixar Vídeo
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDeleteVideo(video)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && isAdmin() && <UserManagement />}

        {activeTab === "profile" && (
          <div className="tab-content">
            <h2 className="titulo-dashboard">⚙️ Perfil do Usuário</h2>
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
                    {user?.role === "admin" ? "Administrador" : "Usuário"}
                  </span>
                </div>
                <div className="info-row">
                  <label>Membro desde:</label>
                  <span>{new Date(user?.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="profile-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditFormData({
                      username: user?.username || "",
                      email: user?.email || "",
                    });
                    setShowEditModal(true);
                  }}
                >
                  ✏️ Editar Perfil
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={() => {
                    setPasswordFormData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                    setShowPasswordModal(true);
                  }}
                >
                  🔒 Alterar Senha
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Editar Perfil */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Editar Perfil</h2>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditProfile} className="modal-form">
              <div className="form-group">
                <label htmlFor="username">Nome de usuário:</label>
                <input
                  type="text"
                  id="username"
                  value={editFormData.username}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      username: e.target.value,
                    })
                  }
                  required
                  disabled={editLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      email: e.target.value,
                    })
                  }
                  required
                  disabled={editLoading}
                />
              </div>

              {editMessage && (
                <div
                  className={`message ${
                    editMessage.includes("✓") ? "success" : "error"
                  }`}
                >
                  {editMessage}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={editLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alterar Senha */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔒 Alterar Senha</h2>
              <button
                className="modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="modal-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Senha Atual:</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordFormData.currentPassword}
                  onChange={(e) =>
                    setPasswordFormData({
                      ...passwordFormData,
                      currentPassword: e.target.value,
                    })
                  }
                  required
                  disabled={passwordLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Nova Senha:</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordFormData.newPassword}
                  onChange={(e) =>
                    setPasswordFormData({
                      ...passwordFormData,
                      newPassword: e.target.value,
                    })
                  }
                  required
                  disabled={passwordLoading}
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Senha:</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordFormData.confirmPassword}
                  onChange={(e) =>
                    setPasswordFormData({
                      ...passwordFormData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  disabled={passwordLoading}
                  minLength="6"
                />
              </div>

              {passwordMessage && (
                <div
                  className={`message ${
                    passwordMessage.includes("✓") ? "success" : "error"
                  }`}
                >
                  {passwordMessage}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={passwordLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Alterando..." : "Alterar Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
