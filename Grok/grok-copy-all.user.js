// ==UserScript==
// @name         Grok 会話コピー機能
// @version      1.0.0
// @description  Grokのウェブサイトで、会話の全内容を簡単にコピーできる機能を追加します。
// @author       Takashi Sasaki
// @match        https://grok.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Function to get all conversation text.
    // This is a placeholder and may need to be adjusted based on Grok's actual DOM structure.
    function getAllConversationText() {
        // Attempt to find a common container for messages.
        // This is a guess and might need refinement. Common selectors could be '.message-list', '.conversation-container', etc.
        // For now, let's try to select all visible text content from the body, excluding UI elements like buttons or navbars,
        // as a fallback if specific containers are hard to identify without inspection.
        // A more robust approach would involve identifying specific message elements and concatenating their text.

        // Let's try to find elements that look like conversation messages.
        // This is highly speculative without inspecting the actual site.
        // A more robust method would be to identify specific message containers.
        // For this example, let's try to select all text within elements that are likely part of the conversation.
        // If this doesn't work, a more targeted approach using specific CSS selectors would be needed after inspection.

        // A common pattern is to have message blocks. We'll try to gather text from such blocks.
        // If the page structure is complex, this might need to be more granular.
        // For now, a broad approach to get all text might be to select it from a main content area.
        // Let's assume there's a main content area. If not, we might need to aggregate text from all paragraphs or divs that are not UI controls.

        // As a starting point, let's look for elements that might contain chat messages.
        // This is a GUESS. Without inspecting the DOM, it's hard to be precise.
        // Example: if messages are in divs with class 'message', we'd do something like:
        // const messages = document.querySelectorAll('.message');
        // let conversationText = '';
        // messages.forEach(msg => {
        //     conversationText += msg.textContent + '\n\n';
        // });
        // return conversationText;

        // Fallback: try to get all text from the main content area, excluding known UI elements.
        // This is a very rough approximation.
        const mainContentElement = document.querySelector('main') || document.body; // Try to find a main element, or fallback to body.

        if (!mainContentElement) {
            return "Could not find main content to copy.";
        }

        // This is a very general way to get text. It might include UI elements.
        // A more precise selector for actual chat messages would be ideal.
        // For a simple implementation, we will try to extract text from a reasonable container.
        // If a specific container for messages isn't obvious, we might grab text from 'article' or 'section' tags if they exist.
        // Let's try a more targeted approach by looking for elements that resemble chat bubbles or message containers.
        // This is a common pattern, but actual selectors will vary.
        // If the Grok site uses a specific class for its message containers, that should be used.
        // For now, we'll use a broad selector and rely on the user to refine it if necessary.

        // Let's try to find elements that look like chat responses.
        // This is highly speculative.
        let conversationText = '';
        const responseDivs = document.querySelectorAll('.response'); // Example selector, may need adjustment
        if (responseDivs.length > 0) {
            responseDivs.forEach(div => {
                conversationText += div.textContent + '\n\n';
            });
        } else {
            // Fallback if '.response' is not found, try to get text from main content.
            // Exclude elements that are clearly UI controls (buttons, navbars, footers, etc.)
            // This is still a heuristic.
            const elementsToExcludeSelectors = [
                'nav', 'header', 'footer', 'aside', 'button', 'input', 'textarea', 'select',
                'style', 'script', 'link', 'meta', '[aria-hidden="true"]', '.sidebar', '.menu',
                '.action-buttons', '.print\:hidden' // Based on previous file content.
            ].join(', ');

            const allElements = mainContentElement.querySelectorAll('*');
            allElements.forEach(el => {
                // Check if the element is visible and not an excluded UI element
                if (el.offsetParent !== null && !el.matches(elementsToExcludeSelectors)) {
                    const text = el.textContent.trim();
                    if (text) {
                        // Append text if it looks like part of a conversation
                        // This is a very basic check and can be improved.
                        // For now, we'll append non-empty trimmed text.
                        conversationText += text + '\n';
                    }
                }
            });
        }

        return conversationText.trim();
    }

    // Function to add the copy button
    function addCopyButton() {
        // Check if the button already exists to avoid duplicates
        if (document.getElementById('grok-copy-conversation-button')) {
            return;
        }

        // Create the button element
        const copyButton = document.createElement('button');
        copyButton.id = 'grok-copy-conversation-button';
        copyButton.textContent = '会話をコピー'; // "Copy Conversation"
        copyButton.style.position = 'fixed';
        copyButton.style.top = '10px';
        copyButton.style.right = '10px';
        copyButton.style.zIndex = '10000';
        copyButton.style.padding = '8px 12px';
        copyButton.style.backgroundColor = '#4CAF50'; // Green
        copyButton.style.color = 'white';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '5px';
        copyButton.style.cursor = 'pointer';
        copyButton.style.fontSize = '14px';
        copyButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

        // Add event listener for the button
        copyButton.addEventListener('click', () => {
            const textToCopy = getAllConversationText();
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Optional: provide feedback to user
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'コピー完了！'; // "Copy Complete!"
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'コピー失敗'; // "Copy Failed"
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                    }, 2000);
                });
            } else {
                console.warn('No conversation text found to copy.');
                const originalText = copyButton.textContent;
                copyButton.textContent = 'コピー対象なし'; // "Nothing to copy"
                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, 2000);
            }
        });

        // Append the button to the document body
        document.body.appendChild(copyButton);
    }

    // Add the button when the page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addCopyButton);
    } else {
        addCopyButton();
    }

})();