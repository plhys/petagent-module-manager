@echo off
chcp 65001 >nul
title PetAgent Build

set "DIST=%~dp0dist"

echo.
echo   ======================================
echo     PetAgent Build Tool
echo   ======================================
echo.

:: Auto-detect Python: try python3, python, then common install paths
set "PYTHON="
for %%c in (python3 python) do (
    where %%c >nul 2>nul
    if not errorlevel 1 (
        for /f "delims=" %%p in ('where %%c') do set "PYTHON=%%p"
        goto :found
    )
)
:: Fallback: check common Python 3.x install paths
for /d %%d in ("%LOCALAPPDATA%\Programs\Python\Python3*") do (
    if exist "%%d\python.exe" (
        set "PYTHON=%%d\python.exe"
        goto :found
    )
)
for /d %%d in ("C:\Python3*") do (
    if exist "%%d\python.exe" (
        set "PYTHON=%%d\python.exe"
        goto :found
    )
)
echo [ERROR] Python not found in PATH or common install locations.
echo         Please install Python 3.12+ and add to PATH.
pause
exit /b 1

:found
echo   Using Python: %PYTHON%
echo.

echo [1/4] Cleaning old build...
if exist "%DIST%" rmdir /s /q "%DIST%" 2>nul
echo       Done.

echo [2/4] Building PetAgent-Installer.exe ...
"%PYTHON%" -m PyInstaller --clean --noconfirm --distpath "%DIST%" --workpath "%DIST%\build" "%~dp0installer.spec"
if %errorlevel% neq 0 (
    echo [ERROR] Installer build failed!
    pause
    exit /b 1
)
echo       Done.

echo [3/4] Building PetAgent-Uninstaller.exe ...
"%PYTHON%" -m PyInstaller --clean --noconfirm --distpath "%DIST%" --workpath "%DIST%\build" "%~dp0uninstaller.spec"
if %errorlevel% neq 0 (
    echo [ERROR] Uninstaller build failed!
    pause
    exit /b 1
)
echo       Done.

echo [4/4] Cleaning temp files...
rmdir /s /q "%DIST%\build" 2>nul
echo       Done.

echo.
echo   ======================================
echo     Build Complete!
echo   ======================================
echo.
echo   Output:
echo     %DIST%\PetAgent-Installer.exe
echo     %DIST%\PetAgent-Uninstaller.exe
echo.
pause