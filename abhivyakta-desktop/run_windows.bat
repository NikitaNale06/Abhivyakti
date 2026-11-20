@echo off
rem First run creates a private Python environment and installs the packages, then starts Abhivyakti.
cd /d "%~dp0"
if not exist .venv (
    echo Setting up Abhivyakti for the first time - this takes a few minutes...
    py -3 -m venv .venv || python -m venv .venv
    call .venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)
start "" .venv\Scripts\pythonw.exe main.py
