@echo off
setlocal
cd /d "%~dp0"
echo F1 STATS - local FastF1 download
if exist ".fastf1-venv\Scripts\python.exe" goto ready
py -3.12 --version >nul 2>&1
if not errorlevel 1 (
  py -3.12 -m venv .fastf1-venv
  goto checkvenv
)
py -3 --version >nul 2>&1
if not errorlevel 1 (
  py -3 -m venv .fastf1-venv
  goto checkvenv
)
python --version >nul 2>&1
if not errorlevel 1 (
  python -m venv .fastf1-venv
  goto checkvenv
)
echo Install Python 3.12 or newer from https://www.python.org/downloads/windows/
echo Then run this file again.
pause
exit /b 1
:checkvenv
if not exist ".fastf1-venv\Scripts\python.exe" (
  echo Could not create Python environment. Install Python 3.12.
  pause
  exit /b 1
)
:ready
".fastf1-venv\Scripts\python.exe" -m pip install -r scripts\fastf1-requirements.txt
if errorlevel 1 (
  echo Package installation failed.
  pause
  exit /b 1
)
".fastf1-venv\Scripts\python.exe" scripts\local_fastf1.py
pause
