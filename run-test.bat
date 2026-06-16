@echo off
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\fnm_multishells\default;%USERPROFILE%\.fnm\node-versions"
for /f "tokens=*" %%i in ('where npm 2^>nul') do set "NPMDIR=%%~dpi"
if defined NPMDIR set "PATH=%PATH%;%NPMDIR%"
npm run test:e2e:pattern > F:\CODEX\math-detective\test-output.txt 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> F:\CODEX\math-detective\test-output.txt
