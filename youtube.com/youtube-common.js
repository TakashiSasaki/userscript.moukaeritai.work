/* === YouTube Userscript Common JavaScript === */
/* Loaded via @require by all youtube.com userscripts */

(function () {
    'use strict';

    const EMOJIS = ['❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽', '❾', '❿', '⓫', '⓬', '⓭', '⓮', '⓯', '⓰', '⓱', '⓲', '⓳', '⓴'];

    /**
     * Registers a YouTube userscript and assigns it a load-order emoji number.
     *
     * @param {string} scriptName - Display name of the script
     * @param {string} version    - Version string
     * @returns {{ order: number, emoji: string }}
     */
    window.registerYoutubeUserscript = function (scriptName, version) {
        const root = document.documentElement;
        const count = parseInt(root.dataset.youtubeUserscriptCount || '0') + 1;
        root.dataset.youtubeUserscriptCount = String(count);
        const emoji = EMOJIS[count - 1] || '(' + count + ')';
        console.log('[YUS] ' + emoji + scriptName + ' v' + version + ' (load order: ' + count + ')');
        return { order: count, emoji: emoji };
    };

    /**
     * Sets up drag-and-drop functionality for a floating panel.
     * Persists position to localStorage and constraints it to the viewport.
     */
    window.youtubeSetupDraggablePanel = function (panel, handle, storageKey, defaultPos = { right: '20px', bottom: '20px' }) {
        if (!panel || !handle || !storageKey) return;

        function constrainPanelPosition() {
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
                newTop = Math.max(0, window.innerHeight - rect.height);
                constrained = true;
            }

            if (newLeft < 0) {
                newLeft = 0;
                constrained = true;
            } else if (newLeft + rect.width > window.innerWidth) {
                newLeft = Math.max(0, window.innerWidth - rect.width);
                constrained = true;
            }

            if (constrained) {
                panel.style.top = newTop + "px";
                panel.style.left = newLeft + "px";
                try {
                    localStorage.setItem(storageKey, JSON.stringify({ top: panel.style.top, left: panel.style.left }));
                } catch (e) {
                    console.warn('[YUS] Failed to save constrained panel position', e);
                }
            }
        }

        try {
            const savedPosStr = localStorage.getItem(storageKey);
            if (savedPosStr) {
                const savedPos = JSON.parse(savedPosStr);
                if (savedPos.top && savedPos.left) {
                    panel.style.top = savedPos.top;
                    panel.style.left = savedPos.left;
                    panel.style.right = 'auto';
                    panel.style.bottom = 'auto';
                } else {
                    Object.assign(panel.style, defaultPos);
                }
            } else {
                Object.assign(panel.style, defaultPos);
            }
        } catch (e) {
            console.warn('[YUS] Failed to read panel position from localStorage', e);
            Object.assign(panel.style, defaultPos);
        }

        requestAnimationFrame(constrainPanelPosition);

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        handle.style.cursor = 'grab';

        handle.addEventListener('mousedown', function (e) {
            if (e.target.closest('input, textarea, button, select, a, .yus-no-drag')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            if (panel.style.right && panel.style.right !== 'auto' || panel.style.bottom && panel.style.bottom !== 'auto') {
                const rect = panel.getBoundingClientRect();
                panel.style.left = rect.left + 'px';
                panel.style.top = rect.top + 'px';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
            }

            initialLeft = parseFloat(panel.style.left) || 0;
            initialTop = parseFloat(panel.style.top) || 0;
            handle.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            panel.style.left = (initialLeft + dx) + 'px';
            panel.style.top = (initialTop + dy) + 'px';
        });

        document.addEventListener('mouseup', function () {
            if (isDragging) {
                isDragging = false;
                handle.style.cursor = 'grab';
                constrainPanelPosition();
                try {
                    localStorage.setItem(storageKey, JSON.stringify({ top: panel.style.top, left: panel.style.left }));
                } catch (e) {
                    console.warn('[YUS] Failed to save panel position', e);
                }
            }
        });

        window.addEventListener('resize', () => {
            if (!isDragging) {
                requestAnimationFrame(constrainPanelPosition);
            }
        });
    };

    /**
     * Sets up minimization toggling for a panel.
     */
    window.youtubeSetupMinimizablePanel = function (panel, storageKey, defaultMinimized = false) {
        if (!panel || !storageKey) return;

        let isMinimized = defaultMinimized;
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState !== null) {
                isMinimized = savedState === 'true';
            }
        } catch (e) {
            console.warn('[YUS] Failed to read minimized state from localStorage', e);
        }

        const applyState = (minimized) => {
            if (minimized) {
                panel.classList.add('yus-minimized');
            } else {
                panel.classList.remove('yus-minimized');
            }
            try {
                localStorage.setItem(storageKey, minimized.toString());
            } catch (e) {
                console.warn('[YUS] Failed to save minimized state', e);
            }

            // Constrain position after resize (timeout to let CSS transition finish)
            setTimeout(() => {
                 if(panel.style.top && panel.style.left) {
                     const rect = panel.getBoundingClientRect();
                     let newTop = parseFloat(panel.style.top);
                     let newLeft = parseFloat(panel.style.left);
                     let constrained = false;

                     if (newTop + rect.height > window.innerHeight) {
                         newTop = Math.max(0, window.innerHeight - rect.height);
                         constrained = true;
                     }
                     if (newLeft + rect.width > window.innerWidth) {
                         newLeft = Math.max(0, window.innerWidth - rect.width);
                         constrained = true;
                     }

                     if (constrained) {
                         panel.style.top = newTop + "px";
                         panel.style.left = newLeft + "px";
                         try {
                            localStorage.setItem(storageKey.replace('_is_minimized', '_panel_position'), JSON.stringify({ top: panel.style.top, left: panel.style.left }));
                         } catch(e){}
                     }
                 }
            }, 50);
        };

        applyState(isMinimized);

        const toggleMinimize = (e) => {
            // ignore if clicking on inputs/buttons inside the handle
            if (e && e.target && e.target.closest('input, textarea, button, select, a, .yus-no-minimize')) return;
            isMinimized = !isMinimized;
            applyState(isMinimized);
        };

        const titleHandles = panel.querySelectorAll('.yus-version, .yus-header');
        titleHandles.forEach(handle => {
            handle.addEventListener('dblclick', toggleMinimize);
        });

        return toggleMinimize;
    };

})();
