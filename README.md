# TextWaves

Plataforma end-to-end para transformar vídeos em conteúdo legendado, com autenticação segura, filtro automático de palavrões e pipeline de pós-processamento totalmente automatizado.

## ✨ Principais recursos

- **Processamento de vídeo assistido por IA**: usa OpenAI Whisper para transcrever o áudio e MoviePy para gerar um novo vídeo com legendas embutidas.
- **Moderação embutida**: palavras proibidas são mascaradas nas legendas e têm o áudio substituído por um beep configurável, com seleção dinâmica diretamente no painel web.
- **Gestão de usuários e vídeos**: cadastro, autenticação JWT, controle de acesso a arquivos e persistência em SQLite.
- **Integração front + back**: frontend React (Vite) consumindo uma API Flask bem organizada em blueprints.
- **Testes automatizados**: suíte `pytest` cobrindo utilidades, banco de dados e rotas críticas.

## 🏗️ Arquitetura

```text
TextWaves
├── backend/
│   ├── app/               # Código Flask (rotas, modelos, serviços)
│   ├── database/          # Funções utilitárias de acesso ao SQLite
│   ├── utils/             # Whisper, MoviePy, filtro de palavrões etc.
│   ├── tests/             # Testes unitários (pytest)
│   └── env/               # Virtualenv (opcional)
├── frontend/              # Aplicação React + Vite
├── start_servers.ps1      # Script para subir front e back juntos
└── SETUP_GUIDE.md         # Guia rápido de setup
```

## 📦 Pré-requisitos

- Windows com PowerShell (o projeto já usa caminhos específicos do SO)
- [Python 3.11](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/en/) e npm
- FFmpeg acessível em `backend/app/ffmpeg/bin/` (já incluso no repositório)

> Dica: há um ambiente virtual em `backend/env`. Você pode reutilizá-lo ou criar um novo (`python -m venv backend/env`).

## ⚙️ Configuração rápida

### 1. Clonar o repositório
```powershell
git clone https://github.com/AdsowVinicius/TextWaves.git
cd TextWaves
```

### 2. Backend (Flask + Whisper + MoviePy)
```powershell
# Ative o ambiente virtual (se já existir)
backend\env\Scripts\Activate.ps1

# ou crie um novo
python -m venv backend/env
backend\env\Scripts\Activate.ps1

# Instale as dependências
pip install -r backend/requirements.txt
```

Para rodar isoladamente:

```powershell
cd backend/app
python app.py
```

### 3. Frontend (React + Vite)
```powershell
cd frontend
npm install
npm run dev
```

O frontend fica disponível em `http://localhost:5173` e o backend em `http://localhost:5000`.

### 4. Script único (opcional)

```powershell
.\start_servers.ps1
```

## ✅ Variáveis de ambiente obrigatórias

| Variável | Obrigatória? | Default | Descrição |
|----------|---------------|---------|-----------|
| `JWT_SECRET_KEY` | Sim | _nenhum_ | Segredo usado para assinar os tokens JWT. Use um valor forte em produção. |
| `DATABASE_URL` | Não | `sqlite:///instance/textwaves.db` | URL SQLAlchemy para o banco. Ajuste para Postgres/MySQL conforme necessário. |
| `TEXTWAVES_BASE_DIR` | Não | `backend/app` | Base para diretórios relativos do pipeline. Útil quando rodando fora do repo. |
| `TEXTWAVES_UPLOAD_DIR` | Não | `backend/app/uploads` | Onde arquivos enviados e resultados são salvos. Deve ser gravável. |
| `TEXTWAVES_SUBTITLES_DIR_NAME` | Não | `videosSubtitles` | Nome da pasta onde as legendas geradas são colocadas (dentro de `BASE_DIR/..`). |
| `TEXTWAVES_FFMPEG_PATH` | Não | Detectado automaticamente | Caminho completo para o executável FFmpeg, caso não use o binário incluso. |
| `TEXTWAVES_FONT_PATH` | Não | `C:\\Windows\\Fonts\\arial.ttf` | Fonte usada nas legendas. Aponte para uma fonte existente no host. |
| `TEXTWAVES_PROFANITY_WORDS` | Não | Lista padrão (`palavrão1`, `merda`, `abelha`, …) | Lista CSV de termos proibidos para o filtro. |
| `TEXTWAVES_BEEP_FREQUENCY` | Não | `1000` | Frequência do beep (Hz) aplicado quando há palavrão. |
| `TEXTWAVES_BEEP_VOLUME` | Não | `0.4` | Volume relativo do beep (0 a 1). |

## 🧪 Testes

```powershell
$env:PYTHONPATH = "$(Resolve-Path backend)"
backend\env\Scripts\python.exe -m pytest backend/tests
```

