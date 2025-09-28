# Script para iniciar o TextWaves
Write-Host "=== Iniciando o TextWaves ===" -ForegroundColor Green

# Iniciar o backend (Flask)
Write-Host "Iniciando o backend Flask..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\adsow\Desktop\TG\TextWaves-main\TextWaves-main\backend\app'; & 'C:/Users/adsow/Desktop/TG/TextWaves-main/TextWaves-main/.venv/Scripts/python.exe' app.py"

# Aguardar um pouco para o backend iniciar
Start-Sleep -Seconds 3

# Iniciar o frontend (React/Vite)
Write-Host "Iniciando o frontend React..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\adsow\Desktop\TG\TextWaves-main\TextWaves-main\frontend'; npm run dev"

Write-Host "=== Servidores iniciados ===" -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Pressione qualquer tecla para fechar..."
Read-Host