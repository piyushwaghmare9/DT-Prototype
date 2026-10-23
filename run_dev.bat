@echo off
title CampusX Dev Launcher
echo =============================================
echo   Starting CampusX Development Servers...   
echo =============================================

start "CampusX Backend" cmd /k "cd backend && ..\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
start "CampusX Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate terminal windows!
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8000
echo - API Docs: http://localhost:8000/api/docs
echo.
