import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "./Button";
import Modal from "./Modal";
import styles from "./Header.module.css";

const Header = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      await logout();
    }
  };

  const buttonsPage = () => {
    if (isAuthenticated()) {
      return (
        <div className={styles.userMenu}>
          <Link to="/dashboard" className={styles.userLink}>
            👤 {user?.username}
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      );
    }
    
    if (location.pathname === "/" || location.pathname === "/CriarConta") {
      return (
        <>
          <Link to="/login">
            <Button>Entrar</Button>
          </Link>
        </>
      );
    }
  };

  return (
    <header>
      <div className={styles.alinhamento}>
        <Link to="/">
          <img src="../public/img/logo.svg" alt="logo" height="35" />
        </Link>
        <div className={styles.menu}>
          <nav>
            <ul>
              <li>
                <Link to="/Editor">Editor</Link>
              </li>
              <li>
                <p href="/">Sobre nós</p>
              </li>
              <li>{buttonsPage()}</li>
            </ul>
          </nav>
        </div>
      </div>
      {/* Manter modal apenas se não estiver autenticado */}
      {!isAuthenticated() && <Modal isOpen={isModalOpen} closeModal={closeModal} />}
    </header>
  );
};

export default Header;
