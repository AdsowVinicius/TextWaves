import React, { useState } from "react";
import styles from "./Projeto.module.css";

const Projeto = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [displayVideoURL, setDisplayVideoURL] = useState(""); // Single video URL state
  const [responseMessage, setResponseMessage] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(file);
      const fileURL = URL.createObjectURL(file);
      setDisplayVideoURL(fileURL); // Set initial video URL to uploaded file
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!videoFile) {
      alert("Por favor, selecione um vídeo!");
      return;
    }

    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      const response = await fetch("http://127.0.0.1:5000/process_video", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const videoURL = URL.createObjectURL(blob);
        setDisplayVideoURL(videoURL); // Replace the current video URL
        setResponseMessage("Vídeo processado com sucesso!");
      } else {
        const errorData = await response.json();
        setResponseMessage(`Erro: ${errorData.message}`);
      }
    } catch (error) {
      setResponseMessage(`Erro de conexão: ${error.message}`);
    }
  };

  return (
    <div className={styles.background}>
      <div className={styles.conteudoProjeto}>
        <h1>Upload de Vídeo</h1>
        {displayVideoURL && (
          <div>
            <h2>Vídeo:</h2>
            <video
              key={displayVideoURL}
              src={displayVideoURL}
              controls
              width="300"
            />
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input type="file" accept="video/*" onChange={handleFileChange} />
          <button type="submit">Enviar</button>
        </form>

        {responseMessage && <p>{responseMessage}</p>}
      </div>
    </div>
  );
};

export default Projeto;