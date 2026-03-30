param(
    [Parameter(Mandatory=$true)]
    [string]$TargetFile
)

# Detect and run ESLint with fallback

# 1. Try npx
try {
    Write-Host "Trying npx eslint..." -ForegroundColor Cyan
    npx eslint "$TargetFile"
    if ($LASTEXITCODE -eq 0) {
        return
    }
} catch {
    # Ignore error and try bun
}

# 1. Try bun
try {
    Write-Host "npx not found or failed, trying bun x eslint..." -ForegroundColor Yellow
    bun x eslint "$TargetFile"
    if ($LASTEXITCODE -eq 0) {
        return
    }
} catch {
    # Fail
}

Write-Error "Could not run ESLint. Neither npx nor bun worked."
exit 1
