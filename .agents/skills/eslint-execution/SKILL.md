---
name: eslint-execution
description: Runs ESLint on userscripts with automatic fallback to Bun if npm/npx is unavailable.
---

# ESLint Execution Skill

This skill provides a standardized way to run ESLint on userscripts within this repository, handling environments where Node.js/npm might be missing by falling back to Bun.

## Prerequisites

-   A valid `package.json` with `eslint` in `devDependencies`.
-   `eslint.config.mjs` (or equivalent configuration) in the root.
-   Access to either `npm/npx` or `bun`.

## How to use

### Recommended Execution (Bun)

Since `bun` is confirmed to be highly reliable in this environment, it is RECOMMENDED to use it as the primary tool.

```powershell
# Install dependencies using bun
bun install

# Run ESLint using bun
bun x eslint path/to/your/script.user.js
```

### Alternative Execution (npm/npx)

If `bun` is unavailable or `npm/npx` is preferred:

```powershell
# Install dependencies
npm install

# Run ESLint on a specific file
npx eslint path/to/your/script.user.js
```

## Recommended Workflow

1.  Always try `bun x eslint` first.
2.  If `bun` is missing, try `npx eslint`.
3.  Ensure all errors are resolved before committing, as per `AGENTS.md` guidelines.

## Troubleshooting & Lessons Learned

### 1. Global Variables (GM_info)
Userscripts rely on `GM_info` and other Tampermonkey globals.
-   **Issue**: ESLint might report `no-undef` for `GM_info`.
-   **Solution**: Ensure `GM_info: "readonly"` is added to the `globals` object in `eslint.config.mjs`.
-   **Caution**: Avoid adding `/* global GM_info */` comments to individual files if already defined in the config, as this can trigger `no-redeclare` errors.

### 2. File Pattern Matching
-   **Issue**: ESLint might skip `.user.js` files if the config only specifies `**/*.js`.
-   **Solution**: Use `files: ["**/*.js", "**/*.user.js"]` in the configuration.

### 3. Environment Path
-   **Issue**: `npx` or `npm` may be missing from the system `PATH`.
-   **Solution**: Use `bun x eslint` as a fallback. `bun` is confirmed to be available in this environment.

### 4. Running with Explicit Config
If ESLint struggles to find the configuration, use the explicit flag:
```powershell
bun x eslint --config eslint.config.mjs path/to/script.user.js
```
