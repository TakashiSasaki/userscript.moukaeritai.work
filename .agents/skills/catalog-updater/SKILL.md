# Userscript Catalog Updater Skill

This skill allows the agent to autonomously synchronize and update the userscript catalogs across the repository.

## Trigger
Use this skill when the user asks to "update the catalog", "sync the catalogs", or checks if the "catalog is acting as a comprehensive list for all userscripts".

## Steps

1. **Sync Domain List to Root Catalog**
   - List all directories in the repository root (excluding hidden folders like `.git`, `.github`, `.agents`, etc., and `node_modules`).
   - Read `index.html` at the repository root.
   - Ensure every domain directory has a corresponding `<a class="domain-card" ...>` entry in the `.domain-grid` section.
   - Remove any entries in `index.html` that no longer have a corresponding directory.

2. **Sync Userscripts to Domain Catalogs**
   - For each domain directory (e.g., `gemini.google.com`), list all userscript subdirectories.
   - Read the domain's `index.html` catalog.
   - Ensure every userscript subdirectory is listed as a `.project-item` containing an `.install-button` in the catalog. Add missing ones, even if they are worker scripts.
   - Remove any entries from the domain catalog that correspond to deleted userscripts.

3. **Verify Metadata and Event Mapping**
   - For every `.user.js` file, verify that it includes a `// @match https://userscript.moukaeritai.work/*` directive (or equivalent `@include`). If missing, add it.
   - Verify that the `<a class="install-button" data-script-name="EXPECTED_NAME" ...>` attribute in the catalog exactly matches the script name emitted by the userscript during the `userscript-check-installed` event (usually `GM_info.script.name` defined by the `// @name` metadata). Correct `data-script-name` if there are mismatches.

4. **Ensure No Hardcoded Versions**
   - Search the `index.html` catalog files for any hardcoded version strings (e.g., `(v1.0.0)`) inside the HTML.
   - Remove them. Version display and update button logic are handled dynamically by `domain-landing.js` and should not be hardcoded in HTML.
