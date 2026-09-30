@echo off
title PDV 2.0
color 0A
chcp 65001 >nul 2>&1

:: ============================================================
::  PDV 2.0 - Inicializacao
:: ============================================================

:: ---- Eleva para Administrador automaticamente ----
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -WindowStyle Hidden -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Garante que esta na pasta do proprio bat
cd /d "%~dp0"

cls
echo.
echo  ============================================
echo    PDV 2.0 - Inicializando...
echo  ============================================
echo.

:: ---- Cria atalho na Area de Trabalho (apenas uma vez) ----
set "LNK=%USERPROFILE%\Desktop\PDV 2.0.lnk"
if not exist "%LNK%" (
    powershell -ExecutionPolicy Bypass -Command ^
        "& {param($bat,$dir,$lnk)" ^
        "$s=New-Object -COM WScript.Shell;" ^
        "$l=$s.CreateShortcut($lnk);" ^
        "$l.TargetPath=$bat;" ^
        "$l.WorkingDirectory=$dir;" ^
        "$l.Description='Iniciar PDV 2.0';" ^
        "$l.IconLocation=($env:SystemRoot+'\System32\shell32.dll,14');" ^
        "$l.Save();" ^
        "$b=[IO.File]::ReadAllBytes($lnk);" ^
        "$b[0x15]=$b[0x15] -bor 0x20;" ^
        "[IO.File]::WriteAllBytes($lnk,$b)" ^
        "} '%~f0' '%~dp0' '%LNK%'"
    echo  [OK] Atalho criado na Area de Trabalho!
) else (
    echo  [OK] Atalho ja existe na Area de Trabalho.
)

:: ---- Configura IP fixo no Wi-Fi ----
echo  [1/3] Configurando IP fixo 192.168.1.68...
netsh interface ip set address name="Wi-Fi" static 192.168.1.68 255.255.255.0 192.168.1.1 >nul 2>&1
if %errorlevel% equ 0 (
    echo        IP fixo configurado com sucesso!
) else (
    echo        IP ja configurado ou adaptador indisponivel.
)

:: ---- Instala dependencias se necessario ----
echo  [2/3] Verificando dependencias...
if not exist "node_modules\" (
    echo        Instalando pacotes npm, aguarde...
    npm install >nul 2>&1
    echo        Dependencias instaladas!
) else (
    echo        Dependencias ja instaladas.
)

:: ---- Libera portas caso estejam em uso ----
echo  [3/3] Verificando portas 3001 e 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo        Portas liberadas.

:: ---- Inicia backend Express na porta 3002 ----
echo        Iniciando API backend (porta 3002)...
start /MIN "PDV-Backend" cmd /c "cd /d "%~dp0" && npm run server"

:: ---- Inicia frontend Vite na porta 3001 ----
echo        Iniciando frontend (porta 3001)...
start /MIN "PDV-Frontend" cmd /c "cd /d "%~dp0" && npm run dev -- --port=3001"
echo        Servidores iniciando em segundo plano...

:: ---- Aguarda servidor subir ----
echo.
echo  Aguardando servidor ficar pronto (10s)...
timeout /t 10 /nobreak >nul
echo  Pronto!
echo.

:: ---- Abre o Chrome ----
set "CR=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "CR86=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if exist "%CR%" (
    start "" "%CR%" --new-window http://192.168.1.68:3001
) else if exist "%CR86%" (
    start "" "%CR86%" --new-window http://192.168.1.68:3001
) else (
    start http://192.168.1.68:3001
)

echo  ============================================
echo    PDV 2.0 rodando em:
echo    http://192.168.1.68:3001
echo  ============================================
echo.
echo  Esta janela fecha em 5 segundos...
timeout /t 5 /nobreak >nul
exit
