import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Header.module.css";

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = React.useState(false);


  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair?")) {
      await logout();
    }
  };

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const logoTarget = isAuthenticated() ? "/dashboard" : "/sobre-nos";

  const menuItems = React.useMemo(() => {
    if (!isAuthenticated()) {
      return [
        { to: "/", label: "Início" },
        { to: "/Projeto", label: "Novo Vídeo" },
        { to: "/sobre-nos", label: "Sobre nós" },
        { to: "/CriarConta", label: "Criar conta" },
        { to: "/login", label: "Entrar", highlight: true },
      ];
    }

    return [
      {
        to: "/dashboard",
        label: user?.username ? `Dashboard (${user.username})` : "Dashboard",
      },
      { to: "/Projeto", label: "Novo Vídeo" },
      { to: "/Editor", label: "Editor" },
      { to: "/dashboard?tab=videos", label: "Histórico" },
      { to: "/sobre-nos", label: "Sobre nós" },
      { action: "logout", label: "Sair" },
    ];
  }, [isAuthenticated, user?.username]);

  const renderMenuItem = (item, isMobile = false) => {
    const commonProps = {
      className: `${styles.editorMh} ${
        item.highlight ? styles.highlightLink : ""
      }`,
      onClick:
        item.action === "logout"
          ? (e) => {
              e.preventDefault();
              handleLogout();
              setMenuOpen(false);
            }
          : () => {
              if (isMobile) {
                setMenuOpen(false);
              }
            },
    };

    if (item.action === "logout") {
      return (
        <button
          type="button"
          {...commonProps}
          className={`${styles.editorMh} ${styles.logoutLink} ${
            item.highlight ? styles.highlightLink : ""
          }`}
        >
          {item.label}
        </button>
      );
    }

    return (
      <Link {...commonProps} to={item.to}>
        <p>{item.label}</p>
      </Link>
    );
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
              {menuItems.map((item, index) => (
                <li key={`${item.label}-${index}`}>
                  {renderMenuItem(item)}
                </li>
              ))}
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
        {menuItems.map((item, index) => (
          <React.Fragment key={`${item.label}-${index}`}>
            {renderMenuItem(item, true)}
          </React.Fragment>
        ))}
      </div>

    </header>
  );
};

export default Header;
