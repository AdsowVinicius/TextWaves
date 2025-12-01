import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const [formData, setFormData] = useState({
    login: "",
    password: "",
  });
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.access_token, data.refresh_token);
        navigate("/dashboard");
      } else {
        setError(data.error || "Erro no login");
      }
    } catch (error) {
      setError("Erro de conexão com o servidor");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (registerData.password !== registerData.confirmPassword) {
      setError("Senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerData.username,
          email: registerData.email,
          password: registerData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          data.message +
            (data.is_first_user ? " (Você é o primeiro usuário - Admin)" : "")
        );
        setIsLogin(true);
        setRegisterData({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        setError(data.error || "Erro no registro");
      }
    } catch (error) {
      setError("Erro de conexão com o servidor");
      console.error("Register error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e, isRegister = false) => {
    const { name, value } = e.target;
    if (isRegister) {
      setRegisterData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>TextWaves</h2>
          <p>Sistema de Legendagem de Vídeos</p>
        </div>

        <div className="login-tabs">
          <button
            className={`tab ${isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Entrar
          </button>
          <button
            className={`tab ${!isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(false)}
          >
            Registrar
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isLogin ? (
          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login">Email ou Usuário:</label>
              <input
                type="text"
                id="login"
                name="login"
                value={formData.login}
                onChange={handleInputChange}
                required
                placeholder="Digite seu email ou nome de usuário"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Digite sua senha"
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Nome de Usuário:</label>
              <input
                type="text"
                id="username"
                name="username"
                value={registerData.username}
                onChange={(e) => handleInputChange(e, true)}
                required
                placeholder="Escolha um nome de usuário"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={registerData.email}
                onChange={(e) => handleInputChange(e, true)}
                required
                placeholder="Digite seu email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={registerData.password}
                onChange={(e) => handleInputChange(e, true)}
                required
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Senha:</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={registerData.confirmPassword}
                onChange={(e) => handleInputChange(e, true)}
                required
                placeholder="Confirme sua senha"
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Registrando..." : "Registrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
