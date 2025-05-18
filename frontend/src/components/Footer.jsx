import React from "react";
import styles from "./Footer.module.css";

const Footer = () => {
  return (
    <footer>
      <div className={styles.footer}>
        <img src="../public/img/logo.svg" alt="Logo" height="30" />
        <nav>
          <ul>
            <li>
              <a href="/">Planos</a>
            </li>
            <li>
              <a href="/">Privacidade</a>
            </li>
            <li>
              <a href="">textwaves@gmail.com</a>
            </li>
            <li>
              <a href="/">Sobre nós</a>
            </li>
            <li>
              <a href="/">Termos</a>
            </li>
            <li>
              <a href="/">Voltar ao topo</a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
