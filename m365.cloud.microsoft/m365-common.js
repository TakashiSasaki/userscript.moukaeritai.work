/* === M365 Copilot Userscript Common JavaScript === */
/* Loaded via @require by m365.cloud.microsoft userscripts */

(function () {
    'use strict';

    /**
     * Creates a Trusted Types policy for inserting HTML safely in M365.
     * @param {string} policyName - A unique name for the policy.
     * @returns {TrustedTypePolicy|null} - The created policy or null if TrustedTypes is not supported.
     */
    window.m365CreateTrustedHTMLPolicy = function (policyName) {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            try {
                return window.trustedTypes.createPolicy(policyName + '_' + Math.random().toString(36).substr(2, 9), {
                    createHTML: (string) => string
                });
            } catch (e) {
                console.warn('[M365 Common] Failed to create TrustedTypes policy', e);
            }
        }
        return null;
    };

    /**
     * Safely sets the innerHTML of an element, utilizing a Trusted Types policy if provided.
     * @param {HTMLElement} element - The DOM element to modify.
     * @param {string} html - The HTML string to insert.
     * @param {TrustedTypePolicy|null} policy - The policy.
     */
    window.m365SetInnerHTML = function (element, html, policy) {
        if (policy) {
            element.innerHTML = policy.createHTML(html);
        } else {
            element.innerHTML = html;
        }
    };

    /**
     * Common Floating Panel Class
     */
    window.M365FloatingPanel = class {
        constructor(config) {
            this.id = config.id || 'm365-default-panel';
            this.title = config.title || 'M365 Tool';
            this.version = config.version || '0.0.0';
            this.storageKey = config.storageKey || ('m365-panel-pos-' + this.id);
            this.defaultPos = config.defaultPosition || { right: '20px', bottom: '20px' };
            this.rawTemplate = config.template || '';
            this.onDoubleClickHeader = config.onDoubleClickHeader || null;
            
            this.policy = window.m365CreateTrustedHTMLPolicy('m365_panel_' + this.id);
            this.element = null;
            this.headerEl = null;
            this.handleEl = null;
            this.contentEl = null;

            this.init();
        }

        init() {
            if (document.getElementById(this.id)) return;

            // Replace placeholders in template
            let processedTemplate = this.rawTemplate
                .replace(/\{\{TITLE\}\}/g, this.title)
                .replace(/\{\{VERSION\}\}/g, this.version);

            // Create a temp wrapper to parse the HTML and CSS safely
            const wrapper = document.createElement('div');
            window.m365SetInnerHTML(wrapper, processedTemplate, this.policy);

            // Extract the style and the panel from the wrapper
            const styleNode = wrapper.querySelector('style');
            if (styleNode) {
                // Ensure style is global if injected
                if (!document.getElementById('m365-common-style')) {
                    styleNode.id = 'm365-common-style';
                    document.head.appendChild(styleNode);
                }
            }

            const panelNode = wrapper.querySelector('.m365-common-panel');
            if (!panelNode) {
                console.error('[M365 Common] Valid panel template not found.');
                return;
            }

            // Transfer node into main container
            this.element = panelNode;
            this.element.id = this.id;

            this.headerEl = this.element.querySelector('.m365-common-header');
            this.handleEl = this.element.querySelector('.m365-common-drag-handle');
            this.contentEl = this.element.querySelector('.m365-common-content');

            if (this.onDoubleClickHeader && this.headerEl) {
                this.headerEl.addEventListener('dblclick', this.onDoubleClickHeader);
            }

            this.restorePosition();
            this.setupDragging();

            document.body.appendChild(this.element);
            
            // Resolve collisions after appending to body
            setTimeout(() => this.resolveCollisions(), 100);
            
            // Listen for resize to re-constrain
            window.addEventListener('resize', () => this.resolveCollisions());
        }

        /**
         * Safely injects child HTML content into the panel.
         * @param {string} htmlString - String to inject
         */
        setContent(htmlString) {
            if (this.contentEl) {
                window.m365SetInnerHTML(this.contentEl, htmlString, this.policy);
            }
        }
        
        /**
         * Get the raw container element so children can be appended directly or events attached.
         */
        get contentNode() {
            return this.contentEl;
        }

        get containerNode() {
            return this.element;
        }

        setTitle(newTitle) {
            if (this.handleEl) {
                this.handleEl.textContent = newTitle;
            }
        }

        restorePosition() {
            try {
                // Compatibility warning: window.GM_getValue should be checked if available, 
                // but since these scripts are strictly userscripts we usually have localStorage or GM_getValue.
                // We'll use localStorage for simple coordinate dragging consistency across domains where applicable,
                // or just fall back to standard layout. The original scripts mostly used manual localStorage or GM_getValue.
                let savedPosRaw = null;
                
                // Prefer GM_getValue if available for cross-origin or incognito stability
                if (typeof GM_getValue !== 'undefined') {
                    savedPosRaw = GM_getValue(this.storageKey + '_pos', null);
                } 
                if (!savedPosRaw && typeof localStorage !== 'undefined') {
                    savedPosRaw = localStorage.getItem(this.storageKey + '_pos');
                }

                if (savedPosRaw) {
                    const savedPos = typeof savedPosRaw === 'string' ? JSON.parse(savedPosRaw) : savedPosRaw;
                    if (savedPos && savedPos.top !== undefined && savedPos.left !== undefined) {
                        this.element.style.top = savedPos.top + 'px';
                        this.element.style.left = savedPos.left + 'px';
                        this.element.style.right = 'auto';
                        this.element.style.bottom = 'auto';
                        return;
                    }
                }
            } catch (e) {
                console.warn('[M365 Common] Failed to read position context', e);
            }
            
            // Apply default
            Object.assign(this.element.style, this.defaultPos);
        }

        savePosition() {
            const pos = {
                top: parseInt(this.element.style.top, 10),
                left: parseInt(this.element.style.left, 10)
            };

            try {
                if (typeof GM_setValue !== 'undefined') {
                    GM_setValue(this.storageKey + '_pos', pos);
                }
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(this.storageKey + '_pos', JSON.stringify(pos));
                }
            } catch (e) {
                console.warn('[M365 Common] Failed to save position', e);
            }
        }

        setupDragging() {
            if (!this.handleEl) return;

            let isDragging = false;
            let dragOffset = { x: 0, y: 0 };

            this.handleEl.addEventListener('mousedown', (e) => {
                // Prevent drag if clicking on interactive elements
                if (e.target.closest('button, input, a, select')) return;

                isDragging = true;
                
                // Convert relative positioning to absolute
                if (this.element.style.right && this.element.style.right !== 'auto' || 
                    this.element.style.bottom && this.element.style.bottom !== 'auto') {
                    const rect = this.element.getBoundingClientRect();
                    this.element.style.left = rect.left + 'px';
                    this.element.style.top = rect.top + 'px';
                    this.element.style.right = 'auto';
                    this.element.style.bottom = 'auto';
                }

                dragOffset.x = this.element.offsetLeft - e.clientX;
                dragOffset.y = this.element.offsetTop - e.clientY;
                
                this.element.style.transition = 'none';
                this.handleEl.style.cursor = 'grabbing';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                let newLeft = e.clientX + dragOffset.x;
                let newTop = e.clientY + dragOffset.y;

                // Restrict to bounds
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - this.element.offsetWidth));
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - this.element.offsetHeight));

                this.element.style.left = newLeft + 'px';
                this.element.style.top = newTop + 'px';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    this.element.style.transition = '';
                    this.handleEl.style.cursor = 'move';
                    this.resolveCollisions();
                    this.savePosition();
                }
            });
            
            // Set initial cursor
            this.handleEl.style.cursor = 'move';
        }

        /**
         * Detects overlaps with other panels and shifts the current panel to resolve them.
         */
        resolveCollisions() {
            if (!this.element) return false;

            const margin = 10;
            const panels = Array.from(document.querySelectorAll('.m365-common-panel'))
                .filter(p => p !== this.element && p.style.display !== 'none');

            let currentRect = this.element.getBoundingClientRect();
            let collisionFound = true;
            let iterations = 0;
            const maxIterations = 10;

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

                        console.log(`[M365 Common] UI Overlap detected! Shifting panel ${direction} by ${minShift.toFixed(1)}px to resolve collision (Iteration: ${iterations})`, {
                            panel: this.id,
                            collidedWith: otherPanel.id || 'another panel'
                        });

                        // Apply the minimum shift
                        if (minShift === shiftUp) {
                            currentRect.y -= shiftUp;
                        } else if (minShift === shiftDown) {
                            currentRect.y += shiftDown;
                        } else if (minShift === shiftLeft) {
                            currentRect.x -= shiftLeft;
                        } else if (minShift === shiftRight) {
                            currentRect.x += shiftRight;
                        }

                        // Enforce window boundaries
                        currentRect.y = Math.max(0, Math.min(currentRect.y, window.innerHeight - currentRect.height));
                        currentRect.x = Math.max(0, Math.min(currentRect.x, window.innerWidth - currentRect.width));

                        // Update currentRect for next iteration
                        currentRect.top = currentRect.y;
                        currentRect.bottom = currentRect.y + currentRect.height;
                        currentRect.left = currentRect.x;
                        currentRect.right = currentRect.x + currentRect.width;

                        break; 
                    }
                }
            }

            if (iterations > 1) {
                this.element.style.top = currentRect.top + 'px';
                this.element.style.left = currentRect.left + 'px';
                this.element.style.right = 'auto';
                this.element.style.bottom = 'auto';
                return true;
            }
            return false;
        }
    };
})();
