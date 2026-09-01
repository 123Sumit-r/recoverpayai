# PostgreSQL Setup Guide for RecoverPay AI

## Windows PostgreSQL Setup

### Step 1: Verify PostgreSQL Installation
Check if PostgreSQL is installed:
```powershell
# Run in PowerShell (Administrator)
Get-Service -Name 'PostgreSQL*'
```

### Step 2: Start PostgreSQL Service
If you have PostgreSQL installed as a service:
```powershell
# Run in PowerShell (Administrator)
net start PostgreSQL15  # Replace 15 with your version number
# or
net start PostgreSQL14
# or
net start PostgreSQL13
```

### Step 3: Verify PostgreSQL is Running
Check the connection:
```powershell
# From the backend directory
cd c:\raz\backend
npm run db:schema  # Applies tables to the existing raz_ai database
```

### Step 4: If PostgreSQL is Not Installed

**Option A: Download PostgreSQL**
1. Visit https://www.postgresql.org/download/windows/
2. Download PostgreSQL 15 or later
3. Run the installer
4. Remember the password you set for the postgres user
5. During installation, make sure to install pgAdmin and command-line tools
6. After installation, PostgreSQL should start automatically
7. Come back to this guide and run Step 2

**Option B: Use WSL2 with PostgreSQL** (Advanced)
```bash
# In WSL2
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
# Then update backend/.env to use WSL IP instead of localhost
```

## Update backend/.env if Needed

If you're using a different PostgreSQL setup, update these values:

```env
DB_HOST=localhost        # or your PostgreSQL host
DB_PORT=5432            # default PostgreSQL port
DB_NAME=raz_ai           # existing database; do not recreate
DB_USER=postgres        # default PostgreSQL user
DB_PASSWORD=<your_password>  # password you set during install
```

## Testing Your Setup

Once PostgreSQL is running:

```powershell
# From c:\raz directory
cd backend

# Create database schema
npm run db:schema

# Should see: "Database schema created successfully"

# Seed test data
npm run db:seed

# Should see: "Seed complete: 100 customers, 300 transactions, 100 invoices"

# Start the backend
npm run dev

# In another terminal, test an API
curl.exe http://localhost:5000/api/health
```

## Quick Test Script

Save this as `test-postgres.ps1` and run it:

```powershell
param(
    [string]$PostgresPath = "C:\Program Files\PostgreSQL\15\bin"
)

$env:PATH += ";$PostgresPath"

Write-Host "Testing PostgreSQL connection..."
try {
    $output = psql -U postgres -h localhost -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PostgreSQL is running and accessible" -ForegroundColor Green
        $output
    } else {
        Write-Host "✗ Could not connect to PostgreSQL" -ForegroundColor Red
        Write-Host $output
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
}
```

## Common Issues

**Error: "PostgreSQL connection failed"**
- PostgreSQL is not running. Start it with: `net start PostgreSQL15`
- Wrong password in .env. Check your installation password
- Wrong host/port. Default is localhost:5432

**Error: "database raz_ai does not exist"**
- The schema script creates tables only. Select the existing `raz_ai` database before running it.

**psql: command not found**
- PostgreSQL is not in your PATH. Add it: `$env:PATH += "C:\Program Files\PostgreSQL\15\bin"`

## Support

Once PostgreSQL is running, go back to the console and we can immediately:
1. Create the database schema (tables)
2. Seed 100 customers + 300 transactions + 100 invoices
3. Test all APIs
4. Display data in the frontend
