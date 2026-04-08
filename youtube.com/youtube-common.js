// youtube-common.js
// Shared floating panel utilities for YouTube playlist userscripts.
// Loaded via @require in each userscript.
// Position is persisted in localStorage (shared across all scripts on www.youtube.com).

/* global yusRestorePosition, yusSavePosition, yusMakeDraggable, yusCheckPanelPosition */

/**
 * Restore a floating panel's position from localStorage.
 * Falls back to defaultPos if no saved value is found.
 *
 * @param {HTMLElement} panelEl - The panel root element.
 * @param {string} storageKey - The localStorage key.
 * @param {{top?: string, left?: string, bottom?: string, right?: string}} defaultPos
 */
function yusRestorePosition(panelEl, storageKey, defaultPos) {
    let pos = null;
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) pos = JSON.parse(raw);
    } catch (e) {
        pos = null;
    }
    if (!pos) pos = defaultPos;

    if (pos.top)    panelEl.style.top    = pos.top;
    if (pos.left)   panelEl.style.left   = pos.left;
    if (pos.bottom) panelEl.style.bottom = pos.bottom;
    if (pos.right)  panelEl.style.right  = pos.right;
}

/**
 * Save a floating panel's current position to localStorage.
 * Always saves as absolute top/left (bottom/right cleared).
 *
 * @param {HTMLElement} panelEl - The panel root element.
 * @param {string} storageKey - The localStorage key.
 */
function yusSavePosition(panelEl, storageKey) {
    const pos = {
        top:    panelEl.style.top,
        left:   panelEl.style.left,
        bottom: '',
        right:  ''
    };
    try {
        localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch (e) {
        // Ignore storage errors (e.g. private browsing quota)
    }
}

/**
 * Attach drag-to-move behaviour to a floating panel via its header element.
 * Skips drag initiation when clicking on BUTTON, INPUT, or LABEL targets.
 * Saves the new position to localStorage on drag end.
 *
 * @param {HTMLElement} panelEl    - The panel root element.
 * @param {HTMLElement} headerEl   - The drag handle (header) element.
 * @param {string}      storageKey - The localStorage key used by yusSavePosition.
 */
function yusMakeDraggable(panelEl, headerEl, storageKey) {
    const SKIP_TAGS = ['BUTTON', 'INPUT', 'LABEL'];
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let initialLeft = 0, initialTop = 0;

    headerEl.addEventListener('mousedown', (e) => {
        if (SKIP_TAGS.includes(e.target.tagName)) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const rect = panelEl.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop  = rect.top;

        // Switch to absolute positioning so right/bottom don't interfere
        panelEl.style.bottom = 'auto';
        panelEl.style.right  = 'auto';
        panelEl.style.left   = `${initialLeft}px`;
        panelEl.style.top    = `${initialTop}px`;

        e.preventDefault(); // Prevent text selection during drag
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panelEl.style.left = `${initialLeft + (e.clientX - dragStartX)}px`;
        panelEl.style.top  = `${initialTop  + (e.clientY - dragStartY)}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            yusSavePosition(panelEl, storageKey);
        }
    });
}

/**
 * Clamp a floating panel within the visible viewport.
 * Corrects position and saves it to localStorage if adjustment is needed.
 *
 * @param {HTMLElement} panelEl    - The panel root element (may be null — no-op if so).
 * @param {string}      storageKey - The localStorage key used by yusSavePosition.
 */
function yusCheckPanelPosition(panelEl, storageKey) {
    if (!panelEl) return;
    const rect = panelEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let newLeft = rect.left;
    let newTop  = rect.top;
    let needsUpdate = false;

    if (rect.right  > vw) { newLeft = Math.max(0, vw - rect.width);  needsUpdate = true; }
    if (rect.left   < 0)  { newLeft = 0;                              needsUpdate = true; }
    if (rect.bottom > vh) { newTop  = Math.max(0, vh - rect.height); needsUpdate = true; }
    if (rect.top    < 0)  { newTop  = 0;                              needsUpdate = true; }

    if (needsUpdate) {
        panelEl.style.bottom = 'auto';
        panelEl.style.right  = 'auto';
        panelEl.style.left   = `${newLeft}px`;
        panelEl.style.top    = `${newTop}px`;
        yusSavePosition(panelEl, storageKey);
    }
}
