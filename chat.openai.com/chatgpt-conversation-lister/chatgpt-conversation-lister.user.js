// ==UserScript==
// @name         ChatGPT Conversation Lister (Unified)
// @namespace    https://moukaeritai.work/chatgpt-conversation-lister
// @version      1.0.1
// @description  Retrieves, searches, and exports conversations in ChatGPT's web interface.
// @author       Takashi SASAKI (https://twitter.com/TakashiSasaki)
// @match        https://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- Constants and Configuration ---

    const CONVERSATION_LIST_SELECTORS = [
        // Add new selectors at the top. The script will use the first one that matches.
        "nav div.overflow-y-auto", // Selector as of late 2023
        "#__next > div.overflow-hidden.w-full.h-full > div > div > div > div > nav > div.overflow-y-auto", // 2023-08-29
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col.overflow-y-auto", // 2023-08-28
        "#__next > div > div > div.overflow-hidden.w-full.h-full.relative.flex.z-0 > div > div > div > div > nav > div.flex-col > div > div", // 2023-08-27
        "#__next > div.overflow-hidden.w-full.h-full.relative.flex > div.dark.flex-shrink-0.overflow-x-hidden > div > div > div > nav > div.overflow-y-auto" // 2023-08-10
    ];

    const ERROR_MESSAGE_LIST_NOT_FOUND = "Unable to retrieve the conversation list. This may be due to changes in the DOM structure of ChatGPT. Please await updates to the script.";
    const SEARCH_ICON_SVG = "https://moukaeritai-static.glitch.me/svg/search-in-title-icon.svg";
    const NEW_CHAT_BUTTON_SELECTOR = "nav a.flex";

    // --- UI Setup ---

    const hostDiv = document.createElement('div');
    document.body.appendChild(hostDiv);
    const shadowRoot = hostDiv.attachShadow({ mode: 'open' });
    const containerDiv = document.createElement("div");
    containerDiv.id = "ccl-container";
    shadowRoot.appendChild(containerDiv);

    // Close dialog on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            containerDiv.innerHTML = ''; // Clear any open dialog
        }
    });

    /**
     * Creates a base dialog element within the Shadow DOM.
     * @returns {HTMLDivElement} The created dialog element.
     */
    function createDialogDiv() {
        containerDiv.innerHTML = ''; // Clear previous dialog
        const dialogDiv = document.createElement('div');
        dialogDiv.id = "ccl-dialog";
        dialogDiv.style.cssText = `
            position: fixed; top: 10%; left: 10%; width: 80%; height: 80%;
            background: white; padding: 20px; border: 1px solid #ccc;
            z-index: 10001; border-radius: 15px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
            overflow: auto; display: flex; flex-direction: column; gap: 10px;
            box-sizing: border-box;
        `;
        shadowRoot.appendChild(dialogDiv);
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

    /**
     * Scans the currently visible conversation list and saves items to GM storage.
     */
    function updateConversationList() {
        const listElement = getConversationListElement();
        if (!listElement) {
            console.warn(ERROR_MESSAGE_LIST_NOT_FOUND);
            return;
        }

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
                    } catch (e) {
                        // Ignore errors if props structure changes
                    }
                    break; // Found the props, no need to check other keys
                }
            }
        });
    }

    // --- Tampermonkey Menu Commands ---

    /**
     * Displays a search dialog to filter conversations by title.
     */
    function handleSearch() {
        updateConversationList();
        const dialogDiv = createDialogDiv();
        dialogDiv.innerHTML = `<style>
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
        </style>`;

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
            resultsDiv.innerHTML = '';
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

    GM_registerMenuCommand("Search Conversations", handleSearch);
    GM_registerMenuCommand("List Conversations (TSV)", handleListTSV);

    // Inject UI elements after a delay to ensure the page is loaded.
    // Use a MutationObserver for a more robust solution.
    const bodyObserver = new MutationObserver((mutations, observer) => {
        if (document.querySelector(NEW_CHAT_BUTTON_SELECTOR)) {
            injectSearchButton();
            observer.disconnect(); // Stop observing once the button is injected
        }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });

})();