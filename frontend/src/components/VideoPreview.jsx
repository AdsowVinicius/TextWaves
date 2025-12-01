import React, { useState, useRef, useEffect, useCallback } from "react";
import ForbiddenWordsSelector, {
  buildMaskRegExp,
} from "./ForbiddenWordsSelector";
import styles from "./VideoPreview.module.css";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://127.0.0.1:5000";

const VideoPreview = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoHash, setVideoHash] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState(-1);
  const [subtitleConfig, setSubtitleConfig] = useState({
    fontSize: 24,
    fontColor: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.8)",
    position: "bottom",
  });
  const [availableWords, setAvailableWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [isFetchingWords, setIsFetchingWords] = useState(false);
  const [wordsError, setWordsError] = useState(null);
  const [beepIntervals, setBeepIntervals] = useState([]); // Novo: intervalos de beep
  const [showBeepEditor, setShowBeepEditor] = useState(false); // Novo: mostrar editor de beeps
  const [progressData, setProgressData] = useState(null); // Novo: rastreamento de progresso SSE
  const [progressMessage, setProgressMessage] = useState(""); // Novo: mensagem do progresso
  const [isWaitingSession, setIsWaitingSession] = useState(false);
  const { apiCall } = useAuth();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const progressSourceRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  
  // Iniciar monitoramento de progresso SSE
  useEffect(() => {
    if (!progressData && videoHash) {
      // Não fazer nada - o progresso é iniciado no upload
      return;
    }
  }, [videoHash]);

  // Função para monitorar progresso via SSE
  const monitorProgress = useCallback((sessionHash) => {
    try {
      if (progressSourceRef.current) {
        progressSourceRef.current.close();
        progressSourceRef.current = null;
      }

      const eventSource = new EventSource(
        `${API_BASE}/api/video_progress/${sessionHash}`
      );
      progressSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgressData(data);
          setProgressMessage(data.message || "Processando...");

          // Fechar stream quando completar
          if (data.progress >= 100 || data.error) {
            eventSource.close();
            progressSourceRef.current = null;
          }
        } catch (err) {
          console.error("Erro ao parsear progresso SSE:", err);
        }
      };

      eventSource.onerror = (error) => {
        console.error("Erro na conexão SSE:", error);
        eventSource.close();
        progressSourceRef.current = null;
      };
    } catch (error) {
      console.error("Erro ao monitorar progresso:", error);
    }
  }, []);

  // Carregar sessão existente via hash (reintenta enquanto processamento estiver em andamento)
  const loadExistingSession = useCallback(
    async (hash, options = {}) => {
      const { skipMonitor = false } = options;
      setIsLoading(true);
      try {
        const response = await apiCall(`${API_BASE}/api/get_session/${hash}`);

        if (response.ok) {
          const data = await response.json();
          if (data.status !== "success") {
            throw new Error(data.message || "Sessão indisponível");
          }

          setVideoHash(data.data.video_hash);
          setSubtitles(data.data.subtitles);
          setVideoFile({ name: data.data.video_info.filename });

          if (data.data.forbidden_words) {
            setSelectedWords(data.data.forbidden_words);
          }

          if (Array.isArray(data.data.beep_intervals)) {
            setBeepIntervals(
              data.data.beep_intervals.map((interval, index) => ({
                id: index,
                start: interval[0],
                end: interval[1],
                word: interval[2] || "desconhecida",
              }))
            );
          }

          if (videoRef.current) {
            try {
              const videoResponse = await apiCall(
                `${API_BASE}/api/get_video/${hash}`,
                {
                  method: "GET",
                }
              );
              if (videoResponse.ok) {
                const blob = await videoResponse.blob();
                const videoURL = URL.createObjectURL(blob);
                videoRef.current.src = videoURL;
              } else {
                console.error(
                  "Erro ao carregar vídeo para preview",
                  videoResponse.status
                );
              }
            } catch (loadError) {
              console.error("Falha ao buscar vídeo original:", loadError);
            }
          }

          setIsWaitingSession(false);
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          return true;
        }

        if (response.status === 404) {
          setVideoHash(hash);
          setIsWaitingSession(true);
          if (!skipMonitor) {
            setProgressData(null);
            setProgressMessage("");
            monitorProgress(hash);
          }
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(() => {
            loadExistingSession(hash, { skipMonitor: true });
          }, 2500);
          return false;
        }

        const payload = await response.json().catch(() => ({}));
        const message = payload.message || payload.error || "Erro ao carregar sessão";
        throw new Error(message);
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
        if (!skipMonitor) {
          alert(`Erro ao carregar sessão: ${error.message}`);
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall, monitorProgress]
  );
  
  useEffect(() => {
    const fetchWords = async () => {
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
        console.error("Erro ao carregar palavras proibidas", error);
        setWordsError(error.message);
      } finally {
        setIsFetchingWords(false);
      }
    };

    fetchWords();

    // Verificar se há video_hash na URL (vindo do upload)
    const urlParams = new URLSearchParams(window.location.search);
    const hashFromURL = urlParams.get("video_hash");
    if (hashFromURL) {
      loadExistingSession(hashFromURL).catch(() => {
        /* falha tratada internamente */
      });
    }
  }, [loadExistingSession]);

  useEffect(() => {
    setSubtitles((prev) => {
      if (!prev.length) {
        return prev;
      }

      const pattern = buildMaskRegExp(selectedWords);
      return prev.map((subtitle) => {
        const baseText = subtitle.raw_text ?? subtitle.text ?? "";
        if (!pattern) {
          if (subtitle.text === baseText) {
            return subtitle;
          }
          return { ...subtitle, text: baseText };
        }

        const masked = baseText.replace(pattern, (match) =>
          "*".repeat(match.length)
        );
        if (masked === subtitle.text) {
          return subtitle;
        }
        return { ...subtitle, text: masked };
      });
    });
  }, [selectedWords]);
  const stopPreviewBeep = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (error) {
        console.warn("Oscilador já finalizado:", error);
      }
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPreviewBeep();
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.warn("Erro ao encerrar AudioContext:", error);
        }
        audioContextRef.current = null;
      }
      if (progressSourceRef.current) {
        progressSourceRef.current.close();
        progressSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!beepIntervals.length) {
      stopPreviewBeep();
    }
  }, [beepIntervals]);

  useEffect(() => {
    if (!isWaitingSession || !videoHash || !progressData) {
      return;
    }

    if (
      progressData.progress >= 100 ||
      progressData.stage === "completed" ||
      progressData.stage === "preview_ready"
    ) {
      loadExistingSession(videoHash, { skipMonitor: true }).catch(() => {
        /* tentativa adicional ocorrerá via timeout */
      });
    }
  }, [isWaitingSession, progressData, videoHash, loadExistingSession]);

  const startPreviewBeep = (frequency = 1000, volume = 0.3) => {
    if (oscillatorRef.current) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API não suportada neste navegador.");
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const context = audioContextRef.current;
    if (context.state === "suspended") {
      context.resume().catch((error) => {
        console.warn("Falha ao retomar AudioContext:", error);
      });
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
  };

  // Upload e processamento inicial
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setVideoFile(file);
    setIsLoading(true);
    setProgressData(null);
    setProgressMessage('');
    setIsWaitingSession(false);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const formData = new FormData();
    formData.append("video", file);
    if (selectedWords.length > 0) {
      formData.append("forbidden_words", JSON.stringify(selectedWords));
    }

    try {
      const response = await apiCall(`${API_BASE}/api/process_video_preview`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.status === "success") {
        const newHash = data.video_hash;
        setVideoHash(newHash);
        
        // Iniciar monitoramento de progresso
        monitorProgress(newHash);
        
        setSubtitles(data.subtitles);
        if (
          Array.isArray(data.forbidden_words) &&
          data.forbidden_words.length
        ) {
          setSelectedWords(data.forbidden_words);
        }
        // Carregar intervalos de beep se disponíveis
        if (Array.isArray(data.beep_intervals)) {
          setBeepIntervals(
            data.beep_intervals.map((interval, index) => ({
              id: index,
              start: interval[0],
              end: interval[1],
              word: interval[2] || "desconhecida", // palavra relacionada, se disponível
            }))
          );
        }

        // Criar URL do vídeo para preview
        const videoURL = URL.createObjectURL(file);
        if (videoRef.current) {
          videoRef.current.src = videoURL;
        }
      } else {
        alert(`Erro: ${data.message}`);
      }
    } catch (error) {
      alert(`Erro de conexão: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar tempo atual do vídeo
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      // Encontrar legenda ativa
      const activeIndex = subtitles.findIndex(
        (sub) => time >= sub.start && time <= sub.end
      );
      setActiveSubtitleIndex(activeIndex);

      // Controlar beep no preview
      const activeBeep = beepIntervals.find(
        (beep) => time >= beep.start && time <= beep.end
      );

      if (activeBeep) {
        startPreviewBeep();
      } else {
        stopPreviewBeep();
      }
    }
  };

  const handlePause = () => {
    stopPreviewBeep();
  };

  const handleEnded = () => {
    stopPreviewBeep();
  };

  // Pular para um momento específico
  const seekToTime = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Atualizar texto da legenda
  const updateSubtitleText = (index, newText) => {
    const updatedSubtitles = [...subtitles];
    const pattern = buildMaskRegExp(selectedWords);
    const maskedText = pattern ? newText.replace(pattern, "******") : newText;
    updatedSubtitles[index] = {
      ...updatedSubtitles[index],
      text: maskedText,
      raw_text: newText,
    };
    setSubtitles(updatedSubtitles);
  };

  // Atualizar timing da legenda
  const updateSubtitleTiming = (index, field, value) => {
    const updatedSubtitles = [...subtitles];
    updatedSubtitles[index][field] = parseFloat(value);
    setSubtitles(updatedSubtitles);
  };

  // Atualizar timing do beep
  const updateBeepTiming = (id, field, value) => {
    const updatedBeeps = beepIntervals.map((beep) =>
      beep.id === id ? { ...beep, [field]: parseFloat(value) } : beep
    );
    setBeepIntervals(updatedBeeps);
  };

  // Remover beep
  const removeBeep = (id) => {
    setBeepIntervals(beepIntervals.filter((beep) => beep.id !== id));
  };

  // Adicionar novo beep
  const addBeep = () => {
    const newId =
      beepIntervals.length > 0
        ? Math.max(...beepIntervals.map((b) => b.id)) + 1
        : 0;
    setBeepIntervals([
      ...beepIntervals,
      {
        id: newId,
        start: currentTime,
        end: currentTime + 0.5,
        word: "manual",
      },
    ]);
  };

  // Salvar alterações das legendas
  const saveSubtitles = async () => {
    if (!videoHash) return;

    try {
      const response = await apiCall(`${API_BASE}/api/update_subtitles`, {
        method: "POST",
        body: JSON.stringify({
          video_hash: videoHash,
          subtitles: subtitles,
          forbidden_words: selectedWords,
          beep_intervals: beepIntervals.map((b) => [
            b.start,
            b.end,
            b.word || "manual",
          ]),
        }),
      });

      const data = await response.json();
      if (data.status === "success") {
        alert("Legendas e beeps salvos com sucesso!");
      }
    } catch (error) {
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  // Renderizar vídeo final
  const renderFinalVideo = async () => {
    if (!videoHash) return;

    setIsProcessing(true);
    setProgressData(null);
    setProgressMessage('');
    monitorProgress(videoHash);

    try {
      const response = await apiCall(`${API_BASE}/api/render_final_video`, {
        method: "POST",
        body: JSON.stringify({
          video_hash: videoHash,
          subtitle_config: subtitleConfig,
          forbidden_words: selectedWords,
          beep_intervals: beepIntervals.map((b) => [
            b.start,
            b.end,
            b.word || "manual",
          ]),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Criar link para download
        const a = document.createElement("a");
        a.href = url;
        a.download = "video_com_legendas.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.message}`);
      }
    } catch (error) {
      alert(`Erro: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Formatação de tempo
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) {
      return "0:00.000";
    }
    const total = Math.max(0, seconds);
    const mins = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    const ms = Math.round((total - Math.floor(total)) * 1000);
    const normalizedMs = ms === 1000 ? 0 : ms;
    const adjustedSecs = ms === 1000 ? secs + 1 : secs;
    const normalizedSecs = adjustedSecs % 60;
    const adjustedMins = mins + Math.floor(adjustedSecs / 60);
    return `${adjustedMins}:${normalizedSecs
      .toString()
      .padStart(2, "0")}.${normalizedMs.toString().padStart(3, "0")}`;
  };

  if (isWaitingSession) {
    const progressValue = Math.max(
      0,
      Math.min(100, Math.round(progressData?.progress ?? 0))
    );
    const statusMessage =
      progressData?.message ||
      progressMessage ||
      "Estamos preparando seu vídeo para edição...";

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className="video-preview-titulo">Editor de Vídeo com Legendas</h1>
          {!videoFile && (
            <div className={styles.uploadSection}>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={styles.uploadBtn}
                disabled={isLoading}
              >
                {isLoading ? "Processando..." : "Selecionar Vídeo"}
              </button>
            </div>
          )}
        </div>

        <div className={styles.waitContainer}>
          <div className={styles.waitCard}>
            <div className={styles.waitSpinner} aria-hidden="true" />
            <h2>Gerando legendas...</h2>
            <p className={styles.waitMessage}>{statusMessage}</p>

            <div className={styles.waitProgressWrapper}>
              <div className={styles.waitProgressBar}>
                <div
                  className={styles.waitProgressFill}
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <span className={styles.waitProgressValue}>{progressValue}%</span>
            </div>

            {progressData?.error ? (
              <p className={styles.waitError}>Erro: {progressData.error}</p>
            ) : (
              <p className={styles.waitHint}>
                Assim que a etapa terminar, o editor abrirá automaticamente.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="video-preview-titulo">Editor de Vídeo com Legendas</h1>
        {!videoFile && (
          <div className={styles.uploadSection}>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              ref={fileInputRef}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.uploadBtn}
              disabled={isLoading}
            >
              {isLoading ? "Processando..." : "Selecionar Vídeo"}
            </button>
          </div>
        )}
      </div>

      {/* Barra de Progresso SSE */}
      {progressData && (
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #ddd',
          margin: '10px 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
              {progressMessage}
            </span>
            <span style={{ fontSize: '13px', color: '#666' }}>
              {Math.round(progressData.progress || 0)}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e0e0e0',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.round(progressData.progress || 0)}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
              transition: 'width 0.3s ease'
            }} />
          </div>
          {progressData.error && (
            <p style={{ color: '#d32f2f', marginTop: '8px', fontSize: '13px' }}>
              Erro: {progressData.error}
            </p>
          )}
        </div>
      )}

      <div className={styles.wordsPanel}>
        {isFetchingWords ? (
          <p>Carregando palavras sugeridas...</p>
        ) : (
          <ForbiddenWordsSelector
            availableWords={availableWords}
            selectedWords={selectedWords}
            onChange={setSelectedWords}
            label="Palavras proibidas"
          />
        )}
        {wordsError && <p className={styles.wordsError}>{wordsError}</p>}
      </div>

      {videoFile && (
        <div className={styles.mainContent}>
          {/* Player de Vídeo */}
          <div className={styles.videoSection}>
            <div className={styles.videoContainer}>
              <video
                ref={videoRef}
                controls
                onTimeUpdate={handleTimeUpdate}
                onPause={handlePause}
                onEnded={handleEnded}
                className={styles.videoPlayer}
              />

              {/* Preview da Legenda */}
              {activeSubtitleIndex >= 0 && (
                <div
                  className={styles.subtitleOverlay}
                  style={{
                    fontSize: `${subtitleConfig.fontSize}px`,
                    color: subtitleConfig.fontColor,
                    backgroundColor: subtitleConfig.backgroundColor,
                    bottom:
                      subtitleConfig.position === "bottom" ? "20px" : "auto",
                    top: subtitleConfig.position === "top" ? "20px" : "auto",
                  }}
                >
                  {subtitles[activeSubtitleIndex]?.text}
                </div>
              )}
            </div>

            {/* Controles de Configuração */}
            <div className={styles.configPanel}>
              <h3>Configurações da Legenda</h3>
              <div className={styles.configGrid}>
                <label>
                  Tamanho da Fonte:
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={subtitleConfig.fontSize}
                    onChange={(e) =>
                      setSubtitleConfig({
                        ...subtitleConfig,
                        fontSize: parseInt(e.target.value),
                      })
                    }
                  />
                  <span>{subtitleConfig.fontSize}px</span>
                </label>

                <label>
                  Cor do Texto:
                  <input
                    type="color"
                    value={subtitleConfig.fontColor}
                    onChange={(e) =>
                      setSubtitleConfig({
                        ...subtitleConfig,
                        fontColor: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Posição:
                  <select
                    value={subtitleConfig.position}
                    onChange={(e) =>
                      setSubtitleConfig({
                        ...subtitleConfig,
                        position: e.target.value,
                      })
                    }
                  >
                    <option value="bottom">Inferior</option>
                    <option value="top">Superior</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Timeline e Lista de Legendas */}
          <div className={styles.editorSection}>
            <div className={styles.timelineInfo}>
              <span>Tempo atual: {formatTime(currentTime)}</span>
              {activeSubtitleIndex >= 0 && (
                <span className={styles.activeSubtitle}>
                  Legenda ativa: #{activeSubtitleIndex + 1}
                </span>
              )}
            </div>

            <div className={styles.subtitlesList}>
              <h3>Legendas ({subtitles.length})</h3>
              <div className={styles.subtitlesContainer}>
                {subtitles.map((subtitle, index) => (
                  <div
                    key={subtitle.id}
                    className={`${styles.subtitleItem} ${
                      index === activeSubtitleIndex ? styles.active : ""
                    }`}
                  >
                    <div className={styles.subtitleHeader}>
                      <span className={styles.subtitleNumber}>
                        #{index + 1}
                      </span>
                      <button
                        onClick={() => seekToTime(subtitle.start)}
                        className={styles.seekBtn}
                      >
                        Ir para {formatTime(subtitle.start)}
                      </button>
                    </div>

                    <div className={styles.timingInputs}>
                      <label>
                        Início:
                        <input
                          type="number"
                          step="0.001"
                          value={subtitle.start.toFixed(3)}
                          onChange={(e) =>
                            updateSubtitleTiming(index, "start", e.target.value)
                          }
                          className={styles.timeInput}
                        />
                      </label>
                      <label>
                        Fim:
                        <input
                          type="number"
                          step="0.001"
                          value={subtitle.end.toFixed(3)}
                          onChange={(e) =>
                            updateSubtitleTiming(index, "end", e.target.value)
                          }
                          className={styles.timeInput}
                        />
                      </label>
                    </div>

                    <textarea
                      value={subtitle.text}
                      onChange={(e) =>
                        updateSubtitleText(index, e.target.value)
                      }
                      className={styles.textEditor}
                      rows={3}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Editor de Beeps */}
            <div className={styles.beepsSection}>
              <div className={styles.beepsHeader}>
                <h3>🔊 Intervalos de Beep ({beepIntervals.length})</h3>
                <button
                  onClick={() => setShowBeepEditor(!showBeepEditor)}
                  className={styles.toggleBtn}
                >
                  {showBeepEditor ? "Ocultar" : "Mostrar"} Editor
                </button>
              </div>

              {showBeepEditor && (
                <div className={styles.beepsEditor}>
                  <div className={styles.beepsInfo}>
                    <p>
                      ℹ️ Os beeps são calculados automaticamente baseados nas
                      palavras proibidas.
                    </p>
                    <p>
                      Você pode ajustar o timing ou adicionar beeps manualmente.
                    </p>
                  </div>

                  <button
                    onClick={addBeep}
                    className={styles.addBeepBtn}
                    disabled={!videoHash}
                  >
                    ➕ Adicionar Beep no Tempo Atual ({formatTime(currentTime)})
                  </button>

                  <div className={styles.beepsList}>
                    {beepIntervals.length === 0 && (
                      <p className={styles.emptyState}>
                        Nenhum beep encontrado. Adicione palavras proibidas ou
                        crie beeps manualmente.
                      </p>
                    )}

                    {beepIntervals.map((beep) => (
                      <div key={beep.id} className={styles.beepItem}>
                        <div className={styles.beepHeader}>
                          <span className={styles.beepWord}>
                            🔇 Beep #{beep.id + 1}
                            {beep.word &&
                              beep.word !== "manual" &&
                              ` (${beep.word})`}
                          </span>
                          <button
                            onClick={() => seekToTime(beep.start)}
                            className={styles.seekBtn}
                          >
                            ▶ Ir para {formatTime(beep.start)}
                          </button>
                        </div>

                        <div className={styles.beepTimingInputs}>
                          <label>
                            Início (s):
                            <input
                              type="number"
                              step="0.001"
                              value={beep.start.toFixed(3)}
                              onChange={(e) =>
                                updateBeepTiming(
                                  beep.id,
                                  "start",
                                  e.target.value
                                )
                              }
                              className={styles.timeInput}
                            />
                          </label>

                          <label>
                            Fim (s):
                            <input
                              type="number"
                              step="0.001"
                              value={beep.end.toFixed(3)}
                              onChange={(e) =>
                                updateBeepTiming(beep.id, "end", e.target.value)
                              }
                              className={styles.timeInput}
                            />
                          </label>

                          <label>
                            Duração:
                            <span className={styles.duration}>
                              {(beep.end - beep.start).toFixed(3)}s
                            </span>
                          </label>

                          <button
                            onClick={() => removeBeep(beep.id)}
                            className={styles.removeBtn}
                            title="Remover beep"
                          >
                            🗑️
                          </button>
                        </div>

                        <div className={styles.beepPreview}>
                          <div
                            className={styles.beepBar}
                            style={{
                              background:
                                currentTime >= beep.start &&
                                currentTime <= beep.end
                                  ? "#ff4444"
                                  : "#666",
                            }}
                          >
                            {currentTime >= beep.start &&
                              currentTime <= beep.end &&
                              "🔊 ATIVO"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className={styles.actionButtons}>
              <button
                onClick={saveSubtitles}
                className={styles.saveBtn}
                disabled={!videoHash}
              >
                Salvar Alterações
              </button>

              <button
                onClick={renderFinalVideo}
                className={styles.renderBtn}
                disabled={!videoHash || isProcessing}
              >
                {isProcessing ? "Renderizando..." : "Gerar Vídeo Final"}
              </button>

              <button
                onClick={() => {
                  setVideoFile(null);
                  setVideoHash(null);
                  setSubtitles([]);
                  setCurrentTime(0);
                  setActiveSubtitleIndex(-1);
                }}
                className={styles.newVideoBtn}
              >
                Novo Vídeo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
