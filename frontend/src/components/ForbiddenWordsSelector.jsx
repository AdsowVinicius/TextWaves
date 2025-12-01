import { useState, useMemo } from "react";
import styles from "./ForbiddenWordsSelector.module.css";

const normalize = (word) => word.normalize("NFC").toLowerCase();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ForbiddenWordsSelector = ({
  availableWords = [],
  selectedWords = [],
  onChange,
  label = "Palavras proibidas",
  allowCustom = true,
}) => {
  const [customWord, setCustomWord] = useState("");

  const normalizedSelected = useMemo(() => {
    const map = new Map();
    selectedWords.forEach((word) => {
      map.set(normalize(word), word);
    });
    return map;
  }, [selectedWords]);

  const handleToggle = (word) => {
    if (!word) return;
    const key = normalize(word);
    const exists = normalizedSelected.has(key);
    let next;
    if (exists) {
      next = selectedWords.filter((item) => normalize(item) !== key);
    } else {
      next = [...selectedWords, word];
    }
    onChange?.(next);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = customWord.trim();
    if (!value) return;
    const key = normalize(value);
    if (!normalizedSelected.has(key)) {
      onChange?.([...selectedWords, value]);
    }
    setCustomWord("");
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  const sortedWords = useMemo(() => {
    const known = new Map();
    availableWords.forEach((word) => {
      known.set(normalize(word), word);
    });
    return Array.from(known.values()).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [availableWords]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <h3 className={styles.title}>{label}</h3>
        <span className={styles.counter}>
          {selectedWords.length} selecionada(s)
        </span>
      </div>

      {sortedWords.length > 0 ? (
        <ul className={styles.wordList}>
          {sortedWords.map((word) => {
            const key = normalize(word);
            const checked = normalizedSelected.has(key);
            return (
              <li key={key}>
                <label className={styles.wordItem}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggle(word)}
                  />
                  <span>{word}</span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>Nenhuma sugestão encontrada.</p>
      )}

      {allowCustom && (
        <form onSubmit={handleSubmit} className={styles.customForm}>
          <input
            type="text"
            value={customWord}
            onChange={(event) => setCustomWord(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Adicionar palavra personalizada"
          />
          <button className="btn-adicionar" type="submit">
            Adicionar
          </button>
        </form>
      )}

      {selectedWords.length > 0 && (
        <div className={styles.selectedChips}>
          {selectedWords.map((word) => {
            const key = normalize(word) + "-chip";
            return (
              <button
                key={key}
                type="button"
                className={styles.chip}
                onClick={() => handleToggle(word)}
                title="Remover"
              >
                {word}
                <span aria-hidden>×</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const buildMaskRegExp = (words) => {
  if (!words?.length) return null;
  const escaped = words
    .map((word) => escapeRegExp(word.trim()))
    .filter(Boolean);
  if (!escaped.length) return null;
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
};

export default ForbiddenWordsSelector;
