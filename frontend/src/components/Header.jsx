import React from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "./Button";
import Modal from "./Modal";
import styles from "./Header.module.css";

const Header = () => {
  const location = useLocation();

  const [isModalOpen, setIsModalOpen] = React.useState(false); //valores true ou false do modal
  const openModal = () => setIsModalOpen(true);

  //passado como props e terá seu valor usado e alterado pelo Modal
  const closeModal = () => setIsModalOpen(false);

  const buttonsPage = () => {
    if (location.pathname === "/" || location.pathname === "/CriarConta") {
      return (
        <>
          <Button onClick={() => openModal()}>Entrar</Button>
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
                <p href="/">Sobre nós</p>
              </li>
              <li>{buttonsPage()}</li>
            </ul>
          </nav>
        </div>
      </div>
      <Modal isOpen={isModalOpen} closeModal={closeModal} />
    </header>
  );
};

export default Header;