Os testes cobrem:
- Funções do banco de dados (`database/db_manager.py`)
- Rotas de autenticação (`/api/auth`)
- Filtro de palavrões / intervals de beep

## 🗂️ Fluxo de processamento de vídeo

1. Upload do vídeo pelo frontend.
2. Extração de áudio (`utils/audioExtract.py`).
3. Transcrição via Whisper (`utils/transcribeAudio.py`).
4. Detecção de pausas e montagem das legendas (`utils/detectPauses.py`, `utils/generateStrFileVideo.py`).
5. Aplicação do filtro de palavrões e geração de beeps (`utils/profanity_filter.py`).
6. Renderização do vídeo final com MoviePy (`utils/CreateVideoWinthSubtitles.py`).

Todos os metadados (usuários, vídeos e permissões) são salvos em SQLite (`instance/textwaves.db`).

## 🔄 Workflows recomendados

### Desenvolvimento backend

1. Ative o ambiente virtual: `backend\env\Scripts\Activate.ps1`.
 # TextWaves — Guia de início rápido (Windows)

Este README foi escrito para que alguém sem dependências instaladas consiga rodar o projeto localmente no Windows usando PowerShell.

Resumo do projeto:
- Backend: Flask + Whisper (transcrição) + MoviePy (render) — gera legendas e aplica beeps para palavras proibidas.
- Frontend: React (Vite) — UI para upload, edição de beeps e render final.

> Estas instruções assumem Windows 10/11 e PowerShell. Em macOS/Linux os passos são semelhantes (ajuste paths/instalação do FFmpeg).

## 1) Instalar o que falta

- Python 3.11: https://www.python.org/downloads/ (marque "Add Python to PATH")
- Node.js 18+: https://nodejs.org/
- Git: https://git-scm.com/
- FFmpeg: https://ffmpeg.org/download.html (ou use o binário incluído em `backend/app/ffmpeg/bin`)

## 2) Clonar o repositório

```powershell
git clone https://github.com/AdsowVinicius/TextWaves.git
cd TextWaves
```

## 3) Backend (Python)

```powershell
# Criar e ativar virtualenv
python -m venv backend/env
backend\env\Scripts\Activate.ps1

# Atualizar pip e instalar dependências
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

Observações:
- Se o `pip install` falhar por falta de compiladores, instale as "Build Tools" do Visual Studio.

## 4) Configurar FFmpeg

Se você instalou FFmpeg no sistema, aponte a variável:

```powershell
$env:TEXTWAVES_FFMPEG_PATH = 'C:\Program Files\ffmpeg\bin\ffmpeg.exe'
```

Se for usar o binário interno, confirme que `backend/app/ffmpeg/bin/ffmpeg.exe` existe.

## 5) Frontend (Node)

```powershell
cd frontend
npm install
# Em uma janela separada rode o dev server
npm run dev
```

O frontend ficará em `http://localhost:5173`.

## 6) Rodar o backend

Abra outra janela do PowerShell (ative o venv) e execute:

```powershell
cd backend\app
$env:JWT_SECRET_KEY = 'sua_chave_de_teste'
python app.py
```

Ou use o script que sobe front+back:

```powershell
..\start_servers.ps1
```

## 7) Testes

Dentro do virtualenv, rode:

```powershell
cd backend
$env:PYTHONPATH = (Resolve-Path .)
backend\env\Scripts\python.exe -m pytest
```

## 8) Fluxo básico de uso

1. Abra a UI em `http://localhost:5173`.
2. Faça upload de um vídeo e aguarde a transcrição (Whisper).
3. Abra o preview, ajuste beeps se necessário e clique "Gerar Vídeo Final" para baixar o MP4.

## Variáveis de ambiente úteis (PowerShell)

```powershell
$env:JWT_SECRET_KEY = 'troque_isto_em_producao'
$env:TEXTWAVES_UPLOAD_DIR = 'C:\caminho\para\uploads'  # opcional
$env:TEXTWAVES_FFMPEG_PATH = 'C:\Program Files\ffmpeg\bin\ffmpeg.exe'  # opcional
```

## Troubleshooting rápido

- Erro de CORS / JSON: verifique BACKEND URL e `VITE_API_URL` no frontend.
- Whisper: se reclamar de FFmpeg, confirme `TEXTWAVES_FFMPEG_PATH` ou o binário em `backend/app/ffmpeg/bin`.
- Dependências Python falhando: instale Build Tools / use wheels pré-compiladas.

---

Se quiser, eu posso também adicionar passos separados para macOS/Linux, screenshots ou um vídeo curto demonstrando o fluxo.
