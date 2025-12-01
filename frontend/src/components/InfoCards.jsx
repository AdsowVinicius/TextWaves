import React from "react";
import PropTypes from "prop-types";
import styles from "./InfoCards.module.css";

const InfoCards = ({
  imageIcon,
  title,
  subtitle,
  description,
  image,
  caption,
}) => {
  return (
    <section className={styles.InfoCards}>
      <img src={image} alt={caption} className={styles.image} />
      <div className={styles.texto}>
        <img src={imageIcon} className={styles.imageIcon} width="30" alt="icon" />
        <h3 className={styles.title}>{title}</h3>
        <h5 className={styles.subtitle}>{subtitle}</h5>
        <p className={styles.description}>{description}</p>
      </div>
    </section>
  );
};

InfoCards.propTypes = {
  imageIcon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  caption: PropTypes.string.isRequired,
};

export default InfoCards;
