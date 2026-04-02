param (
    [string]$TargetFolder = ""
)

function Parse-Version($vStr) {
    if ($vStr -match '([\d\.]+)') {
        $clean = $matches[1]
        return $clean.Split('.') | ForEach-Object { [int]$_ }
    }
    return @(0)
}

function Compare-Versions($v1, $v2) {
    $len = [Math]::Max($v1.Count, $v2.Count)
    for ($i = 0; $i -lt $len; $i++) {
        $p1 = if ($i -lt $v1.Count) { $v1[$i] } else { 0 }
        $p2 = if ($i -lt $v2.Count) { $v2[$i] } else { 0 }
        if ($p1 -lt $p2) { return -1 }
        if ($p1 -gt $p2) { return 1 }
    }
    return 0
}

$targetPath = if ($TargetFolder) { $TargetFolder } else { "." }

# Ensure we are in a git repository
if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
    Write-Host "Error: Not inside a git repository." -ForegroundColor Red
    exit 1
}

Get-ChildItem -Path $targetPath -Filter "*.user.js" -Recurse | ForEach-Object {
    if ($_.FullName -match '\\(\.agent|\.git|node_modules)\\') { return }

    $scriptPath = $_.FullName.Replace((Get-Location).Path + "\", "")
    if ($scriptPath.StartsWith(".\")) { $scriptPath = $scriptPath.Substring(2) }
    
    Write-Host "Auditing: $scriptPath" -ForegroundColor Cyan
    
    $commits = git log --all --full-history --pretty=format:"%H|%ad|%s" --date=short -- $scriptPath
    if (-not $commits) { return }
    
    $history = @()
    $lines = $commits -split "`n"
    [array]::Reverse($lines)
    
    foreach ($line in $lines) {
        if (-not $line.Trim()) { continue }
        $parts = $line.Split("|")
        $hash = $parts[0]
        $info = "$($parts[1]) $($parts[2])"
        
        $content = git show "$($hash):$($scriptPath)" 2>$null
        if ($content -match '@version\s+([\d\.]+)') {
            $vStr = $matches[1]
            $vParsed = Parse-Version $vStr
            $history += [PSCustomObject]@{
                Hash = $hash
                Info = $info
                VersionStr = $vStr
                Version = $vParsed
            }
        }
    }
    
    $regressions = @()
    for ($i = 1; $i -lt $history.Count; $i++) {
        $prev = $history[$i-1]
        $curr = $history[$i]
        
        if ((Compare-Versions $curr.Version $prev.Version) -lt 0) {
            $regressions += "    - $($prev.VersionStr) ($($prev.Hash.Substring(0,7)) - $($prev.Info)) -> $($curr.VersionStr) ($($curr.Hash.Substring(0,7)) - $($curr.Info))"
        }
    }
    
    if ($history.Count -gt 0) {
        $currentV = $history[-1].Version
        $maxV = $history[0].Version
        $maxVStr = $history[0].VersionStr
        foreach ($h in $history) {
            if ((Compare-Versions $h.Version $maxV) -gt 0) {
                $maxV = $h.Version
                $maxVStr = $h.VersionStr
            }
        }
        
        if ((Compare-Versions $currentV $maxV) -lt 0) {
            Write-Host "  [!] WARNING: Current version $($history[-1].VersionStr) is LOWER than historical max $maxVStr" -ForegroundColor Yellow
        }
    }
    
    if ($regressions.Count -gt 0) {
        Write-Host "  [!] REGRESSIONS FOUND:" -ForegroundColor Red
        $regressions | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    } else {
        Write-Host "  [OK] No regressions found." -ForegroundColor Green
    }
    Write-Host ("-" * 40)
}
