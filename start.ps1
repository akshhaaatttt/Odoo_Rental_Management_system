# Rental System Pro - Quick Start Script

Write-Host "Starting Rental System Pro..." -ForegroundColor Cyan
Write-Host ""

# Start PostgreSQL
Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
& "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" -D "C:\Program Files\PostgreSQL\16\data" start
Start-Sleep -Seconds 2

# Navigate to project
Set-Location "C:\Users\DELL\OneDrive\Desktop\Odoo_Final"

# Start the application
Write-Host "Starting Backend and Frontend..." -ForegroundColor Green
npm run dev
