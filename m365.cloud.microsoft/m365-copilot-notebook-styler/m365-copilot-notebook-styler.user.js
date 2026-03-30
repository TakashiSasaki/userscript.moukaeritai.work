// ==UserScript==
// @name         M365 Copilot Notebook Styler
// @namespace    userscript.moukaeritai.work
// @version      0.1.4
// @description  Adds subtle background colors to M365 Copilot Notebook panes to clarify boundaries.
// @author       Takashi Sasaki
// @match        https://m365.cloud.microsoft/chat/*
// @match        https://m365.cloud.microsoft/notebooks/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_info
// ==/UserScript==

(function () {
    'use strict';
const report = () => {
        document.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
    };
    document.addEventListener('userscript-ping', report);

    if (location.hostname === 'userscript.moukaeritai.work') {
        return;
    }

    // ==============================================================================
    // Main Logic
    // ==============================================================================
    (function () {
        'use strict';

        const TOGGLE_KEY = 'm365-copilot-styler-enabled';
        let isEnabled = GM_getValue(TOGGLE_KEY, true);
        let mainObserver = null;
        let iframeObserver = null;
        let currentContext = document;

        function getTargetDocument() {
            const iframe = document.querySelector('iframe[title="Notebooks"]');
            if (iframe && iframe.contentDocument) {
                return iframe.contentDocument;
            }
            return document;
        }

        // Custom CSS for Panes
        const STYLE_ID = 'm365-copilot-styler-css';
        const cssContent = `
            body.m365-styler-active .m365-pane-left {
                background-color: var(--colorNeutralBackground3, rgba(128, 128, 128, 0.04)) !important;
            }
            body.m365-styler-active .m365-pane-center {
                background-color: var(--colorNeutralBackground1, transparent) !important;
            }
            body.m365-styler-active .m365-pane-right {
                background-color: var(--colorBrandBackground2, rgba(0, 120, 212, 0.04)) !important;
            }

            /* Floating UI Styles */
            #m365-styler-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                background-color: var(--colorNeutralBackground1, rgba(255, 255, 255, 0.95));
                border: 1px solid var(--colorNeutralStroke1, #ccc);
                border-radius: 8px;
                padding: 10px 14px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                font-family: inherit;
                font-size: 13px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                user-select: none;
                cursor: default;
                color: var(--colorNeutralForeground1, #333);
                opacity: 0.85;
                transition: opacity 0.2s;
            }
            #m365-styler-panel:hover {
                opacity: 1;
            }
            #m365-styler-panel .drag-handle {
                cursor: grab;
                font-weight: bold;
                margin-bottom: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--colorNeutralStroke2, #eee);
                padding-bottom: 4px;
            }
            #m365-styler-panel .drag-handle:active {
                cursor: grabbing;
            }
            #m365-styler-panel .script-title {
                margin: 0;
            }
            #m365-styler-panel .script-version {
                font-size: 10px;
                color: var(--colorNeutralForeground3, #777);
                margin-left: 8px;
            }
            #m365-styler-panel label {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                margin: 0;
            }
        `;

        function injectStyle() {
            const targetDoc = getTargetDocument();
            if (!targetDoc.getElementById(STYLE_ID)) {
                const style = targetDoc.createElement('style');
                style.id = STYLE_ID;
                style.textContent = cssContent;
                targetDoc.head.appendChild(style);
            }
            if (targetDoc !== document && !document.getElementById(STYLE_ID)) {
                const styleMain = document.createElement('style');
                styleMain.id = STYLE_ID;
                styleMain.textContent = cssContent;
                document.head.appendChild(styleMain);
            }
            toggleBodyClass();
        }

        function toggleBodyClass() {
            const targetDoc = getTargetDocument();
            if (isEnabled) {
                targetDoc.body.classList.add('m365-styler-active');
                if (targetDoc !== document && document.body) {
                    document.body.classList.add('m365-styler-active');
                }
            } else {
                targetDoc.body.classList.remove('m365-styler-active');
                if (targetDoc !== document && document.body) {
                    document.body.classList.remove('m365-styler-active');
                }
            }
        }

        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // ==========================================
        // UI Panel
        // ==========================================
        function createDraggablePanel() {
            if (document.getElementById('m365-styler-panel')) return;

            const panel = document.createElement('div');
            panel.id = 'm365-styler-panel';

            // Drag handle with Title and Version
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'script-title';
            titleSpan.textContent = 'M365 Pane Styler';

            const versionSpan = document.createElement('span');
            versionSpan.className = 'script-version';
            versionSpan.textContent = `v${GM_info.script.version}`;

            dragHandle.appendChild(titleSpan);
            dragHandle.appendChild(versionSpan);

            // Toggle switch
            const toggleLabel = document.createElement('label');
            const toggleWrapper = document.createElement('div');
            toggleWrapper.style.display = 'flex';
            toggleWrapper.style.alignItems = 'center';
            toggleWrapper.style.gap = '8px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isEnabled;
            checkbox.onchange = (e) => {
                isEnabled = e.target.checked;
                GM_setValue(TOGGLE_KEY, isEnabled);
                toggleBodyClass();
            };

            const toggleText = document.createElement('span');
            toggleText.textContent = 'Colorize Panes';

            toggleWrapper.appendChild(checkbox);
            toggleWrapper.appendChild(toggleText);
            toggleLabel.appendChild(toggleWrapper);

            panel.appendChild(dragHandle);
            panel.appendChild(toggleLabel);
            document.body.appendChild(panel);

            // Drag logic
            let isDragging = false;
            let startX, startY, initialX, initialY;

            dragHandle.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialX = panel.offsetLeft;
                initialY = panel.offsetTop;
                // Prevent interfering with contents
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                panel.style.left = `${initialX + dx}px`;
                panel.style.top = `${initialY + dy}px`;
                panel.style.right = 'auto'; // Disable initial right anchoring
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) isDragging = false;
            });
        }

        // ==========================================
        // Pane Structuring Logic
        // ==========================================
        function findAndTagPanes() {
            const targetDoc = getTargetDocument();
            // Wait for the workspace to load
            const centerCandidate = targetDoc.querySelector('div[scrollable="true"]');
            if (!centerCandidate) return;

            // Go up to the immediate flex container holding the panes
            const container = centerCandidate.parentElement;
            if (!container) return;

            // Find the separator
            const separator = container.querySelector('div[role="separator"]');

            const children = Array.from(container.children);

            // Tag Left Pane (everything before the center pane, typically nav tree)
            const centerIndex = children.indexOf(centerCandidate);
            if (centerIndex > 0) {
                // Usually the immediate sibling before center is the nav container
                const leftCandidate = children[centerIndex - 1];
                if (leftCandidate && leftCandidate !== separator) {
                    leftCandidate.classList.add('m365-pane-left');
                }
            }

            // Tag Center Pane
            centerCandidate.classList.add('m365-pane-center');

            // Tag Right Pane (everything after separator)
            if (separator) {
                const sepIndex = children.indexOf(separator);
                if (sepIndex > -1 && sepIndex < children.length - 1) {
                    const rightCandidate = children[sepIndex + 1];
                    if (rightCandidate) {
                        rightCandidate.classList.add('m365-pane-right');
                    }
                }
            }
        }

        const debouncedTagging = debounce(findAndTagPanes, 500);

        function setupObservers() {
            if (mainObserver) mainObserver.disconnect();

            mainObserver = new MutationObserver((mutations) => {
                const targetDoc = getTargetDocument();
                if (targetDoc !== currentContext) {
                    currentContext = targetDoc;
                    initContext();
                }

                const shouldCheck = mutations.some(m => {
                    return m.addedNodes.length > 0 && Array.from(m.addedNodes).some(n => n.nodeType === 1);
                });
                if (shouldCheck) {
                    debouncedTagging();
                }
            });

            mainObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        function initContext() {
            const targetDoc = getTargetDocument();
            injectStyle();

            if (iframeObserver) {
                iframeObserver.disconnect();
                iframeObserver = null;
            }

            if (targetDoc !== document && targetDoc.body) {
                iframeObserver = new MutationObserver((mutations) => {
                    const shouldCheck = mutations.some(m => {
                        return m.addedNodes.length > 0 && Array.from(m.addedNodes).some(n => n.nodeType === 1);
                    });
                    if (shouldCheck) {
                        debouncedTagging();
                    }
                });
                iframeObserver.observe(targetDoc.body, { childList: true, subtree: true });
            }

            debouncedTagging();
        }

        // Initialization
        function init() {
            createDraggablePanel();
            initContext();
            setupObservers();
        }

        // Wait for body before starting
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

    })();

})();
