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
    <section div className={styles.InfoCards}>
      <img src={image} alt={caption} className={styles.image} />
      <div className={styles.texto}>
        <img src={imageIcon} className={styles.imageIcon} width="30" />
        <h3 className="card.title">{title}</h3>
        <h5 className="card.subtitle">{subtitle}</h5>
        <p className="card.description">{description}</p>
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
