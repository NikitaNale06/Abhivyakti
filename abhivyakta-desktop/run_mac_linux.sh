#!/usr/bin/env bash
# First run creates a private Python environment and installs the packages, then starts Abhivyakti.
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "Setting up Abhivyakti for the first time - this takes a few minutes..."
  python3 -m venv .venv
  . .venv/bin/activate
  python -m pip install --upgrade pip
  python -m pip install -r requirements.txt
else
  . .venv/bin/activate
fi
python main.py
