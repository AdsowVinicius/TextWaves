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
  const [menuOpen, setMenuOpen] = React.useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair?")) {
      await logout();
    }
  };

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const logoTarget = isAuthenticated() ? "/dashboard" : "/sobre-nos";

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
        <Link className={styles.editorMh} to="/login">
          <Button>Entrar</Button>
        </Link>
      );
    }
  };

  return (
    <header>
      <div className={styles.alinhamento}>
        <Link to={logoTarget}>
          <img src="../public/img/logo.svg" alt="logo" height="35" />
        </Link>

        {/* Menu Desktop */}
        <div className={styles.menu}>
          <nav>
            <ul>
              <li>
                <Link className={styles.editorMh} to="/Projeto">
                  <p>Novo Vídeo</p>
                </Link>
              </li>
              <li>
                <Link className={styles.editorMh} to="/sobre-nos">
                  <p>Sobre nós</p>
                </Link>
              </li>
              <li>{buttonsPage()}</li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Ícone Hamburguer (fora do alinhamento) */}
      <div className={styles.menuHamburguer}>
        <div
          className={`${styles.hamburger} ${menuOpen ? styles.active : ""}`}
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Menu Mobile */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.show : ""}`}>
        <Link
          className={styles.editorMh}
          to="/Projeto"
          onClick={() => setMenuOpen(false)}
        >
          <p>Novo Vídeo</p>
        </Link>
        <Link
          className={styles.editorMh}
          to="/sobre-nos"
          onClick={() => setMenuOpen(false)}
        >
          <p>Sobre nós</p>
        </Link>
        {buttonsPage()}
      </div>

      {!isAuthenticated() && (
        <Modal isOpen={isModalOpen} closeModal={closeModal} />
      )}
    </header>
  );
};

export default Header;
