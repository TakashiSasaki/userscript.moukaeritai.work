#!/usr/bin/env bash
set -euo pipefail

# === Config (edit these) ===
OWNER="TakashiSasaki"          # e.g. "TakashiSasaki" or "your-org"
REPO="userscript.moukaeritai.work"            # downstream repository name
WORKFLOW_FILE="pull-from-world-userscript.yml"          # workflow file name under .github/workflows/
REF="userscript"                        # git ref (branch/tag) on downstream repo

# Optional: pass inputs to workflow_dispatch
# (Define empty if you don't use workflow inputs)
UPSTREAM_REF="${UPSTREAM_REF:-}"  # e.g. "main" or "refs/heads/main" or a SHA

# === Preflight checks ===
command -v gh >/dev/null 2>&1 || { echo "ERROR: gh not found in PATH" >&2; exit 127; }

# Ensure gh is authenticated (exits non-zero if not)
gh auth status >/dev/null 2>&1 || {
  echo "ERROR: gh is not authenticated. Run: gh auth login" >&2
  exit 1
}

# === Build API endpoint ===
# POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
API_PATH="repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches"

# === Dispatch ===
if [[ -n "${UPSTREAM_REF}" ]]; then
  gh api -X POST "${API_PATH}" \
    -f ref="${REF}" \
    -f "inputs[upstream_ref]=${UPSTREAM_REF}"
else
  gh api -X POST "${API_PATH}" \
    -f ref="${REF}"
fi

echo "OK: Dispatched workflow '${WORKFLOW_FILE}' on ${OWNER}/${REPO} (ref='${REF}')."
if [[ -n "${UPSTREAM_REF}" ]]; then
  echo "    input: upstream_ref='${UPSTREAM_REF}'"
fi
