// ==UserScript==
// @name         Gemini Saved Info Helper
// @namespace    userscript.moukaeritai.work
// @version      0.2.33
// @lastModified 2026-04-16
// @description  Adds serial numbers and copy buttons to custom instructions on Gemini.
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_info
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @resource     geminiSavedInfoCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.css
// @resource     geminiSavedInfoHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @license      MIT
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-saved-info/gemini-saved-info.user.js
// @noframes
// @history      0.2.33 共通テンプレート更新に伴う同期修正: ヘッダー表示を [絵文字][スクリプト名]v[バージョン] 形式に変更し、シングルクリック開閉に対応。
// @history      0.2.32 UI共通化: パネルの外枠を gemini-common.html に統合し、ダブルクリックで開閉するように変更。ポータルアイコン(🏷️ + ロード順絵文字)を採用。
// @history       0.2.31 リソース化リファクタリング: UIテンプレート(HTML)を外部ファイルに分離
// @history       0.2.29 リソースファイル (style.css) をスクリプト名と同じステムに改名
// @history       0.2.27 共通ライブラリの更新: ユーザースクリプトのUIが重ならないように自動配置を調整
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

    const { emoji: gusEmoji } = registerGeminiUserscript(GM_info.script.name, GM_info.script.version);

    const initUserScript = () => {
        const policy = window.geminiCreateTrustedHTMLPolicy('geminiSavedInfo');

        const TARGET_PAGE_URL = 'https://gemini.google.com/saved-info';
        const NUMBER_SPAN_CLASS = 'userscript-gemini-saved-info-number';
        const COPY_BUTTON_CLASS = 'userscript-gemini-saved-info-copy-button';
        const COPY_ALL_BUTTON_ID = 'userscript-gemini-saved-info-copy-all-button';
        let instructionsObserver = null;
        let lastIsActive = null;
        let debounceTimer = null;

        function getTemplateFragment(templateId) {
            const html = GM_getResourceText('geminiSavedInfoHTML');
            if (!html) return null;
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const template = doc.getElementById(templateId);
            return template ? template.content.cloneNode(true) : null;
        }

        function addStyles() {
            // Inject shared common styles
            const commonCSS = GM_getResourceText('geminiCommon');
            if (commonCSS && !document.getElementById('gemini-common-styles')) {
                const style = GM_addStyle(commonCSS);
                if (style) style.id = 'gemini-common-styles';
            }

            // Inject custom styles
            const customCSS = GM_getResourceText('geminiSavedInfoCSS');
            if (customCSS && !document.getElementById('gemini-saved-info-styles')) {
                const style = GM_addStyle(customCSS);
                if (style) style.id = 'gemini-saved-info-styles';
            }
        }

        function showToast(message) {
            const fragment = getTemplateFragment('gsi-template-toast');
            if (!fragment) return;

            const toast = fragment.querySelector('.userscript-gemini-saved-info-toast');
            toast.textContent = message;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('visible');
            }, 10);

            setTimeout(() => {
                toast.classList.remove('visible');
                toast.addEventListener('transitionend', () => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                });
            }, 2500);
        }

        function addCopyAllButton() {
            if (document.getElementById(COPY_ALL_BUTTON_ID)) return;

            const actionsContainer = document.querySelector('h2[data-test-id="saved-info-title"]')?.closest('.header')?.querySelector('.action-buttons-container');
            if (!actionsContainer) return;

            const fragment = getTemplateFragment('gsi-template-copy-all');
            if (!fragment) return;

            const copyAllButton = fragment.getElementById(COPY_ALL_BUTTON_ID);
            const label = copyAllButton.querySelector('.mdc-button__label');

            copyAllButton.addEventListener('click', () => {
                const allInstructions = document.querySelectorAll('.memory .memory-text');
                const formattedText = Array.from(allInstructions).map((el, i) => {
                    const numberSpan = el.querySelector(`.${NUMBER_SPAN_CLASS}`);
                    const cleanText = numberSpan ? el.textContent.substring(numberSpan.textContent.length) : el.textContent;
                    return `${i + 1}. ${cleanText}`;
                }).join('\n\n---\n\n');

                navigator.clipboard.writeText(formattedText).then(() => {
                    console.log('[gemini-saved-info] All instructions copied to clipboard.');
                    showToast('All instructions copied!');
                    label.textContent = 'Copied!';
                    setTimeout(() => { label.textContent = 'Copy all'; }, 2000);
                }).catch(err => {
                    console.error('[gemini-saved-info] Failed to copy all text: ', err);
                    showToast('Failed to copy all instructions.');
                    label.textContent = 'Error!';
                    setTimeout(() => { label.textContent = 'Copy all'; }, 2000);
                });
            });

            actionsContainer.appendChild(copyAllButton);
        }

        function updateInstructionItems(memoriesSection) {
            if (!memoriesSection) return;

            memoriesSection.querySelectorAll(`.${NUMBER_SPAN_CLASS}`).forEach(n => n.remove());
            memoriesSection.querySelectorAll(`.${COPY_BUTTON_CLASS}`).forEach(b => b.remove());

            const instructions = memoriesSection.querySelectorAll('.memory');
            if (instructions.length === 0) return;

            console.log(`[gemini-saved-info] Found ${instructions.length} instructions. Updating items.`);

            instructions.forEach((instruction, index) => {
                const textElement = instruction.querySelector('.memory-text');
                const actionsButton = instruction.querySelector('.memory-actions-button');

                if (textElement) {
                    const numberSpan = document.createElement('span');
                    numberSpan.className = NUMBER_SPAN_CLASS;
                    numberSpan.textContent = `${index + 1}. `;
                    textElement.prepend(numberSpan);
                }

                if (actionsButton) {
                    const fragment = getTemplateFragment('gsi-template-copy-item');
                    if (!fragment) return;

                    const copyButton = fragment.querySelector(`.${COPY_BUTTON_CLASS}`);
                    const icon = copyButton.querySelector('mat-icon');

                    copyButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const textToCopy = textElement.textContent.replace(`${index + 1}. `, '');
                        navigator.clipboard.writeText(textToCopy).then(() => {
                            showToast('Instruction copied!');
                            icon.textContent = 'done';
                            setTimeout(() => { icon.textContent = 'content_copy'; }, 1500);
                        });
                    });

                    actionsButton.parentNode.insertBefore(copyButton, actionsButton);
                }
            });
        }

        function startInstructionsObserver(memoriesSection) {
            addCopyAllButton();

            const instructionsContainer = memoriesSection.querySelector('.memories-container');
            if (!instructionsContainer) return;

            if (instructionsObserver) instructionsObserver.disconnect();

            instructionsObserver = new MutationObserver(() => {
                updateInstructionItems(memoriesSection);
            });

            instructionsObserver.observe(instructionsContainer, { childList: true });

            updateInstructionItems(memoriesSection);
            console.log('[gemini-saved-info] Instructions observer started.');
        }

        function stopInstructionsObserver() {
            if (instructionsObserver) {
                instructionsObserver.disconnect();
                instructionsObserver = null;
                console.log('[gemini-saved-info] Instructions observer stopped.');

                const memoriesSection = document.querySelector('div[data-test-id="memories-section"]');
                if (memoriesSection) {
                    memoriesSection.querySelectorAll(`.${NUMBER_SPAN_CLASS}`).forEach(n => n.remove());
                    memoriesSection.querySelectorAll(`.${COPY_BUTTON_CLASS}`).forEach(b => b.remove());
                }

                const copyAllButton = document.getElementById(COPY_ALL_BUTTON_ID);
                if (copyAllButton) copyAllButton.remove();
            }
        }

        function updateVersionBadge(isActive) {
            if (lastIsActive === isActive) return;
            lastIsActive = isActive;

            let badge = document.getElementById('gsi-version-indicator');
            if (!badge) {
                const commonHTMLStr = GM_getResourceText('gusCommonHTML');
                if (!commonHTMLStr) return;

                const scriptVersion = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '';

                // Create empty content div (this script mostly uses the badge as a status indicator)
                const contentDiv = document.createElement('div');
                contentDiv.className = 'gsi-content-status';
                contentDiv.style.padding = '0 8px 8px 8px';
                contentDiv.style.fontSize = '12px';
                contentDiv.style.color = '#5f6368';
                contentDiv.textContent = 'Active on Saved Info page.';

                // Assemble panel shell
                const panelShell = window.geminiCreateCommonPanel({
                    htmlString: commonHTMLStr,
                    policy: policy,
                    name: 'Gemini Saved Info Helper',
                    version: scriptVersion,
                    emoji: `🏷️ ${gusEmoji}`,
                    contentElement: contentDiv
                });

                panelShell.id = 'gsi-version-indicator';
                document.body.appendChild(panelShell);
                badge = panelShell;

                const dragHandle = badge.querySelector('.gus-panel-header');
                const inactiveHandle = badge.querySelector('.gus-inactive-content');
                if (inactiveHandle) {
                    window.geminiSetupDraggablePanel(badge, inactiveHandle, 'gus-pos-gemini-saved-info', { right: '20px', bottom: '60px' });
                }
                if (dragHandle) {
                    window.geminiSetupDraggablePanel(badge, dragHandle, 'gus-pos-gemini-saved-info', { right: '20px', bottom: '60px' });
                }

                // Set up minimizable panel
                window.geminiSetupMinimizablePanel(badge, 'gsi-minimized', dragHandle, true);
            }

            badge.style.display = isActive ? 'block' : 'none';
        }

        function checkAndApply() {
            const onTargetPage = window.location.href.startsWith(TARGET_PAGE_URL);
            const memoriesSection = document.querySelector('div[data-test-id="memories-section"]');

            if (onTargetPage && memoriesSection) {
                updateVersionBadge(true);
                if (!instructionsObserver) {
                    startInstructionsObserver(memoriesSection);
                }
            } else {
                updateVersionBadge(false);
                stopInstructionsObserver();
            }
        }

        addStyles();

        if (window.navigation) {
            window.navigation.addEventListener('navigatesuccess', () => {
                checkAndApply();
            });
        }

        const pageObserver = new MutationObserver(() => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                debounceTimer = null;
                checkAndApply();
            }, 200);
        });

        pageObserver.observe(document.body, { childList: true });

        checkAndApply();
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();