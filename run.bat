@echo off
echo Starting Ludo Backend and Frontend...

:: Start backend using 'npm run dev' (with auto-reload)
start "Ludo Backend" cmd /k "cd backend && npm run dev"

:: Start frontend using 'npm run dev'
start "Ludo Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers are starting in separate windows!
echo You can close this window now.

