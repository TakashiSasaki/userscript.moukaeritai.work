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

### Standard Execution (npm/npx)

If `npm` is available in the environment:

```powershell
# Install dependencies if not already done
npm install

# Run ESLint on a specific file
npx eslint path/to/your/script.user.js
```

### Fallback Execution (Bun)

If `npm` or `npx` is not recognized (common in restricted Windows environments):

```powershell
# Install dependencies using bun
bun install

# Run ESLint using bun
bun x eslint path/to/your/script.user.js
```

## Recommended Workflow

1.  Always try `npx eslint` first.
2.  If the command fails with "term not recognized," check for `bun` by running `bun --version`.
3.  If `bun` exists, use `bun x eslint`.
4.  Ensure all errors are resolved before committing, as per `AGENTS.md` guidelines.

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
