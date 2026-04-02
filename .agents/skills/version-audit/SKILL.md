---
name: version-audit
description: Audits Git history of userscripts against Semantic Versioning to detect regressions (monotonic increase violations).
---

# Version Audit Skill

This skill provides a standardized way to audit `.user.js` files within the repository to ensure that the `@version` string increases monotonically throughout the git history. 

It prevents issues where a file is accidentally overwritten with an older version which drops the version number.

## Features
- Recursively scans the provided directory for `.user.js` files.
- Extracts `@version` from the file headers across the entire git history (all branches).
- Validates semantic versioning sizes (e.g. `0.2.7` > `0.1.8`).
- Highlights specific commits where a version regression occurred.

## How to use

### Running the Audit (PowerShell)

You can run the audit script using powershell. By default it will scan the current directory.
You can specify a target folder such as `gemini.google.com` as an argument.

```powershell
# Run the audit script for all userscripts
powershell -File .\.agents\skills\version-audit\scripts\audit_versions.ps1

# Run the audit script for a specific directory
powershell -File .\.agents\skills\version-audit\scripts\audit_versions.ps1 "gemini.google.com"
```

## Recommended Workflow

1. Before or after major refactors/merges, run this audit to ensure no `.user.js` versions have regressed.
2. If regressions are found, identify the commit that caused the regression, and bump the version in the latest `HEAD` to exceed the highest historical version.
