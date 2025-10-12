import React, { useState, useRef, useEffect } from 'react';
import ForbiddenWordsSelector, { buildMaskRegExp } from './ForbiddenWordsSelector';
import styles from './VideoPreview.module.css';

const API_BASE = 'http://127.0.0.1:5000';

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
    fontColor: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.8)',
    position: 'bottom'
  });
  const [availableWords, setAvailableWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [isFetchingWords, setIsFetchingWords] = useState(false);
  const [wordsError, setWordsError] = useState(null);
  useEffect(() => {
    const fetchWords = async () => {
      setIsFetchingWords(true);
      try {
        const response = await fetch(`${API_BASE}/api/config/profanity_words`);
        if (!response.ok) {
          throw new Error('Não foi possível carregar as palavras sugeridas');
        }
        const data = await response.json();
        const defaults = data.words || data.default_words || [];
        setAvailableWords(defaults);
        setSelectedWords(defaults);
      } catch (error) {
        console.error('Erro ao carregar palavras proibidas', error);
        setWordsError(error.message);
      } finally {
        setIsFetchingWords(false);
      }
    };

    fetchWords();
  }, []);

  useEffect(() => {
    setSubtitles((prev) => {
      if (!prev.length) {
        return prev;
      }

      const pattern = buildMaskRegExp(selectedWords);
      return prev.map((subtitle) => {
        const baseText = subtitle.raw_text ?? subtitle.text ?? '';
        if (!pattern) {
          if (subtitle.text === baseText) {
            return subtitle;
          }
          return { ...subtitle, text: baseText };
        }

        const masked = baseText.replace(pattern, '******');
        if (masked === subtitle.text) {
          return subtitle;
        }
        return { ...subtitle, text: masked };
      });
    });
  }, [selectedWords]);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Upload e processamento inicial
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setVideoFile(file);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('video', file);
    if (selectedWords.length > 0) {
      formData.append('forbidden_words', JSON.stringify(selectedWords));
    }

    try {
      const response = await fetch(`${API_BASE}/process_video_preview`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'success') {
        setVideoHash(data.video_hash);
        setSubtitles(data.subtitles);
        if (Array.isArray(data.forbidden_words) && data.forbidden_words.length) {
          setSelectedWords(data.forbidden_words);
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
      const activeIndex = subtitles.findIndex(sub => 
        time >= sub.start && time <= sub.end
      );
      setActiveSubtitleIndex(activeIndex);
    }
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
    const maskedText = pattern ? newText.replace(pattern, '******') : newText;
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

  // Salvar alterações das legendas
  const saveSubtitles = async () => {
    if (!videoHash) return;

    try {
      const response = await fetch(`${API_BASE}/update_subtitles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_hash: videoHash,
          subtitles: subtitles,
          forbidden_words: selectedWords,
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Legendas salvas com sucesso!');
      }
    } catch (error) {
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  // Renderizar vídeo final
  const renderFinalVideo = async () => {
    if (!videoHash) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE}/render_final_video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_hash: videoHash,
          subtitle_config: subtitleConfig,
          forbidden_words: selectedWords,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Criar link para download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video_com_legendas.mp4';
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Editor de Vídeo com Legendas</h1>
        {!videoFile && (
          <div className={styles.uploadSection}>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={styles.uploadBtn}
              disabled={isLoading}
            >
              {isLoading ? 'Processando...' : 'Selecionar Vídeo'}
            </button>
          </div>
        )}
      </div>

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
                    bottom: subtitleConfig.position === 'bottom' ? '20px' : 'auto',
                    top: subtitleConfig.position === 'top' ? '20px' : 'auto',
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
                    onChange={(e) => setSubtitleConfig({
                      ...subtitleConfig,
                      fontSize: parseInt(e.target.value)
                    })}
                  />
                  <span>{subtitleConfig.fontSize}px</span>
                </label>

                <label>
                  Cor do Texto:
                  <input
                    type="color"
                    value={subtitleConfig.fontColor}
                    onChange={(e) => setSubtitleConfig({
                      ...subtitleConfig,
                      fontColor: e.target.value
                    })}
                  />
                </label>

                <label>
                  Posição:
                  <select
                    value={subtitleConfig.position}
                    onChange={(e) => setSubtitleConfig({
                      ...subtitleConfig,
                      position: e.target.value
                    })}
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
                      index === activeSubtitleIndex ? styles.active : ''
                    }`}
                  >
                    <div className={styles.subtitleHeader}>
                      <span className={styles.subtitleNumber}>#{index + 1}</span>
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
                          step="0.1"
                          value={subtitle.start.toFixed(1)}
                          onChange={(e) => updateSubtitleTiming(index, 'start', e.target.value)}
                          className={styles.timeInput}
                        />
                      </label>
                      <label>
                        Fim:
                        <input
                          type="number"
                          step="0.1"
                          value={subtitle.end.toFixed(1)}
                          onChange={(e) => updateSubtitleTiming(index, 'end', e.target.value)}
                          className={styles.timeInput}
                        />
                      </label>
                    </div>

                    <textarea
                      value={subtitle.text}
                      onChange={(e) => updateSubtitleText(index, e.target.value)}
                      className={styles.textEditor}
                      rows={3}
                    />
                  </div>
                ))}
              </div>
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
                {isProcessing ? 'Renderizando...' : 'Gerar Vídeo Final'}
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