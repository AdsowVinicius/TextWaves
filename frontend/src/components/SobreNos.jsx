import React from "react";
import { useNavigate } from "react-router-dom";
import InfoCards from "./InfoCards";
import Button from "./Button";
import { cardsData } from "../helpers/cardsData";
import styles from "./SobreNos.module.css";

const SobreNos = () => {
  const navigate = useNavigate();

  const goToProjeto = () => navigate("/Projeto");

  return (
    <main className={styles.background}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>Legendas inteligentes para histórias que conectam pessoas.</h1>
          <p>
            Somos o TextWaves, um estúdio de tecnologia focado em acessibilidade
            audiovisual. Combinamos IA e curadoria humana para transformar vídeos
            em experiências inclusivas, com legendas precisas e prontas para
            publicação em poucos minutos.
          </p>
          <div className={styles.ctaGroup}>
            <Button onClick={goToProjeto}>Legendar Agora</Button>
            <span className={styles.ctaNote}>Comece sem custos e evolua com a gente.</span>
          </div>
        </div>
        <img src="../public/img/simplifique.png" alt="Equipe colaborando" />
      </section>

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <h3>+150k</h3>
          <p>Minutos de vídeo legendados com precisão temporal quadro a quadro.</p>
        </article>
        <article className={styles.metricCard}>
          <h3>98%</h3>
          <p>Satisfação entre criadores que adotaram nossa automação de legendas.</p>
        </article>
        <article className={styles.metricCard}>
          <h3>24h</h3>
          <p>Suporte humano dedicado para projetos urgentes e campanhas sazonais.</p>
        </article>
      </section>

      <section className={styles.mission}>
        <h2>Nossa missão</h2>
        <p>
          Acreditamos que cada vídeo merece ser ouvido e compreendido por todos.
          Por isso, desenvolvemos um pipeline completo de extração de áudio,
          identificação de linguagem e sincronização de legendas, reduzindo horas
          de edição repetitiva para minutos de revisão criativa.
        </p>
      </section>

      <section className={styles.cardsSection}>
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
      </section>

      <section className={styles.finalCta}>
        <h2>Pronto para legendar com eficiência?</h2>
        <p>
          Faça upload de um vídeo, configure palavras sensíveis e receba uma
          prévia em minutos. Ajuste, exporte e publique com segurança.
        </p>
        <Button onClick={goToProjeto}>Legendar Agora</Button>
      </section>
    </main>
  );
};

export default SobreNos;
