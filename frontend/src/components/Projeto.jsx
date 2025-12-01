import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ForbiddenWordsSelector from "./ForbiddenWordsSelector";
import styles from "./Projeto.module.css";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://127.0.0.1:5000";

const STAGE_DETAILS = {
  starting: {
    label: "Iniciando processamento",
    hint: "Preparando o serviço para receber o arquivo.",
  },
  uploading: {
    label: "Enviando vídeo",
    hint: "Estamos recebendo o arquivo no servidor.",
  },
  extracting_audio: {
    label: "Extraindo áudio",
    hint: "Separando o áudio do vídeo enviado.",
  },
  transcribing: {
    label: "Transcrevendo áudio",
    hint: "Convertendo fala em texto com o Whisper.",
  },
  censoring: {
    label: "Detectando palavras sensíveis",
    hint: "Aplicando censura e preparando as legendas.",
  },
  completed: {
    label: "Preview pronto",
    hint: "Redirecionando você para o editor em instantes.",
  },
  error: {
    label: "Erro no processamento",
    hint: "Identificamos um problema durante o processamento.",
  },
};

const clampProgress = (value) => Math.max(0, Math.min(100, Math.round(value ?? 0)));

const computeVideoHash = async (file) => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 10);
};

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
  const [progressData, setProgressData] = useState(null);
  const { apiCall } = useAuth();
  const navigate = useNavigate();
  const progressSourceRef = useRef(null);

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
    return () => {
      if (progressSourceRef.current) {
        progressSourceRef.current.close();
        progressSourceRef.current = null;
      }
    };
  }, []);

  const stopProgressStream = useCallback(() => {
    if (progressSourceRef.current) {
      progressSourceRef.current.close();
      progressSourceRef.current = null;
    }
  }, []);

  const startProgressStream = useCallback(
    (hash) => {
      if (!hash) {
        return;
      }

      stopProgressStream();
      try {
        const source = new EventSource(
          `${API_BASE}/api/video_progress/${hash}`
        );
        progressSourceRef.current = source;

        source.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setProgressData(data);
            if (data.progress >= 100 || data.error) {
              source.close();
              progressSourceRef.current = null;
            }
          } catch (parseError) {
            console.error("Erro ao interpretar progresso SSE:", parseError);
          }
        };

        source.onerror = (event) => {
          console.error("Falha na conexão SSE de progresso", event);
          source.close();
          progressSourceRef.current = null;
        };
      } catch (streamError) {
        console.error("Não foi possível iniciar monitoramento de progresso:", streamError);
      }
    },
    [stopProgressStream]
  );

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
    setResponseMessage("");
    setProgressData(null);
    setHidePreview(true);
    let restorePreview = true;
    let expectedHash = null;

    try {
      expectedHash = await computeVideoHash(videoFile);
      startProgressStream(expectedHash);
      setProgressData({
        stage: "uploading",
        progress: 5,
        message: "Enviando vídeo para o servidor...",
        error: null,
      });
    } catch (hashError) {
      console.warn("Falha ao calcular hash do vídeo para monitoramento", hashError);
    }

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
          setProgressData((prev) =>
            prev && prev.progress >= 100
              ? prev
              : {
                  stage: "completed",
                  progress: 100,
                  message: "Preview pronto!",
                  error: null,
                }
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
        setProgressData((prev) =>
          prev
            ? { ...prev, error: errorData.message || "Erro ao processar vídeo." }
            : null
        );
      }
    } catch (error) {
      setResponseMessage(`Erro de conexão: ${error.message}`);
      restorePreview = true;
      setProgressData((prev) =>
        prev
          ? { ...prev, error: error.message || "Erro de conexão." }
          : null
      );
    } finally {
      setIsProcessing(false);
      stopProgressStream();
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

        {(progressData || responseMessage) && (
          <div className={styles.progressCard}>
            {progressData && (
              <>
                <div className={styles.progressHeader}>
                  <span>
                    {STAGE_DETAILS[progressData.stage]?.label ||
                      progressData.stage?.replace(/_/g, " ") ||
                      "Processando"}
                  </span>
                  <span>{clampProgress(progressData.progress)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${clampProgress(progressData.progress)}%` }}
                  ></div>
                </div>
                <p className={styles.progressHint}>
                  {progressData.error
                    ? `Erro: ${progressData.error}`
                    : progressData.message ||
                      STAGE_DETAILS[progressData.stage]?.hint ||
                      "Processando vídeo..."}
                </p>
              </>
            )}

            {responseMessage && (
              <p className={styles.finalMessage}>{responseMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projeto;
