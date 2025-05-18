import React from "react";
import InfoCards from "./InfoCards";
import Button from "./Button";
import { cardsData } from "../helpers/cardsData";
import styles from "./HomePage.module.css";

const HomePage = () => {
  return (
    <main className={styles.background}>
      <div className={styles.conteudo}>
        <section className={styles.inicio}>
          <h1>Torne o seu conteúdo acessível para todos.</h1>
          <div className={styles.testar}>
            <div className={styles.testartexto}>
              <h4>Simplifique a comunicação com legendas geradas por IA</h4>
              <Button>Testar Agora</Button>
            </div>
            <img src="../public/img/simplifique.png" alt="imagem" />
          </div>
          <div>
            <h2>
              Melhore a experiência do expectator com legendas que acompanham
              perfeitamente o seu conteúdo.
            </h2>
          </div>
        </section>
        {cardsData.map((card) => (
          <InfoCards
            key={card.id}
            imageIcon={card.imageIcon}
            title={card.title}
            subtitle={card.subtitle}
            description={card.description}
            image={card.image}
            caption={card.caption}
          />
        ))}
      </div>
    </main>
  );
};

export default HomePage;
