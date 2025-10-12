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
2. Exporte as variáveis obrigatórias (`JWT_SECRET_KEY` pelo menos).
3. Rode a API em modo debug:
	```powershell
	cd backend/app
	$env:FLASK_APP = "app.py"
	$env:FLASK_ENV = "development"
	flask run
	```
4. Os logs estruturados aparecerão no console (incluindo etapas do pipeline). Reinicie o servidor após alterar variáveis.

### Desenvolvimento frontend

1. Instale dependências (`npm install`) uma vez.
2. Inicie o Vite dev server: `npm run dev`.
3. Configure o proxy/API no `.env` do frontend caso altere a porta do backend (`VITE_API_URL`).

### Processamento end-to-end local

1. Garanta que o backend esteja rodando com Whisper configurado (requer FFmpeg).
2. Pelo frontend, faça login e envie um vídeo via formulário de upload.
3. O workflow executará automaticamente:
	- extração de áudio;
	- transcrição via Whisper;
	- geração de legendas/intervalos de beep;
	- renderização do vídeo final no diretório `TEXTWAVES_UPLOAD_DIR`.
4. Consulte o arquivo JSON de sessão correspondente para detalhes de cada etapa.

### Execução de testes e lint rápido

1. Exportar `PYTHONPATH` para apontar para `backend`.
2. Rodar `pytest backend/tests` (ver comando na seção de testes).
3. Opcional: validar o frontend com `npm run lint` dentro da pasta `frontend`.

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