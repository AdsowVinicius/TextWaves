const API_URL = 'http://127.0.0.1:5000';

export const registerUser = async (username, email, password) => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro no registro');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (username, password) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      //envia erro caso dê erro, dur
      throw new Error(errorData.message || 'Erro no login');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};
