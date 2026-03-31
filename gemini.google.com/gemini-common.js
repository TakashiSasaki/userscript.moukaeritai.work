/* === Gemini Userscript Common JavaScript === */
/* Loaded via @require by all gemini.google.com userscripts */

(function () {
    'use strict';

    const EMOJIS = ['❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽', '❾', '❿', '⓫', '⓬', '⓭', '⓮', '⓯', '⓰', '⓱', '⓲', '⓳', '⓴'];

    /**
     * Registers a Gemini userscript and assigns it a load-order emoji number.
     *
     * The load counter is stored in `document.documentElement.dataset.geminiUserscriptCount`
     * so that all userscript sandboxes share the same counter via the DOM.
     *
     * @param {string} scriptName - Display name of the script (GM_info.script.name)
     * @param {string} version    - Version string (GM_info.script.version), e.g. "0.4.48"
     * @returns {{ order: number, emoji: string }}
     *   order: 1-based load order
     *   emoji: circled number character e.g. "①"
     *
     * @example
     * // At the top of the script IIFE body:
     * const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);
     * // Then use gusEmoji when building version badge text:
     * // `${gusEmoji}v${version}` → "①v0.4.48"
     */
    window.registerGeminiUserscript = function (scriptName, version) {
        const root = document.documentElement;
        const count = parseInt(root.dataset.geminiUserscriptCount || '0') + 1;
        root.dataset.geminiUserscriptCount = String(count);
        const emoji = EMOJIS[count - 1] || '(' + count + ')';
        console.log('[GUS] ' + emoji + scriptName + ' v' + version + ' (load order: ' + count + ')');
        return { order: count, emoji: emoji };
    };


    /**
     * Pauses execution for a specified duration.
     * Uses background-aware polling to prevent Chrome from aggressively
     * throttling/suspending pure setTimeout in background tabs.
     * @param {number} ms - The number of milliseconds to sleep.
     * @returns {Promise<void>}
     */
    window.geminiSleep = function (ms) {
        return new Promise(resolve => {
            const start = Date.now();
            const interval = setInterval(() => {
                if (Date.now() - start >= ms) {
                    clearInterval(interval);
                    resolve();
                }
            }, Math.min(ms, 50));
        });
    };

    /**
     * Waits for an element to appear in the DOM.
     * @param {string} selector - The CSS selector of the element to wait for.
     * @param {ParentNode} [context=document] - The context within which to search.
     * @param {number} [timeout=5000] - The maximum time to wait in milliseconds.
     * @returns {Promise<Element>} - Resolves with the element or rejects with an Error if timeout is reached.
     */
    window.geminiWaitForElement = function (selector, context = document, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const el = context.querySelector(selector);
            if (el) return resolve(el);

            let timeoutId = null;
            const observer = new MutationObserver(() => {
                const el = context.querySelector(selector);
                if (el) {
                    if (timeoutId) clearTimeout(timeoutId);
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(context === document ? document.body : context, {
                childList: true,
                subtree: true
            });

            timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for ${selector}`));
            }, timeout);
        });
    };

    /**
     * Checks if a target userscript is installed via a ping/pong custom event mechanism.
     * @param {string} targetName - The exact name of the target userscript to check for.
     * @param {number} timeout - The timeout in milliseconds before giving up (default 2000).
     * @returns {Promise<Object|null>} - Resolves with the detail object (name, version) if found, otherwise null.
     */
    window.geminiCheckTargetUserscript = function (targetName, timeout = 2000) {
        return new Promise((resolve) => {
            const handler = (e) => {
                if (e.detail && e.detail.name === targetName) {
                    clearTimeout(timeoutId);
                    document.removeEventListener('userscript-check-installed', handler);
                    resolve(e.detail);
                }
            };
            const timeoutId = setTimeout(() => {
                document.removeEventListener('userscript-check-installed', handler);
                resolve(null); // Not found or timed out
            }, timeout);
            document.addEventListener('userscript-check-installed', handler);
            document.dispatchEvent(new CustomEvent('userscript-ping'));
        });
    };

    /**
     * UI Helper for displaying the status of a target script check in a specific container.
     * @param {string} containerId - The HTML ID of the container element where the status should be appended.
     * @param {string} targetName - The name of the target script.
     * @param {Object|null} statusDetail - The result detail object from geminiCheckTargetUserscript (or null if not found).
     */
    window.geminiShowTargetScriptStatus = function (containerId, targetName, statusDetail) {
        const container = document.getElementById(containerId);
        if (!container) return; // Panel might not be open yet

        const statusText = statusDetail
            ? `✅ ${targetName} (v${statusDetail.version})`
            : `❌ ${targetName} Not Found`;

        const ui = document.createElement('div');
        // Define fallback styles if the specific class doesn't exist, though typically consumer CSS handles these
        ui.className = 'gae-status-item ' + (statusDetail ? 'gae-status-success' : 'gae-status-error');
        ui.textContent = statusText;

        container.appendChild(ui);

        // Auto hide the individual status item after a few seconds
        setTimeout(() => {
            if (ui && ui.parentNode) {
                ui.style.transition = 'opacity 0.3s';
                ui.style.opacity = '0';
                setTimeout(() => { if (ui && ui.parentNode) ui.parentNode.removeChild(ui); }, 300);
            }
        }, statusDetail ? 4000 : 7000); // Keep errors slightly longer
    };

    /**
     * Makes a panel element draggable using a specific handle element.
     * Automatically saves the position if GM_setValue is provided along with a storageKey.
     * @param {HTMLElement} panel - The panel element to be moved.
     * @param {HTMLElement} handle - The handle element used for dragging (usually a header or version badge).
     * @param {Function} [gmSetValue] - The GM_setValue function to persist position (optional).
     * @param {string} [storageKey] - The key to use when saving the position.
     */
    window.geminiMakePanelDraggable = function (panel, handle, gmSetValue, storageKey) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            // Prevent default unless it's an input element to avoid text selection issues while dragging
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
            pos3 = e.clientX;
            pos4 = e.clientY;

            // Convert right/bottom positioning to absolute left/top for dragging
            if (panel.style.right || panel.style.bottom) {
                panel.style.left = panel.offsetLeft + 'px';
                panel.style.top = panel.offsetTop + 'px';
                panel.style.right = '';
                panel.style.bottom = '';
            }

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            handle.style.cursor = 'grabbing';
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            // Constrain within window bounds (rudimentary)
            let newTop = panel.offsetTop - pos2;
            let newLeft = panel.offsetLeft - pos1;

            // Optional: add bounds checking if needed, but original code didn't strictly enforce it during drag in all cases.
            panel.style.top = newTop + "px";
            panel.style.left = newLeft + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            handle.style.cursor = 'move';
            // handle.style.cursor is overridden by css sometimes, grabbing is inline, so resetting to '' might be better or 'move'/'grab' based on original CSS.
            handle.style.cursor = 'grab';

            if (gmSetValue && storageKey) {
                gmSetValue(storageKey, {
                    top: panel.style.top,
                    left: panel.style.left
                });
            }
        }
    };

    /**
     * Creates a Trusted Types policy for inserting HTML safely.
     * @param {string} policyName - A unique name for the policy.
     * @returns {TrustedTypePolicy|null} - The created policy or null if TrustedTypes is not supported.
     */
    window.geminiCreateTrustedHTMLPolicy = function (policyName) {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            try {
                return window.trustedTypes.createPolicy(policyName + '_' + Math.random().toString(36).substr(2, 9), {
                    createHTML: (string) => string
                });
            } catch (e) {
                console.warn('Failed to create TrustedTypes policy', e);
            }
        }
        return null;
    };

    /**
     * Safely sets the innerHTML of an element, utilizing a Trusted Types policy if provided.
     * @param {HTMLElement} element - The DOM element to modify.
     * @param {string} html - The HTML string to insert.
     * @param {TrustedTypePolicy|null} policy - The policy created via geminiCreateTrustedHTMLPolicy.
     */
    window.geminiSetInnerHTML = function (element, html, policy) {
        if (policy) {
            element.innerHTML = policy.createHTML(html);
        } else {
            element.innerHTML = html;
        }
    };
})();
