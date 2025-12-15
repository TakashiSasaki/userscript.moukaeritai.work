#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Trigger a downstream GitHub Actions workflow via workflow_dispatch.

.DESCRIPTION
  This script triggers an existing GitHub Actions workflow in a downstream
  repository using the GitHub CLI (gh).

  Authentication is handled by gh itself, so no token handling is required
  here as long as `gh auth login` has already been executed.

  This script is functionally equivalent to the Linux Bash version
  (kick-to-publish.sh).

.PREREQUISITES
  - GitHub CLI (gh) installed and available in PATH
  - gh authenticated (gh auth login)

.CONFIGURATION
  Edit the variables in the "Config" section below to match your repository.

.ENVIRONMENT VARIABLES
  UPSTREAM_REF (optional)
    If set, this value is passed to the workflow as:
      inputs.upstream_ref

.EXAMPLE
  PS> .\kick-to-publish.ps1

.EXAMPLE
  PS> $env:UPSTREAM_REF = "userscript"
  PS> .\kick-to-publish.ps1

.NOTES
  Author: (you)
  This script intentionally avoids direct REST calls and relies on gh api
  for future compatibility with GitHub API changes.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

###############################################################################
# Config (edit these)
###############################################################################

# GitHub user or organization that owns the downstream repository
$OWNER = "TakashiSasaki"

# Downstream repository name
$REPO  = "userscript.moukaeritai.work"

# Workflow file name under .github/workflows/
$WORKFLOW_FILE = "pull-from-world-userscript.yml"

# Git ref (branch or tag) where the workflow exists
$REF = "userscript"

###############################################################################
# Optional input
###############################################################################

# Optional upstream ref passed to workflow_dispatch inputs.
# This is intentionally read from the environment to match the Bash script.
$UPSTREAM_REF = $env:UPSTREAM_REF

###############################################################################
# Preflight checks
###############################################################################

# Check that gh CLI exists
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: gh CLI not found in PATH."
    Write-Error "Install it from: https://cli.github.com/"
    exit 127
}

# Check that gh is authenticated
try {
    gh auth status | Out-Null
} catch {
    Write-Error "ERROR: gh is not authenticated."
    Write-Error "Run: gh auth login"
    exit 1
}

###############################################################################
# Build API endpoint
###############################################################################
# POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches

$API_PATH = "repos/$OWNER/$REPO/actions/workflows/$WORKFLOW_FILE/dispatches"

###############################################################################
# Dispatch workflow
###############################################################################

if (-not [string]::IsNullOrWhiteSpace($UPSTREAM_REF)) {
    gh api -X POST $API_PATH `
        -f "ref=$REF" `
        -f "inputs[upstream_ref]=$UPSTREAM_REF" | Out-Null
} else {
    gh api -X POST $API_PATH `
        -f "ref=$REF" | Out-Null
}

###############################################################################
# Result output
###############################################################################

Write-Host "OK: Dispatched workflow '$WORKFLOW_FILE' on $OWNER/$REPO (ref='$REF')."

if (-not [string]::IsNullOrWhiteSpace($UPSTREAM_REF)) {
    Write-Host "    input: upstream_ref='$UPSTREAM_REF'"
}
