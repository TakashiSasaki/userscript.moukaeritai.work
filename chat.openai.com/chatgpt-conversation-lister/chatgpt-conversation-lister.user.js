// ==UserScript==
// @name         ChatGPT Conversation Lister (Unified)
// @namespace    userscript.moukaeritai.work
// @version      1.0.7
// @description  Retrieves, searches, and exports conversations in ChatGPT's web interface.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://chatgpt.com/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-conversation-lister/chatgpt-conversation-lister.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/chat.openai.com/chatgpt-conversation-lister/chatgpt-conversation-lister.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_info
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- Constants and Configuration ---

    const SCRIPT_NAME = "ChatGPT Conversation Lister (Unified)";
    const SCRIPT_VERSION = GM_info.script.version;
    const CONVERSATION_LIST_SELECTORS = [
        // Add new selectors at the top. The script will use the first one that matches.
        "#history", // 2025-02-01
        "nav div.overflow-y-auto", // Selector as of late 2023
        "#__next > div.overflow-hidden.w-full.h-full > div > div > div > div > nav > div.overflow-y-auto", // 2023-08-29
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col.overflow-y-auto", // 2023-08-28
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col > div > div", // 2023-08-27
        "#__next > div.overflow-hidden.w-full.h-full.relative.flex > div.dark.flex-shrink-0.overflow-x-hidden > div > div > div > nav > div.overflow-y-auto" // 2023-08-10
    ];

    const ERROR_MESSAGE_LIST_NOT_FOUND = "Unable to retrieve the conversation list. This may be due to changes in the DOM structure of ChatGPT. Please await updates to the script.";
    const SEARCH_ICON_SVG = "https://moukaeritai-static.glitch.me/svg/search-in-title-icon.svg";
    const NEW_CHAT_BUTTON_SELECTOR = "a[data-testid='create-new-chat-button'], nav a.flex";
    const PANEL_HOST_ID = "ccl-panel-host";
    const PANEL_POSITION_KEY = "ccl-panel-position";

    // --- UI Setup ---

    const hostDiv = document.createElement('div');
    hostDiv.id = PANEL_HOST_ID;
    hostDiv.style.position = "fixed";
    hostDiv.style.top = "0";
    hostDiv.style.left = "0";
    hostDiv.style.width = "0";
    hostDiv.style.height = "0";
    const shadowRoot = hostDiv.attachShadow({ mode: 'open' });
    const mountPanelHost = () => {
        if (hostDiv.isConnected) {
            return;
        }
        const mountTarget = document.body || document.documentElement;
        if (!mountTarget) {
            return;
        }
        mountTarget.appendChild(hostDiv);
    };
    const panelMountObserver = new MutationObserver(() => {
        if (!hostDiv.isConnected) {
            mountPanelHost();
        }
    });
    panelMountObserver.observe(document.documentElement, { childList: true, subtree: true });
    mountPanelHost();
    const styleTag = document.createElement("style");
    styleTag.textContent = `
        #ccl-panel {
            position: fixed;
            top: 120px;
            right: 20px;
            width: 260px;
            background: #ffffff;
            color: #1f2933;
            border: 1px solid #d6dbe0;
            border-radius: 12px;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            z-index: 10002;
        }
        #ccl-panel-header {
            padding: 8px 10px;
            background: #f3f5f7;
            border-bottom: 1px solid #e1e5ea;
            border-radius: 12px 12px 0 0;
            font-size: 12px;
            font-weight: 600;
            cursor: move;
            user-select: none;
        }
        #ccl-panel-body {
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .ccl-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #3f4a56;
        }
        #ccl-count-value {
            font-weight: 600;
            color: #1f2933;
        }
        .ccl-button-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
        }
        .ccl-button {
            padding: 6px 8px;
            border: 1px solid #c9d1da;
            border-radius: 8px;
            background: #f7f9fb;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s ease;
        }
        .ccl-button:hover {
            background: #e7edf4;
        }
        .ccl-button-wide {
            grid-column: 1 / -1;
        }
    `;
    shadowRoot.appendChild(styleTag);

    const panelDiv = document.createElement("div");
    panelDiv.id = "ccl-panel";

    const panelHeader = document.createElement("div");
    panelHeader.id = "ccl-panel-header";
    panelHeader.textContent = `${SCRIPT_NAME} v${SCRIPT_VERSION}`;
    panelDiv.appendChild(panelHeader);

    const panelBody = document.createElement("div");
    panelBody.id = "ccl-panel-body";
    panelDiv.appendChild(panelBody);

    const countRow = document.createElement("div");
    countRow.className = "ccl-row";
    const countLabel = document.createElement("span");
    countLabel.textContent = "Detected conversations";
    const countValue = document.createElement("span");
    countValue.id = "ccl-count-value";
    countValue.textContent = "0";
    countRow.appendChild(countLabel);
    countRow.appendChild(countValue);
    panelBody.appendChild(countRow);

    const buttonRow = document.createElement("div");
    buttonRow.className = "ccl-button-row";
    const searchButton = document.createElement("button");
    searchButton.type = "button";
    searchButton.className = "ccl-button";
    searchButton.textContent = "Search";
    const tsvButton = document.createElement("button");
    tsvButton.type = "button";
    tsvButton.className = "ccl-button";
    tsvButton.textContent = "List TSV";
    const scanButton = document.createElement("button");
    scanButton.type = "button";
    scanButton.className = "ccl-button ccl-button-wide";
    scanButton.textContent = "Scan List";
    buttonRow.appendChild(searchButton);
    buttonRow.appendChild(tsvButton);
    buttonRow.appendChild(scanButton);
    panelBody.appendChild(buttonRow);

    shadowRoot.appendChild(panelDiv);

    const applySavedPanelPosition = () => {
        const savedPosition = GM_getValue(PANEL_POSITION_KEY, null);
        if (!savedPosition) {
            return;
        }
        const left = Number(savedPosition.left);
        const top = Number(savedPosition.top);
        if (Number.isFinite(left) && Number.isFinite(top)) {
            panelDiv.style.left = `${left}px`;
            panelDiv.style.top = `${top}px`;
            panelDiv.style.right = "auto";
            panelDiv.style.bottom = "auto";
        }
    };

    const containerDiv = document.createElement("div");
    containerDiv.id = "ccl-container";
    shadowRoot.appendChild(containerDiv);

    // Close dialog on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            containerDiv.replaceChildren(); // Clear any open dialog
        }
    });

    /**
     * Creates a base dialog element within the Shadow DOM.
     * @returns {HTMLDivElement} The created dialog element.
     */
    function createDialogDiv() {
        containerDiv.replaceChildren(); // Clear previous dialog
        const dialogDiv = document.createElement('div');
        dialogDiv.id = "ccl-dialog";
        dialogDiv.style.cssText = `
            position: fixed; top: 10%; left: 10%; width: 80%; height: 80%;
            background: white; padding: 20px; border: 1px solid #ccc;
            z-index: 10001; border-radius: 15px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
            overflow: auto; display: flex; flex-direction: column; gap: 10px;
            box-sizing: border-box;
        `;
        containerDiv.appendChild(dialogDiv);
        return dialogDiv;
    }

    /**
     * Creates a styled textarea for displaying content.
     * @returns {HTMLTextAreaElement} The created textarea element.
     */
    function createTextarea() {
        const dialog = createDialogDiv(); // Use the dialog as a container
        const textarea = document.createElement('textarea');
        textarea.readOnly = true;
        textarea.style.cssText = `
            width: 100%; height: 100%; flex-grow: 1;
            background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;
            padding: 10px; font-family: monospace; font-size: 14px;
            box-sizing: border-box; resize: none;
        `;
        textarea.addEventListener("dblclick", (event) => {
            event.target.select();
            navigator.clipboard.writeText(event.target.value).catch(() => {
                // Fallback for older environments
                document.execCommand('copy');
            });
        });
        dialog.appendChild(textarea);
        return textarea;
    }

    // --- Core Logic ---

    /**
     * Finds the conversation list container element using a list of selectors.
     * @returns {HTMLElement|null} The found element or null.
     */
    function getConversationListElement() {
        for (const selector of CONVERSATION_LIST_SELECTORS) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    function refreshConversationCount() {
        const count = GM_listValues().length;
        countValue.textContent = count.toString();
    }

    function getConversationIdFromHref(href) {
        const match = href.match(/^\/c\/([^/?#]+)/);
        return match ? match[1] : null;
    }

    function updateConversationListFromLinks(listElement) {
        const conversationLinks = listElement.querySelectorAll("a[href^='/c/']");
        if (!conversationLinks.length) {
            return false;
        }

        conversationLinks.forEach((link, index) => {
            const href = link.getAttribute("href");
            const id = href ? getConversationIdFromHref(href) : null;
            const titleElement = link.querySelector(".truncate");
            const titleText = titleElement ? (titleElement.getAttribute("title") || titleElement.textContent) : "";
            const title = titleText.trim();
            const projectionId = link.dataset.projectionId || String(conversationLinks.length - index);

            if (id && title) {
                GM_setValue(id, { id, title, projectionId });
            }
        });

        return true;
    }

    /**
     * Scans the currently visible conversation list and saves items to GM storage.
     */
    function updateConversationList() {
        const listElement = getConversationListElement();
        if (!listElement) {
            console.warn(ERROR_MESSAGE_LIST_NOT_FOUND);
            refreshConversationCount();
            return;
        }

        if (!updateConversationListFromLinks(listElement)) {
            const liNodes = listElement.querySelectorAll("li");
            liNodes.forEach((li) => {
                for (const key in li) {
                    if (key.startsWith('__reactProps')) {
                        try {
                            const props = li[key].children.props;
                            const id = props.id;
                            const title = props.title;
                            const projectionId = li.dataset.projectionId;

                            if (id && title) {
                                GM_setValue(id, { id, title, projectionId });
                            }
                        } catch {
                            // Ignore errors if props structure changes
                        }
                        break; // Found the props, no need to check other keys
                    }
                }
            });
        }
        refreshConversationCount();
    }

    // --- UI Actions ---

    /**
     * Displays a search dialog to filter conversations by title.
     */
    function handleSearch() {
        updateConversationList();
        const dialogDiv = createDialogDiv();
        const searchStyle = document.createElement("style");
        searchStyle.textContent = `
            #ccl-search-results a {
                display: block; padding: 8px 12px; text-decoration: none; color: #333;
                border-radius: 6px; margin-bottom: 5px; background-color: #f0f0f0;
                transition: background-color 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            #ccl-search-results a:hover { background-color: #e0e0e0; }
            #ccl-search-input {
                width: 100%; padding: 10px; font-size: 16px; border: 1px solid #ccc;
                border-radius: 8px; box-sizing: border-box; margin-bottom: 10px;
            }
        `;
        dialogDiv.appendChild(searchStyle);

        const input = document.createElement("input");
        input.id = "ccl-search-input";
        input.placeholder = "Search titles...";
        dialogDiv.appendChild(input);

        const resultsDiv = document.createElement("div");
        resultsDiv.id = "ccl-search-results";
        resultsDiv.style.overflowY = "auto";
        dialogDiv.appendChild(resultsDiv);

        const conversations = GM_listValues().map(id => GM_getValue(id));
        conversations.sort((a, b) => (b.projectionId || 0) - (a.projectionId || 0)); // Newest first

        const renderResults = (filter = "") => {
            resultsDiv.replaceChildren();
            const filterLower = filter.toLowerCase();
            conversations
                .filter(conv => conv.title.toLowerCase().includes(filterLower))
                .forEach(conv => {
                    const a = document.createElement("a");
                    a.href = `/c/${conv.id}`;
                    a.innerText = conv.title;
                    a.title = conv.title;
                    resultsDiv.appendChild(a);
                });
        };

        input.addEventListener("keyup", () => renderResults(input.value));
        renderResults(); // Initial render
        input.focus();
    }

    /**
     * Lists all stored conversations in TSV format.
     */
    function handleListTSV() {
        updateConversationList();
        const textarea = createTextarea();
        const conversations = GM_listValues().map(id => GM_getValue(id));

        // Sort by projectionId (internal order), which might be a string number
        conversations.sort((a, b) => {
            const pa = a.projectionId ? parseInt(a.projectionId, 10) : 0;
            const pb = b.projectionId ? parseInt(b.projectionId, 10) : 0;
            return pb - pa; // Newest first
        });

        const tsvHeader = "ID\tTitle\tProjectionID";
        const tsvRows = conversations.map(c => [c.id, c.title, c.projectionId].join("\t"));
        textarea.value = [tsvHeader, ...tsvRows].join("\n");
        textarea.select();
    }

    // --- UI Integration ---

    /**
     * Injects the search button into the ChatGPT UI.
     */
    function injectSearchButton() {
        const newChatButton = document.querySelector(NEW_CHAT_BUTTON_SELECTOR);
        if (newChatButton && !document.getElementById('ccl-search-button')) {
            const searchButton = document.createElement("img");
            searchButton.id = "ccl-search-button";
            searchButton.src = SEARCH_ICON_SVG;
            searchButton.title = "Search Conversations (Userscript)";
            searchButton.style.cssText = `
                cursor: pointer; background: lightyellow; padding: 4px;
                border-radius: 5px; margin-left: 8px; width: 24px; height: 24px;
            `;
            searchButton.addEventListener("click", handleSearch);
            newChatButton.insertAdjacentElement("afterend", searchButton);
        }
    }

    // --- Initialization ---

    searchButton.addEventListener("click", handleSearch);
    tsvButton.addEventListener("click", handleListTSV);
    scanButton.addEventListener("click", () => updateConversationList());

    refreshConversationCount();

    const clampToViewport = (value, max) => Math.min(Math.max(0, value), Math.max(0, max));
    const enablePanelDrag = (panel, handle, onPositionChange) => {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const onPointerMove = (event) => {
            if (!isDragging) return;
            const maxLeft = window.innerWidth - panel.offsetWidth;
            const maxTop = window.innerHeight - panel.offsetHeight;
            const nextLeft = clampToViewport(event.clientX - offsetX, maxLeft);
            const nextTop = clampToViewport(event.clientY - offsetY, maxTop);
            panel.style.left = `${nextLeft}px`;
            panel.style.top = `${nextTop}px`;
            panel.style.right = "auto";
            panel.style.bottom = "auto";
        };

        const stopDragging = (event) => {
            if (!isDragging) return;
            isDragging = false;
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", stopDragging);
            if (typeof onPositionChange === "function") {
                const rect = panel.getBoundingClientRect();
                onPositionChange({
                    left: Math.round(rect.left),
                    top: Math.round(rect.top)
                });
            }
            if (event && handle.hasPointerCapture(event.pointerId)) {
                handle.releasePointerCapture(event.pointerId);
            }
        };

        handle.addEventListener("pointerdown", (event) => {
            if (event.button !== 0) return;
            const rect = panel.getBoundingClientRect();
            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;
            isDragging = true;
            handle.setPointerCapture(event.pointerId);
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", stopDragging);
        });
    };

    enablePanelDrag(panelDiv, panelHeader, (position) => {
        GM_setValue(PANEL_POSITION_KEY, position);
    });

    // Inject UI elements after a delay to ensure the page is loaded.
    // Use a MutationObserver for a more robust solution.
    const bodyObserver = new MutationObserver((mutations, observer) => {
        if (document.querySelector(NEW_CHAT_BUTTON_SELECTOR)) {
            injectSearchButton();
            updateConversationList();
            observer.disconnect(); // Stop observing once the button is injected
        }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });

    applySavedPanelPosition();

})();
