@echo off
title Pharmacy Line Backend (port 8000)
cd /d "%~dp0backend"
".\.python\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
