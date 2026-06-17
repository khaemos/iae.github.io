@echo off
title IAE Research Log Studio
cd /d "%~dp0"
python app.py
if errorlevel 1 (
  echo.
  echo The studio could not start. Confirm Python 3 is installed and available.
  pause
)
