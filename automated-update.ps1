# wPOND Mining Tracker Automated Update Script
# Run this script via Windows Task Scheduler for daily updates

param(
    [switch]$Force,
    [switch]$Verbose
)

# Set execution policy if needed (run as admin first time)
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $scriptPath "automation.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $logFile -Value $logMessage
}

Write-Log "Starting wPOND Mining Tracker automated update"

# Change to project directory
Set-Location $scriptPath

try {
    # Check if update is needed (unless forced)
    if (-not $Force) {
        Write-Log "Checking if update is needed..."
        $shouldUpdate = node schedule-updates.js check 2>&1
        if ($shouldUpdate -like "*false*") {
            Write-Log "No update needed at this time"
            exit 0
        }
    }

    # Run the update
    Write-Log "Running incremental update..."
    $result = node schedule-updates.js update 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Update completed successfully"
        
        # Show summary
        Write-Log "Generating update statistics..."
        node schedule-updates.js stats
        
    } else {
        Write-Log "Update failed with exit code: $LASTEXITCODE"
        Write-Log "Error output: $result"
        exit 1
    }

} catch {
    Write-Log "Error during update: $($_.Exception.Message)"
    exit 1
}

Write-Log "Automated update completed" 