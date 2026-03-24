# PostgreSQL Database Setup Script for MLB162
# This script creates the database and runs the initial migration

Write-Host "MLB162 Database Setup" -ForegroundColor Cyan
Write-Host "=====================`n" -ForegroundColor Cyan

# Try to find PostgreSQL installation
$possiblePaths = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files\PostgreSQL\13\bin",
    "C:\Program Files (x86)\PostgreSQL\16\bin",
    "C:\Program Files (x86)\PostgreSQL\15\bin",
    "C:\Program Files (x86)\PostgreSQL\14\bin"
)

$psqlPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path "$path\psql.exe") {
        $psqlPath = $path
        Write-Host "Found PostgreSQL at: $psqlPath" -ForegroundColor Green
        break
    }
}

if (-not $psqlPath) {
    Write-Host "ERROR: PostgreSQL not found in common locations." -ForegroundColor Red
    Write-Host "Please provide the path to your PostgreSQL bin folder:" -ForegroundColor Yellow
    $psqlPath = Read-Host "Path"

    if (-not (Test-Path "$psqlPath\psql.exe")) {
        Write-Host "ERROR: psql.exe not found at $psqlPath" -ForegroundColor Red
        exit 1
    }
}

# Set working directory
Set-Location $PSScriptRoot

# Get database credentials from .env or prompt
$dbUser = "postgres"
Write-Host "`nDatabase user (default: postgres):" -ForegroundColor Yellow
$userInput = Read-Host
if ($userInput) { $dbUser = $userInput }

Write-Host "`nChecking if database 'mlb162' exists..." -ForegroundColor Cyan

# Check if database exists
$checkDb = & "$psqlPath\psql.exe" -U $dbUser -lqt | Select-String -Pattern "mlb162"

if ($checkDb) {
    Write-Host "Database 'mlb162' already exists." -ForegroundColor Yellow
    $response = Read-Host "Do you want to drop and recreate it? (yes/no)"

    if ($response -eq "yes") {
        Write-Host "Dropping database 'mlb162'..." -ForegroundColor Yellow
        & "$psqlPath\dropdb.exe" -U $dbUser mlb162

        Write-Host "Creating database 'mlb162'..." -ForegroundColor Cyan
        & "$psqlPath\createdb.exe" -U $dbUser mlb162
    }
} else {
    Write-Host "Creating database 'mlb162'..." -ForegroundColor Cyan
    & "$psqlPath\createdb.exe" -U $dbUser mlb162

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create database." -ForegroundColor Red
        exit 1
    }
    Write-Host "Database created successfully!" -ForegroundColor Green
}

# Run migration
Write-Host "`nRunning database migration..." -ForegroundColor Cyan
$migrationFile = ".\migrations\001_initial_schema.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found at $migrationFile" -ForegroundColor Red
    exit 1
}

& "$psqlPath\psql.exe" -U $dbUser -d mlb162 -f $migrationFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Database setup completed successfully!" -ForegroundColor Green
    Write-Host "`nDatabase: mlb162" -ForegroundColor Cyan
    Write-Host "Tables created:" -ForegroundColor Cyan
    Write-Host "  - users"
    Write-Host "  - games"
    Write-Host "  - picks"
    Write-Host "  - daily_scores"
    Write-Host "  - leaderboard"
    Write-Host "  - audit_logs"
    Write-Host "  - api_cache"
    Write-Host "  - system_settings"
    Write-Host "`nYou can now run: npm run dev" -ForegroundColor Green
} else {
    Write-Host "`n✗ ERROR: Migration failed." -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    exit 1
}
