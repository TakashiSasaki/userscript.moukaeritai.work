# AGENTS.md

## Install Detection API
The userscript includes the install-detection guard required by the portal index and only injects this API on the following hosts:

- `userscript.moukaeritai.work`
- `127.0.0.1`
- `fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev`

Behavior on those hosts:

- **Dispatch**: `userscript-check-installed` is dispatched on page load.
- **Listener**: `userscript-ping` is listened for and replied to, then the script returns early.
