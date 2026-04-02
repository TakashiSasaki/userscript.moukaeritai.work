---
name: version-bump
description: Guidelines and procedure for strictly bumping userscript versions and syncing documents whenever code or resources are modified.
---

# Version Bump Policy Skill

This skill enforces the strict versioning policy for all userscripts in this repository.

**CRITICAL RULE**: If you modify even a single line of JavaScript code (`.user.js`), or any of the resources it loads (e.g., loaded CSS files, imported dependencies), you **MUST** bump the script's version number.

## Procedure for Bumping Versions

Whenever a code modification is made, perform the following steps carefully:

### 1. Identify the Modification
Check if your changes include logic, style (`*.css`), or dependencies. If they do, the script needs a version bump.

### 2. Update the Userscript Metadata
1. Open the target `.user.js` file.
2. Locate the `// @version` directive in the metadata block.
3. Increment the patch version following Semantic Versioning (e.g., `0.3.5` -> `0.3.6`).
4. (Optional but recommended) Update the `// @lastModified` date to the current date if it exists.

### 3. Sync the Domain Index (`index.html`)
The documentation index lists the current version over the Install button. This MUST strictly match the new version.
1. Open the domain-level `index.html` (e.g., `gemini.google.com/index.html`).
2. Locate the link card for the modified script.
3. Change the text containing the version, e.g., `Install (v0.3.5)` -> `Install (v0.3.6)`.

### 4. Sync the Script-specific Index (`index.html`)
If the script has its own dedicated documentation page:
1. Open the script's `index.html` (e.g., `gemini.google.com/script-name/index.html`).
2. Update the `Install (vX.X.X)` button text to match the new version.
3. Update the `<h2>更新履歴</h2>` (Changelog) section by adding a new `<li>` with the new version and a brief summary of what was changed.

## Why this is required
Tampermonkey and other script managers use the `@version` tag to detect updates. If you change code but do not bump the version, users will not receive the update.
Furthermore, the `index.html` pages contain dynamic version checking (`latest-version` vs `installed-version`) that relies on the hardcoded DOM layout and version strings being consistent.
