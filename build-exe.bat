@echo off
chcp 65001 >nul
title QuotaWatcher - 一键打包 EXE 安装包

echo ========================================================
echo               QuotaWatcher 桌面端打包程序
echo ========================================================
echo.

cd /d "%~dp0"

:: 确保 cargo 在 PATH 中
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

echo [1/3] 正在检查前端构建产物...
call pnpm run build
if %errorlevel% neq 0 (
    echo.
    echo [错误] 前端编译失败，请检查代码！
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] 正在通过 Tauri 2.0 编译 Windows 原生应用并打包 EXE...
echo (首次编译耗时约 1~3 分钟，请稍候...)
echo.

call pnpm tauri build

if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败，请根据上方输出排查！
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo           🎉 恭喜！QuotaWatcher 打包成功！
echo ========================================================
echo.
echo 安装包生成位置：
echo   - NSIS 安装包 (.exe): src-tauri\target\release\bundle\nsis\
echo   - 独立可执行程序:     src-tauri\target\release\quota-watcher.exe
echo.
echo 正在为你打开目标文件夹...

if exist "src-tauri\target\release\bundle\nsis" (
    explorer.exe "src-tauri\target\release\bundle\nsis"
) else (
    explorer.exe "src-tauri\target\release"
)

pause
