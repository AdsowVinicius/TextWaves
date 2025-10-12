# TextWaves

Plataforma end-to-end para transformar vídeos em conteúdo legendado, com autenticação segura, filtro automático de palavrões e pipeline de pós-processamento totalmente automatizado.

## ✨ Principais recursos

- **Processamento de vídeo assistido por IA**: usa OpenAI Whisper para transcrever o áudio e MoviePy para gerar um novo vídeo com legendas embutidas.
- **Moderação embutida**: palavras proibidas são mascaradas nas legendas e têm o áudio substituído por um beep configurável.
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

Variáveis de ambiente importantes:

```powershell
$env:JWT_SECRET_KEY = "troque-para-um-segredo-seguro"
$env:DATABASE_URL   = "sqlite:///textwaves.db"   # opcional; padrão já aponta para instance/textwaves.db
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

## 🔒 Autenticação & Gestão de usuários

- Registro (`POST /api/auth/register`): o primeiro usuário recebe papel `admin`.
- Login (`POST /api/auth/login`): aceita username ou e-mail, sem diferenciar maiúsculas/minúsculas.
- Tokens JWT: access (24h) e refresh (30 dias).
- Logout (`POST /api/auth/logout`): adiciona o token de acesso à blacklist.
- Refresh (`POST /api/auth/refresh`): gera novo access token a partir de um refresh válido.

## 🧰 Scripts úteis

- `start_servers.ps1`: sobe API Flask e frontend Vite em paralelo.
- `backend/tests/*`: exemplos de como mockar o banco SQLite e usar o cliente de teste Flask.

## 🧭 Próximos passos sugeridos

- Expandir a UI React para visualizar vídeos já processados e compartilhar acessos.
- Ajustar os `tests` para rodar em CI (GitHub Actions, por exemplo).
- Migrar gradualmente o acesso a dados para SQLAlchemy completo (hoje a aplicação mescla ORM e consultas manuais).
- Permitir configuração de palavras proibidas e parâmetros de beep via painel administrativo.

## 🤝 Contribuindo

1. Crie um fork do projeto.
2. Abra uma branch descrevendo sua feature/correção.
3. Garanta que os testes passam (`pytest`).
4. Abra um Pull Request explicando o contexto e o impacto da mudança.

## 📄 Licença

Este projeto é distribuído nos termos da licença incluída no repositório (verifique o arquivo `LICENSE`, se disponível).