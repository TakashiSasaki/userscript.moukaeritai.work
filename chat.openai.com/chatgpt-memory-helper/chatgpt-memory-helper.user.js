// ==UserScript==
// @name         ChatGPT Memory Helper
// @namespace    https://userscript.moukaeritai.work/
// @version      0.3.4
// @description  Adds serial numbers to memories in ChatGPT's memory management dialog.
// @author       Takashi Sasaki
// @match        https://chatgpt.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @license      MIT
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

(function() {
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

    const updateSerialNumbers = (dialog) => {
        const memoryItems = dialog.querySelectorAll('tbody > div.group');
        const totalCount = memoryItems.length;

        // Remove existing numbers to handle re-ordering/filtering
        memoryItems.forEach(item => {
            const existingNumber = item.querySelector('.memory-serial-number');
            if (existingNumber) {
                existingNumber.remove();
            }
        });

        // Add new numbers
        memoryItems.forEach((item, index) => {
            const memoryTextDiv = item.querySelector('.min-w-0.flex-initial');
            if (memoryTextDiv) {
                const numberSpan = document.createElement('span');
                numberSpan.textContent = `#${index + 1} of ${totalCount}`;
                numberSpan.className = 'memory-serial-number';
                numberSpan.style.fontWeight = 'bold';
                numberSpan.style.marginRight = '8px';
                numberSpan.style.whiteSpace = 'nowrap';
                memoryTextDiv.insertBefore(numberSpan, memoryTextDiv.firstChild);
            }
        });
    };

    const observer = new MutationObserver((mutationsList, _observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches('div[role="dialog"]')) {
                        const dialog = node;
                        const header = dialog.querySelector('h2');
                        if (header && (header.textContent.includes('保存されたメモリ') || header.textContent.includes('Memory'))) {
                            const memoryList = dialog.querySelector('tbody');
                            if (memoryList) {
                                // Initial run
                                updateSerialNumbers(dialog);

                                // Observe the list for changes (e.g., search, sort)
                                const listObserver = new MutationObserver(() => {
                                    updateSerialNumbers(dialog);
                                });
                                listObserver.observe(memoryList, { childList: true });
                            }
                        }
                    }
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();