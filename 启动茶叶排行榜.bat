@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found.
  echo Please install Node.js LTS and run this file again.
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo Building dashboard files. Please wait...
  where npm.cmd >nul 2>nul
  if errorlevel 1 (
    echo npm was not found. Cannot build dashboard files.
    pause
    exit /b 1
  )
  call npm.cmd run build
  if errorlevel 1 (
    echo.
    echo Build failed. Please check the error above.
    pause
    exit /b 1
  )
)

echo Starting Taobao Tea Ranking Dashboard...
echo Browser will open automatically. Keep this window open.
echo.
node scripts\start-local.mjs

echo.
echo Server stopped. Press any key to close.
pause >nul
