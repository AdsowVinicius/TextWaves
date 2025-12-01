import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ForbiddenWordsSelector from "./ForbiddenWordsSelector";
import styles from "./Projeto.module.css";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://127.0.0.1:5000";

const Projeto = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [displayVideoURL, setDisplayVideoURL] = useState("");
  const [responseMessage, setResponseMessage] = useState("");
  const [availableWords, setAvailableWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [isFetchingWords, setIsFetchingWords] = useState(false);
  const [wordsError, setWordsError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hidePreview, setHidePreview] = useState(false);
  const { apiCall } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadWords = async () => {
      setIsFetchingWords(true);
      try {
        const response = await fetch(`${API_BASE}/api/config/profanity_words`);
        if (!response.ok) {
          throw new Error("Não foi possível carregar as palavras sugeridas");
        }
        const data = await response.json();
        const defaults = data.words || data.default_words || [];
        setAvailableWords(defaults);
        setSelectedWords(defaults);
      } catch (error) {
        console.error("Erro ao buscar palavras proibidas", error);
        setWordsError(error.message);
      } finally {
        setIsFetchingWords(false);
      }
    };

    loadWords();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(file);
      const fileURL = URL.createObjectURL(file);
      setDisplayVideoURL(fileURL); // Set initial video URL to uploaded file
      setHidePreview(false); // Ensure preview is visible when selecting a new file
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!videoFile) {
      alert("Por favor, selecione um vídeo!");
      return;
    }

    setIsProcessing(true);
    setResponseMessage("Processando vídeo...");
  setHidePreview(true);
  let restorePreview = true;

    const formData = new FormData();
    formData.append("video", videoFile);
    if (selectedWords.length > 0) {
      formData.append("forbidden_words", JSON.stringify(selectedWords));
    }

    try {
      const response = await apiCall(`${API_BASE}/api/process_video_preview`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "success") {
          setResponseMessage(
            "Vídeo processado! Redirecionando para o editor..."
          );
          restorePreview = false;
          // Redirecionar para o editor com o hash do vídeo
          setTimeout(() => {
            navigate(`/Editor?video_hash=${data.video_hash}`);
          }, 1000);
        } else {
          setResponseMessage(`Erro: ${data.message}`);
          restorePreview = true;
        }
      } else {
        const errorData = await response.json();
        setResponseMessage(`Erro: ${errorData.message}`);
        restorePreview = true;
      }
    } catch (error) {
      setResponseMessage(`Erro de conexão: ${error.message}`);
      restorePreview = true;
    } finally {
      setIsProcessing(false);
      if (restorePreview) {
        setHidePreview(false);
      }
    }
  };

  return (
    <div className={styles.background}>
      <div className={styles.conteudoProjeto}>
        <div className={styles.header}>
          <h1>Upload de Vídeo</h1>
        </div>

        <section className={styles.wordsSection}>
          <h2>Palavras Proibidas</h2>
          {isFetchingWords ? (
            <p>Carregando palavras sugeridas...</p>
          ) : (
            <ForbiddenWordsSelector
              availableWords={availableWords}
              selectedWords={selectedWords}
              onChange={setSelectedWords}
              label="Selecione as palavras a censurar"
            />
          )}
          {wordsError && <p className={styles.error}>{wordsError}</p>}
        </section>

        {displayVideoURL && !hidePreview && (
          <div className={styles.previewWrapper}>
            <h2>Vídeo Selecionado:</h2>
            <video
              key={displayVideoURL}
              src={displayVideoURL}
              controls
              style={{ width: "100%", height: "auto", borderRadius: "8px" }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleFileChange}
            title="Selecione um arquivo de vídeo"
          />
          <button type="submit" disabled={isProcessing || !videoFile}>
            {isProcessing ? "Processando..." : "Enviar Vídeo"}
          </button>
        </form>

        {responseMessage && (
          <p className={styles.response}>{responseMessage}</p>
        )}
      </div>
    </div>
  );
};

export default Projeto;
