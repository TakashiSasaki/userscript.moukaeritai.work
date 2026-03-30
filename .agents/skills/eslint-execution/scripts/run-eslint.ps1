param(
    [Parameter(Mandatory=$true)]
    [string]$TargetFile
)

# Detect and run ESLint with fallback

# 1. Try bun
try {
    Write-Host "Trying bun x eslint..." -ForegroundColor Cyan
    bun x eslint "$TargetFile"
    if ($LASTEXITCODE -eq 0) {
        return
    }
} catch {
    # Ignore error and try npx
}

# 2. Try npx
try {
    Write-Host "bun not found or failed, trying npx eslint..." -ForegroundColor Yellow
    npx eslint "$TargetFile"
    if ($LASTEXITCODE -eq 0) {
        return
    }
} catch {
    # Fail
}

Write-Error "Could not run ESLint. Neither npx nor bun worked."
exit 1
