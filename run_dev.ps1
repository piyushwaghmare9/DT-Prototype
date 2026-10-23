# CampusX Development Launcher
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Starting CampusX Development Servers...   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host 'Starting FastAPI Backend...' -ForegroundColor Green; ..\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# 2. Start Vite Frontend in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host 'Starting Vite Frontend...' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "Both servers have been launched in separate terminal windows!" -ForegroundColor Green
Write-Host "- Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "- Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "- API Docs: http://localhost:8000/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "Database: MongoDB Atlas (campusx)" -ForegroundColor Green
Write-Host "Register a new real student account at: http://localhost:5173/register" -ForegroundColor Yellow
Write-Host "Or log in at: http://localhost:5173/login" -ForegroundColor Yellow

