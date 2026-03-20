# Pocket Tweaker (Obsoleted) - Implementation Details

## Overview
This script is now marked as **obsoleted** because the target service `getpocket.com` has ended.
The final update (v0.2.5) removed `console.log` statements and aligned the script with the current project standards.

## Selectors
- Articles: `ARTICLE.reader`
- Code blocks: `PRE` within the article.
- Observation target: `BODY > DIV` (main content area of Pocket's SPA).

## Performance Strategy
- **Debounced MutationObserver**: Styles are applied after a 200ms debounce to prevent performance spikes during DOM heavy updates.
- **Selective Observation**: Only observes the main content container.

## Obsoletion Status
- Directory name: `pocket-tweaker-obsoleted`
- Excluded from main `index.html` list by `AGENTS.md` naming convention.
