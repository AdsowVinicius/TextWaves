# 🔧 Correção de URLs da API

## Problema Identificado

O erro `Unexpected token '<', "<!doctype "... is not valid JSON` ocorria porque:

1. O `preview_bp` está registrado com prefixo `/api`
2. O frontend estava chamando URLs sem o prefixo `/api`
3. Flask retornava página HTML 404 em vez de JSON

## URLs Corrigidas

### ❌ Antes (INCORRETO)
```javascript
http://127.0.0.1:5000/process_video_preview
http://127.0.0.1:5000/get_session/${hash}
http://127.0.0.1:5000/update_subtitles
http://127.0.0.1:5000/render_final_video
http://127.0.0.1:5000/get_video/${hash}
```

### ✅ Depois (CORRETO)
```javascript
http://127.0.0.1:5000/api/process_video_preview
http://127.0.0.1:5000/api/get_session/${hash}
http://127.0.0.1:5000/api/update_subtitles
http://127.0.0.1:5000/api/render_final_video
http://127.0.0.1:5000/api/get_video/${hash}
```

## Arquivos Alterados

1. **`frontend/src/components/Projeto.jsx`**
   - ✅ `/api/process_video_preview`

2. **`frontend/src/components/VideoPreview.jsx`**
   - ✅ `/api/get_session/${hash}`
   - ✅ `/api/process_video_preview`
   - ✅ `/api/update_subtitles`
   - ✅ `/api/render_final_video`
   - ✅ `/api/get_video/${hash}`

## Configuração do Backend

```python
# backend/app/app.py, linha 52
app.register_blueprint(preview_bp, url_prefix='/api')
```

Todas as rotas do `preview_bp` automaticamente recebem o prefixo `/api/`.

## Como Testar

1. **Certifique-se que o backend está rodando**:
   ```bash
   cd backend
   python app/app.py
   ```

2. **Certifique-se que o frontend está rodando**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Teste o upload**:
   - Vá para a página de upload
   - Selecione um vídeo
   - Clique em "Enviar"
   - Agora deve funcionar sem erro de JSON!

## URLs da API Disponíveis

### Autenticação (`/api/auth`)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Preview/Editor (`/api`)
- `POST /api/process_video_preview`
- `POST /api/update_subtitles`
- `POST /api/render_final_video`
- `GET /api/get_session/<hash>`
- `GET /api/get_video/<hash>`

### Configuração (`/api/config`)
- `GET /api/config/profanity_words`

### Usuários (`/api`)
- `GET /api/users`
- `GET /api/users/stats`
- `PUT /api/users/<id>/role`
- `DELETE /api/users/<id>`

## Status

✅ **PROBLEMA RESOLVIDO!** Agora todas as URLs estão corretas e o upload de vídeo deve funcionar perfeitamente.
