# 🎥 TextWaves - Guia de Configuração

## ✅ O que foi configurado:

1. **Ambiente Python**: Configurado com virtual environment
2. **Dependências**: Todas as bibliotecas Python foram instaladas
3. **Dependências Frontend**: Node.js/React configurados
4. **Caminhos**: Ajustados para o seu sistema

## 🚀 Como rodar o projeto:

### Opção 1 - Usando o script automático:
```powershell
.\start_servers.ps1
```

### Opção 2 - Manual:

#### Backend (Flask):
```powershell
cd "C:\Users\adsow\Desktop\TG\TextWaves-main\TextWaves-main\backend\app"
& "C:/Users/adsow/Desktop/TG/TextWaves-main/TextWaves-main/.venv/Scripts/python.exe" app.py
```

#### Frontend (React):
```powershell
cd "C:\Users\adsow\Desktop\TG\TextWaves-main\TextWaves-main\frontend"
npm run dev
```

## 🌐 URLs dos serviços:

- **Backend API**: http://localhost:5000
- **Frontend**: http://localhost:5173
- **Teste API**: http://localhost:5000/open-api

## ⚠️ Observações importantes:

1. **FFmpeg**: Está configurado para usar o FFmpeg do projeto, mas precisa estar presente na pasta `backend/app/ffmpeg/bin/`
2. **Upload**: Pasta `uploads` criada automaticamente
3. **Ambiente**: Usando Python 3.11.9 no virtual environment

## 🔧 Melhorias aplicadas no código:

1. **Legendas adaptáveis**: Ajustam tamanho baseado nas proporções do vídeo
2. **Caminhos dinâmicos**: Não dependem mais de caminhos hardcoded
3. **Configuração automática**: FFmpeg detectado automaticamente

## 📝 Próximos passos:

1. Execute o script `start_servers.ps1`
2. Acesse http://localhost:5173 no navegador
3. Teste o upload de vídeos
4. Se precisar do FFmpeg, baixe de: https://ffmpeg.org/download.html

## 🆘 Se algo não funcionar:

1. Verifique se o Python está ativo no virtual environment
2. Certifique-se que o Node.js está instalado
3. Verifique se as portas 5000 e 5173 não estão sendo usadas por outros programas