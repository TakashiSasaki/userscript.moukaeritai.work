---
name: version-bump
description: Guidelines and procedure for strictly bumping userscript versions and ensuring synchronization with dynamic documentation.
---

# Version Bump Policy Skill

This skill enforces the strict versioning policy and documentation synchronization rules for all userscripts in this repository as defined in the root `AGENTS.md`.

**CRITICAL RULE**: If you modify even a single line of JavaScript code (`.user.js`), or any of the resources it loads (e.g., common library `gemini-common.js`, shared CSS/HTML), you **MUST** increment the patch version of the affected userscripts.

## Procedure for Bumping Versions

Whenever a modification is made, perform the following steps carefully:

### 1. Identify the Modification
Check if your changes include:
- Core logic in `.user.js`
- Shared resources like `gemini-common.js`, `gemini-common.css`, or `gemini-common.html`.
- Local resources (e.g., script-specific CSS/HTML).

If any of these change, the script version needs a bump.

### 2. Update the Userscript Metadata
1. Open the target `.user.js` file.
2. Locate the `// @version` directive in the metadata block.
3. Increment the patch version following Semantic Versioning (e.g., `0.3.5` -> `0.3.6`).
4. Update the `// @lastModified` date (format: `YYYY-MM-DD`).
5. Ensure `// @updateURL` and `// @downloadURL` point to the correct GitHub Raw URL.

### 3. Verify Documentation Metadata (index.html)
According to the latest guidelines, **do NOT manually update or hardcode version numbers in HTML files**. Version information is fetched dynamically by `domain-landing.js`.

Instead, verify the following in the relevant `index.html` files:
1. **data-script-name**: Ensure the value matches `GM_info.script.name` exactly.
2. **href**: Ensure the install button links to the **GitHub Raw URL**, never a local relative path.
    - Path format: `https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/DOMAIN_NAME/SCRIPT_NAME/SCRIPT_NAME.user.js`
3. **DOM Structure**: Ensure the version badges wrapper is intact:
    ```html
    <div class="version-info">
      <span class="latest-version">...</span>
      <span class="installed-version">...</span>
    </div>
    ```

### 4. Post-Modification Quality Check
1. **ESLint**: Run `npx eslint path/to/script.user.js` and resolve all errors/warnings.
2. **Commit**: Use `git commit -F` with a detailed English message.
3. **No Auto-Push**: Do NOT push to the remote repository automatically.

## Why this is required
- **Update Detection**: Tampermonkey uses the `@version` tag to detect updates.
- **Dynamic UI**: The `index.html` pages use `domain-landing.js` to compare the GitHub version with the locally installed version. Hardcoding version text in HTML causes UI inconsistency.
- **Cache Invalidation**: Bumping the version ensures that managers refresh cached `@resource` and `@require` files.
