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
     * Ensures that a single shared snackbar observer is active for the page.
     * The observer dispatches `gemini-snackbar:shown` on `window` whenever a
     * visible snackbar with non-empty text is detected.
     *
     * @returns {{ observer: MutationObserver, processed: WeakSet<Element> }}
     */
    window.geminiEnsureSnackbarObserver = function () {
        if (window.__geminiSnackbarObserverState) {
            return window.__geminiSnackbarObserverState;
        }

        const SNACKBAR_SELECTOR = 'mat-snack-bar-container, .mat-mdc-snack-bar-container';
        const processed = new WeakSet();

        const normalizeText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

        const isVisible = (el) => {
            if (!el || !el.isConnected) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        };

        const collectSnackbarDetail = (container) => {
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
            const textNodes = [];
            let currentNode = walker.nextNode();
            while (currentNode) {
                const text = normalizeText(currentNode.nodeValue);
                if (text) {
                    textNodes.push(text);
                }
                currentNode = walker.nextNode();
            }

            const actionLabels = Array.from(container.querySelectorAll('button'))
                .map((button) => normalizeText(button.textContent))
                .filter(Boolean);

            const text = normalizeText(textNodes.join(' '));
            return {
                text,
                textNodes,
                actionLabels,
                containerId: container.id || null
            };
        };

        const classifySnackbar = (detail) => {
            const haystacks = [detail.text, ...(detail.textNodes || [])].map((text) => String(text || ''));
            const joinedLower = haystacks.join(' ').toLowerCase();
            const errorCodePattern = /\(\d+\)/;
            if (haystacks.some((text) => errorCodePattern.test(text))) {
                return { kind: 'error', matchedRule: 'parenthesized-error-code' };
            }

            const errorTerms = [
                'error', 'failed', 'couldn’t', 'couldn\'t', 'unable', 'timeout', 'retry', 'reload this page',
                '失敗', 'エラー', 'できません', 'ませんでした', '再読み込み', '読み込めません'
            ];
            const successTerms = [
                'created', 'creating', 'saved', 'copied', 'deleted', 'opened',
                '作成しました', '作成中', '保存しました', 'コピーしました', '削除しました', '開きました'
            ];

            const matchedError = errorTerms.find((term) => joinedLower.includes(term.toLowerCase()));
            if (matchedError) {
                return { kind: 'error', matchedRule: `error-term:${matchedError}` };
            }

            const matchedSuccess = successTerms.find((term) => joinedLower.includes(term.toLowerCase()));
            if (matchedSuccess) {
                return { kind: 'success', matchedRule: `success-term:${matchedSuccess}` };
            }

            return { kind: 'unknown', matchedRule: null };
        };

        const processContainer = (container) => {
            if (!container || processed.has(container) || !isVisible(container)) return;

            const detail = collectSnackbarDetail(container);
            if (!detail.text && !(detail.textNodes && detail.textNodes.length)) return;

            processed.add(container);
            const classification = classifySnackbar(detail);
            window.dispatchEvent(new CustomEvent('gemini-snackbar:shown', {
                detail: {
                    ...detail,
                    kind: classification.kind,
                    matchedRule: classification.matchedRule,
                    observedAt: Date.now()
                }
            }));
        };

        const scanSnackbars = () => {
            document.querySelectorAll(SNACKBAR_SELECTOR).forEach((container) => {
                processContainer(container);
            });
        };

        let scanScheduled = false;
        const scheduleScan = () => {
            if (scanScheduled) return;
            scanScheduled = true;
            setTimeout(() => {
                scanScheduled = false;
                scanSnackbars();
            }, 0);
        };

        const observer = new MutationObserver(() => {
            scheduleScan();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        const state = {
            observer,
            processed,
            scanSnackbars
        };
        window.__geminiSnackbarObserverState = state;
        scanSnackbars();
        return state;
    };

    /**
     * Makes a panel element draggable and persists its position using localStorage.
     * Eliminates the need for GM_setValue/GM_getValue dependencies for panel positioning.
     *
     * @param {HTMLElement} panel - The panel element to be moved.
     * @param {HTMLElement} handle - The handle element used for dragging (e.g., version badge).
     * @param {string} storageKey - A unique string key for localStorage (e.g., 'gus-pos-scriptname').
     * @param {Object} [defaultPos={ right: '20px', bottom: '20px' }] - Default CSS position if no saved state exists.
     */
        window.geminiSetupDraggablePanel = function (panel, handle, storageKey, defaultPos = { right: '20px', bottom: '20px' }) {
        if (!panel || !handle || !storageKey) return;

        // Add a common class to identify these panels for collision detection
        panel.classList.add('gus-draggable-panel');

        // Function to check and resolve collisions with other panels
        function resolveCollisions() {
            const margin = 10;
            const panels = Array.from(document.querySelectorAll('.gus-draggable-panel')).filter(p => p !== panel && p.style.display !== 'none');

            let currentRect = panel.getBoundingClientRect();
            let collisionFound = true;
            let iterations = 0;
            const maxIterations = 10; // Prevent infinite loops

            while (collisionFound && iterations < maxIterations) {
                collisionFound = false;
                iterations++;

                for (const otherPanel of panels) {
                    const otherRect = otherPanel.getBoundingClientRect();

                    // Check for overlap
                    if (currentRect.left < otherRect.right + margin &&
                        currentRect.right + margin > otherRect.left &&
                        currentRect.top < otherRect.bottom + margin &&
                        currentRect.bottom + margin > otherRect.top) {

                        collisionFound = true;

                        // Calculate distances to resolve collision in 4 directions
                        const shiftUp = currentRect.bottom - otherRect.top + margin;
                        const shiftDown = otherRect.bottom - currentRect.top + margin;
                        const shiftLeft = currentRect.right - otherRect.left + margin;
                        const shiftRight = otherRect.right - currentRect.left + margin;

                        // Find the minimum shift required
                        const minShift = Math.min(shiftUp, shiftDown, shiftLeft, shiftRight);

                        const direction = minShift === shiftUp ? 'UP' : minShift === shiftDown ? 'DOWN' : minShift === shiftLeft ? 'LEFT' : 'RIGHT';
                        console.log(`[GUS] UI Overlap detected! Shifting panel ${direction} by ${minShift.toFixed(1)}px to resolve collision (Iteration: ${iterations})`, {
                            panel: panel.id || storageKey,
                            collidedWith: otherPanel.id || 'another panel'
                        });

                        // Apply the minimum shift, ensuring it stays within window bounds if possible
                        if (minShift === shiftUp) {
                            currentRect.y -= shiftUp;
                        } else if (minShift === shiftDown) {
                            currentRect.y += shiftDown;
                        } else if (minShift === shiftLeft) {
                            currentRect.x -= shiftLeft;
                        } else if (minShift === shiftRight) {
                            currentRect.x += shiftRight;
                        }

                        // Enforce basic window constraints after shift
                        currentRect.y = Math.max(0, Math.min(currentRect.y, window.innerHeight - currentRect.height));
                        currentRect.x = Math.max(0, Math.min(currentRect.x, window.innerWidth - currentRect.width));

                        // Update the currentRect for the next iteration
                        currentRect.top = currentRect.y;
                        currentRect.bottom = currentRect.y + currentRect.height;
                        currentRect.left = currentRect.x;
                        currentRect.right = currentRect.x + currentRect.width;

                        break; // Re-evaluate all collisions after a shift
                    }
                }
            }

            // Apply final resolved position
            panel.style.top = currentRect.top + 'px';
            panel.style.left = currentRect.left + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';

            return iterations > 1; // Return true if position was changed due to collision
        }

        // Function to constrain panel position within the window
        function constrainPanelPosition() {
            // Convert relative positioning to absolute before constraining
            if (panel.style.right && panel.style.right !== 'auto' || panel.style.bottom && panel.style.bottom !== 'auto') {
                const rect = panel.getBoundingClientRect();
                panel.style.left = rect.left + 'px';
                panel.style.top = rect.top + 'px';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
            }

            const rect = panel.getBoundingClientRect();
            let newTop = rect.top;
            let newLeft = rect.left;
            let constrained = false;

            if (newTop < 0) {
                newTop = 0;
                constrained = true;
            } else if (newTop + rect.height > window.innerHeight) {
                newTop = window.innerHeight - rect.height;
                constrained = true;
            }

            if (newLeft < 0) {
                newLeft = 0;
                constrained = true;
            } else if (newLeft + rect.width > window.innerWidth) {
                newLeft = window.innerWidth - rect.width;
                constrained = true;
            }

            if (constrained) {
                panel.style.top = newTop + "px";
                panel.style.left = newLeft + "px";
            }

            const resolvedCollision = resolveCollisions();

            if (constrained || resolvedCollision) {
                // Save constrained/resolved position to LocalStorage
                try {
                    localStorage.setItem(storageKey, JSON.stringify({
                        top: panel.style.top,
                        left: panel.style.left
                    }));
                } catch (e) {
                    console.warn('[GUS] Failed to save constrained panel position', e);
                }
            }
        }

        // 1. Restore position from LocalStorage
        try {
            const savedPosRaw = localStorage.getItem(storageKey);
            if (savedPosRaw) {
                const savedPos = JSON.parse(savedPosRaw);
                if (savedPos && savedPos.top !== undefined && savedPos.left !== undefined) {
                    panel.style.top = savedPos.top;
                    panel.style.left = savedPos.left;
                    // Reset relative positioning
                    panel.style.right = 'auto';
                    panel.style.bottom = 'auto';
                } else {
                    Object.assign(panel.style, defaultPos);
                }
            } else {
                Object.assign(panel.style, defaultPos);
            }
        } catch {
            Object.assign(panel.style, defaultPos);
        }

        // Apply constraint initially after a short delay to allow rendering
        setTimeout(constrainPanelPosition, 100);

        // Apply constraint on window resize
        window.addEventListener('resize', constrainPanelPosition);

        // 2. Setup Drag Logic
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let startX = 0, startY = 0;
        const dragThreshold = 5; // pixels
        
        // Use grab cursor by default
        handle.style.cursor = 'grab';
        
        // Expose drag state to allow other listeners (like click) to check it
        panel._isGusDragging = false;
        
        handle.addEventListener('mousedown', dragMouseDown);

        // Also bind to the minimized/inactive content handle if it exists
        const inactiveContent = panel.querySelector('.gus-inactive-content');
        if (inactiveContent) {
            inactiveContent.style.cursor = 'grab';
            inactiveContent.addEventListener('mousedown', dragMouseDown);
        }
        
        function dragMouseDown(e) {
            e = e || window.event;
            // Ignore if clicking on interactive child elements within the handle
            if (e.target.closest('input, textarea, button, select, a')) {
                return;
            }
            // Do NOT preventDefault here, otherwise click events won't fire
            // e.preventDefault(); 
            
            pos3 = e.clientX;
            pos4 = e.clientY;
            startX = e.clientX;
            startY = e.clientY;
            panel._isGusDragging = false;
            
            // Convert relative positioning to absolute before dragging, using getBoundingClientRect for reliability
            if (panel.style.right && panel.style.right !== 'auto' || panel.style.bottom && panel.style.bottom !== 'auto') {
                const rect = panel.getBoundingClientRect();
                panel.style.left = rect.left + 'px';
                panel.style.top = rect.top + 'px';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
            }
            
            document.addEventListener('mouseup', closeDragElement);
            document.addEventListener('mousemove', elementDrag);
            
            // Visual feedback
            handle.style.cursor = 'grabbing';
            panel.style.transition = 'none'; // Disable smooth transitions during drag
        }
        
        function elementDrag(e) {
            e = e || window.event;
            
            // Check threshold
            if (!panel._isGusDragging) {
                const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
                if (dist > dragThreshold) {
                    panel._isGusDragging = true;
                }
            }
            
            if (panel._isGusDragging) {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                
                // Using offsetTop/Left is fine here since we just set top/left explicitly to pixels above
                let newTop = panel.offsetTop - pos2;
                let newLeft = panel.offsetLeft - pos1;
                
                // Basic window boundary constraints
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - panel.offsetHeight));
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panel.offsetWidth));
                
                panel.style.top = newTop + "px";
                panel.style.left = newLeft + "px";
            }
        }

        function closeDragElement() {
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', elementDrag);
            handle.style.cursor = 'grab';
            panel.style.transition = ''; // Restore transitions

            // Resolve collisions and enforce constraints after dropping
            resolveCollisions();

            // 3. Save to LocalStorage
            try {
                localStorage.setItem(storageKey, JSON.stringify({
                    top: panel.style.top,
                    left: panel.style.left
                }));
            } catch (e) {
                console.warn('[GUS] Failed to save panel position to localStorage', e);
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
            if (window.trustedTypes && window.trustedTypes.createPolicy) {
                throw new TypeError('geminiSetInnerHTML: policy is required in Trusted Types environment.');
            }
            element.innerHTML = html;
        }
    };

    /**
     * Sets up a panel to be minimizable, toggling the 'gus-minimized' class and persisting state.
     * Requires the panel to have '.gus-active-content' and '.gus-inactive-content' child elements.
     *
     * @param {HTMLElement} panel - The main panel element.
     * @param {string} storageKey - A unique string key for localStorage (e.g., 'gus-minimized-scriptname').
     * @param {HTMLElement} [activeHeader=null] - Optional header element inside the active content to trigger minimization on double-click.
     * @param {boolean} [defaultMinimized=false] - Default state if no saved state exists.
     */
    window.geminiSetupMinimizablePanel = function (panel, storageKey, activeHeader = null, defaultMinimized = false) {
        if (!panel || !storageKey) return;

        // 1. Restore state from LocalStorage
        let isMinimized = defaultMinimized;
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState !== null) {
                isMinimized = savedState === 'true';
            }
        } catch (e) {
            console.warn('[GUS] Failed to read minimized state from localStorage', e);
        }

        const applyState = (minimized) => {
            if (minimized) {
                panel.classList.add('gus-minimized');
            } else {
                panel.classList.remove('gus-minimized');
            }
            try {
                localStorage.setItem(storageKey, minimized.toString());
            } catch (e) {
                console.warn('[GUS] Failed to save minimized state to localStorage', e);
            }
        };

        // Apply initial state
        applyState(isMinimized);

        // 2. Setup Toggle Logic
        // Allow clicking the inactive content area to expand
        const inactiveContent = panel.querySelector('.gus-inactive-content');
        if (inactiveContent) {
            const expandHandler = (e) => {
                // Prevent toggling if dragging
                if (panel._isGusDragging) return;
                applyState(false);
                e.stopPropagation();
            };
            inactiveContent.addEventListener('click', expandHandler);
        }

        // Allow clicking a specific active header to collapse
        if (activeHeader) {
            activeHeader.addEventListener('click', (e) => {
                // Prevent toggling if dragging
                if (panel._isGusDragging) return;
                applyState(true);
                e.stopPropagation();
            });
        }

        // Return a function to programmatically set the state if needed
        return {
            setMinimized: (state) => applyState(state),
            isMinimized: () => panel.classList.contains('gus-minimized')
        };
    };

    /**
     * Creates a standard minimizable, draggable floating panel shell using the gemini-common.html template.
     * @param {Object} options
     * @param {string} options.htmlString - The content of gemini-common.html loaded via GM_getResourceText.
     * @param {TrustedTypePolicy} [options.policy] - Trusted types policy to use.
     * @param {string} options.title - Full title (e.g., "Gemini Turn Counter v1.0.0").
     * @param {string} options.icon - Icon/Short string for inactive state (e.g., "📋 v1.0.0" or "📋").
     * @param {HTMLElement} options.contentElement - The body content wrapper to insert.
     * @returns {HTMLElement} The constructed panel shell element.
     */
    window.geminiCreateCommonPanel = function(options) {
        const temp = document.createElement('div');
        window.geminiSetInnerHTML(temp, options.htmlString, options.policy);
        
        const template = temp.querySelector('#gus-common-panel');
        if (!template) {
            console.error("[GUS] Common panel template '#gus-common-panel' not found in provided HTML.");
            return temp; 
        }

        const shell = document.createElement('div');
        shell.appendChild(template.content.cloneNode(true));
        
        // Apply classes and content
        shell.className = 'gus-panel-shell gus-draggable-panel';
        
        const icons = shell.querySelectorAll('.gus-panel-icon');
        icons.forEach(el => {
            el.textContent = options.icon || options.title || '';
        });

        const versions = shell.querySelectorAll('.gus-version');
        versions.forEach(el => {
            el.textContent = options.version ? `v${options.version}` : '';
        });
        
        const displayName = (options.name || options.title || '').replace(/^Gemini\s+/, '');
        const panelNames = shell.querySelectorAll('.gus-panel-name');
        panelNames.forEach(el => {
            el.textContent = displayName;
        });

        const activeVersion = shell.querySelector('.gus-panel-version');
        if (activeVersion) {
            activeVersion.textContent = options.version ? `v${options.version}` : '';
        }

        const body = shell.querySelector('.gus-panel-body');
        if (body && options.contentElement) {
            body.appendChild(options.contentElement);
        }

        return shell;
    };

})();
