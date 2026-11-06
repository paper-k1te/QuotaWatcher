@echo off
chcp 65001 >nul
title QuotaWatcher - 开发模式启动

cd /d "%~dp0"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

echo 正在启动 QuotaWatcher 桌面开发环境 (含系统托盘与热更新)...
call pnpm tauri dev
pause
