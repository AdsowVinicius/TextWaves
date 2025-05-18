import React, { useState } from "react";
import styles from "./Modal.module.css";
import { useNavigate, Link } from "react-router-dom";
import Button from "./Button";
import { loginUser } from '../helpers/api';

const Modal = ({ isOpen, closeModal }) => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await loginUser(username, password);
      setToken(response.token);
      setMessage('Login realizado com sucesso!');
      closeModal();
      navigate("/projeto");
    } catch (error) {
      setMessage(error.message || 'Erro no login');
    }
  };

  const closeModalOnLinkClick = () => {
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <img src="../public/img/iconelogo.svg" width="100" alt="Logo" />
        <form onSubmit={handleSubmit}>
          <label>Email:</label>
          <input
            type="email"
            placeholder="Digite seu email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label>Senha:</label>
          <input
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Entrar</button>
          {message && <p>{message}</p>}
          {token && <p>Token: {token}</p>}
          <Link to="CriarConta" onClick={closeModalOnLinkClick}>
            <Button>Criar Conta</Button>
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Modal;
