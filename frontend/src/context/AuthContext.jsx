import { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados do localStorage na inicialização
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedUser && storedAccessToken) {
      try {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
      } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData, token, refresh) => {
    setUser(userData);
    setAccessToken(token);
    setRefreshToken(refresh);

    // Salvar no localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', token);
    if (refresh) {
      localStorage.setItem('refreshToken', refresh);
    }
  };

  const logout = async () => {
    try {
      // Tentar fazer logout no servidor
      if (accessToken) {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    }

    // Limpar estado e localStorage
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.access_token);
        setUser(data.user);
        
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        return data.access_token;
      } else {
        logout();
        return null;
      }
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      logout();
      return null;
    }
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const isAuthenticated = () => {
    return !!user && !!accessToken;
  };

  // Função para fazer requisições autenticadas
  const apiCall = async (url, options = {}) => {
    let token = accessToken;

    // Tentar renovar token se necessário
    if (!token && refreshToken) {
      token = await refreshAccessToken();
    }

    if (!token) {
      throw new Error('Token não disponível');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Se token expirou, tentar renovar
    if (response.status === 401 && refreshToken) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    }

    return response;
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    isLoading,
    login,
    logout,
    isAdmin,
    isAuthenticated,
    apiCall,
    refreshAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { AuthContext };