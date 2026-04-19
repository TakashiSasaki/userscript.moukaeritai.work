// ==UserScript==
// @name         Gemini Auto-Select Next
// @namespace    userscript.moukaeritai.work
// @version      0.2.71
// @lastModified 2026-04-18
// @description  Automatically select the next conversation on delete while caching ordered sidebar history
// @author       Takashi Sasaki
// @homepageURL  https://x.com/TakashiSasaki
// @match        https://gemini.google.com/*
// @match        https://userscript.moukaeritai.work/*
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.user.js
// @resource     geminiCommon https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.css
// @resource     geminiAutoSelectNextCSS https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.css
// @resource     geminiAutoSelectNextHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.html
// @resource     gusCommonHTML https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.html
// @require      https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-common.js
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @noframes
// @history       0.2.71 Add JSON download button to the conversation history dialog.
// @history       0.2.70 Simplify attachObserver callback: drop per-mutation loop to reduce scroll-time CPU usage.
// @history       0.2.69 Ordered conversation cache, read-only history dialog, and current-conversation API.
// @history       0.2.67 共通ライブラリの更新に伴い、クリック処理を geminiClickElement に統一。
// @history       0.2.65 UI表示タイトルから冗長な "Gemini " プレフィックスを除去。
// @history       0.2.64 UI デザイン方針の統一に伴い、個別スタイルでのフォントサイズ・オーバーライドを解除。共通基盤の 13px を継承するように改善。
// @history       0.2.63 共通テンプレートの更新（アイコンとバージョンの分離）を反映。
// @history       0.2.60 CSSに `visibility: hidden` が残存し幽霊枠となっていた致命的バグを修正
// @history       0.2.59 URLの正規表現を修正し、/app (末尾スラッシュなし) でUIが非表示になる不具合を修正
// @history       0.2.58 ヘッダー右側のバージョン表示を廃止
// @history       0.2.57 テンプレート読み込みエラーの診断ログを強化
// @history       0.2.56 共通ライブラリの更新に伴うUI標準化とツールチップの完全削除
// @history       0.2.54 リソース化リファクタリング: UIテンプレート(HTML)を外部ファイルに分離
// @history       0.2.52 リソースファイル (style.css) をスクリプト名と同じステムに改名
// @history       0.2.50 共通ライブラリの更新: ユーザースクリプトのUIが重ならないように自動配置を調整
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
        const policy = window.geminiCreateTrustedHTMLPolicy('geminiAutoSwitch');

        const SELECTORS = {
            CONVERSATION_ITEM: 'a[data-test-id="conversation"], a.conversation',
            SIDEBAR_SCROLL_CONTAINER: 'nav infinite-scroller, bard-sidenav infinite-scroller, side-navigation-content infinite-scroller, infinite-scroller'
        };

        const CONSTANTS = {
            STORAGE_KEY_AUTOSWITCH: 'gemini_auto_switch_next',
            STORAGE_KEY_MINIMIZED: 'gemini_auto_switch_minimized',
            PANEL_POSITION_KEY: 'gemini_auto_switch_panel_position',
            CONVERSATION_STATE_KEY: 'gemini_auto_switch_conversation_state_v1'
        };

        let lastSelectedIndex = -1;
        let isInitialized = false;
        let attachObserver = null;
        let sidebarObserver = null;
        let sidebarObserverTarget = null;
        let attachRefreshTimer = null;
        let sidebarScanTimer = null;
        let routeFallbackInterval = null;
        let currentVisibleSnapshot = [];
        let historyDialog = null;
        let conversationState = loadConversationState();
        let lastObservedActiveConversationId = getEffectiveCurrentConversationId();
        let keydownListener = null;
        let requestNextListener = null;
        let requestCurrentConversationListener = null;
        let lastUrl = window.location.href;

        function normalizeWhitespace(value) {
            return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function normalizeConversationId(value) {
            const normalized = normalizeWhitespace(value).toLowerCase();
            return /^[a-f0-9]{16}$/.test(normalized) ? normalized : null;
        }

        function createEmptyConversationState() {
            return {
                order: [],
                itemsById: {},
                lastSnapshotIds: [],
                lastScrollTop: null
            };
        }

        function normalizeConversationRecord(id, value, now = Date.now()) {
            const title = normalizeWhitespace(value && value.title);
            const href = normalizeWhitespace(value && value.href);
            const firstSeenAt = Number.isFinite(value && value.firstSeenAt) ? value.firstSeenAt : now;
            const lastSeenAt = Number.isFinite(value && value.lastSeenAt) ? value.lastSeenAt : firstSeenAt;

            return {
                id,
                title: title || `Conversation ${id}`,
                href: href || `/app/${id}`,
                firstSeenAt,
                lastSeenAt
            };
        }

        function normalizeConversationState(value) {
            const normalized = createEmptyConversationState();
            if (!value || typeof value !== 'object') {
                return normalized;
            }

            const now = Date.now();
            const itemsById = {};
            if (value.itemsById && typeof value.itemsById === 'object') {
                for (const [rawId, rawRecord] of Object.entries(value.itemsById)) {
                    const id = normalizeConversationId(rawId);
                    if (!id) continue;
                    itemsById[id] = normalizeConversationRecord(id, rawRecord, now);
                }
            }

            const seen = new Set();
            const order = [];
            const rawOrder = Array.isArray(value.order) ? value.order : [];
            for (const rawId of rawOrder) {
                const id = normalizeConversationId(rawId);
                if (!id || seen.has(id)) continue;
                if (!itemsById[id]) {
                    itemsById[id] = normalizeConversationRecord(id, {}, now);
                }
                seen.add(id);
                order.push(id);
            }

            for (const id of Object.keys(itemsById)) {
                if (seen.has(id)) continue;
                seen.add(id);
                order.push(id);
            }

            normalized.order = order;
            normalized.itemsById = itemsById;
            normalized.lastSnapshotIds = Array.isArray(value.lastSnapshotIds)
                ? value.lastSnapshotIds.map(normalizeConversationId).filter(Boolean)
                : [];
            normalized.lastScrollTop = Number.isFinite(value.lastScrollTop) ? value.lastScrollTop : null;
            return normalized;
        }

        function loadConversationState() {
            return normalizeConversationState(GM_getValue(CONSTANTS.CONVERSATION_STATE_KEY, null));
        }

        function saveConversationState(nextState) {
            conversationState = normalizeConversationState(nextState);
            GM_setValue(CONSTANTS.CONVERSATION_STATE_KEY, conversationState);
        }

        function isAutoSwitchEnabled() {
            return GM_getValue(CONSTANTS.STORAGE_KEY_AUTOSWITCH, true);
        }

        function injectStyles() {
            const commonCSS = GM_getResourceText('geminiCommon');
            if (commonCSS && !document.getElementById('gemini-common-styles')) {
                const commonStyle = document.createElement('style');
                commonStyle.textContent = commonCSS;
                commonStyle.id = 'gemini-common-styles';
                document.head.appendChild(commonStyle);
            }

            if (document.getElementById('gemini-auto-switch-styles')) return;
            const css = GM_getResourceText('geminiAutoSelectNextCSS');
            const style = GM_addStyle(css);
            if (style) {
                style.id = 'gemini-auto-switch-styles';
            }
        }

        function isElementVisible(element) {
            if (!element || !element.isConnected) return false;
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        }

        function isAppPage() {
            return /^\/(app|gem)(?:\/|$)/.test(location.pathname);
        }

        function isSidebarObservationCandidate(element) {
            if (!element || !element.isConnected || !isElementVisible(element)) {
                return false;
            }
            if (element.closest('chat-window-content, chat-window')) {
                return false;
            }
            if (element.querySelector(SELECTORS.CONVERSATION_ITEM)) {
                return true;
            }
            if (!element.closest('bard-sidenav, side-navigation-content, conversations-list, nav')) {
                return false;
            }
            return element.clientWidth > 120 && element.clientWidth < Math.max(420, window.innerWidth * 0.6);
        }

        function findSidebarObservationTarget() {
            const visibleItems = Array.from(document.querySelectorAll(SELECTORS.CONVERSATION_ITEM))
                .filter(item => isElementVisible(item) && !item.closest('chat-window-content, chat-window'));
            if (visibleItems.length > 0) {
                const firstItem = visibleItems[0];
                return firstItem.closest('infinite-scroller') ||
                    firstItem.closest('conversations-list') ||
                    firstItem.closest('nav') ||
                    firstItem.parentElement;
            }

            const candidates = Array.from(document.querySelectorAll(SELECTORS.SIDEBAR_SCROLL_CONTAINER));
            return candidates.find(isSidebarObservationCandidate) || null;
        }

        function getConversationItems(context = null) {
            const scope = context && context.isConnected ? context : sidebarObserverTarget;
            if (scope && scope.isConnected) {
                return Array.from(scope.querySelectorAll(SELECTORS.CONVERSATION_ITEM));
            }
            return Array.from(document.querySelectorAll(SELECTORS.CONVERSATION_ITEM))
                .filter(item => !item.closest('chat-window-content, chat-window'));
        }

        function getTitleFromItem(item, id = null) {
            const candidates = [
                item.getAttribute('title'),
                item.getAttribute('aria-label'),
                item.querySelector('[data-test-id="conversation-title"]')?.textContent,
                item.querySelector('.conversation-title')?.textContent,
                item.querySelector('.mdc-list-item__primary-text')?.textContent,
                item.textContent
            ];

            for (const candidate of candidates) {
                const title = normalizeWhitespace(candidate);
                if (title) return title;
            }
            return id ? `Conversation ${id}` : 'Conversation';
        }

        function normalizeConversationHref(href, id) {
            if (href) {
                try {
                    const url = new URL(href, location.origin);
                    return `${url.pathname}${url.search}${url.hash}`;
                } catch {
                    return href;
                }
            }
            return id ? `/app/${id}` : '';
        }

        function getIdFromItem(item) {
            if (!item) return null;
            const href = item.getAttribute('href');
            if (href) {
                const match = href.match(/\/(?:app|gem)\/(?:[a-f0-9]+\/)?([a-f0-9]{16})(?:[/?#]|$)/i);
                if (match) return match[1].toLowerCase();
            }
            const jslog = item.getAttribute('jslog');
            if (jslog) {
                const match = jslog.match(/c_([0-9a-f]{16})/i) || jslog.match(/["']([a-f0-9]{16})["']/i);
                if (match) return match[1].toLowerCase();
            }
            return null;
        }

        function getConversationIdFromUrl() {
            const match = window.location.pathname.match(/\/(?:app|gem)\/(?:[a-f0-9]+\/)?([a-f0-9]{16})(?:[/?#]|$)/i);
            return match ? match[1].toLowerCase() : null;
        }

        function isCurrentConversationItem(item) {
            return item.classList.contains('selected') || item.getAttribute('aria-current') === 'page';
        }

        function collectVisibleConversationSnapshot(target = sidebarObserverTarget) {
            const seen = new Set();
            const snapshot = [];

            for (const item of getConversationItems(target)) {
                const id = getIdFromItem(item);
                if (!id || seen.has(id)) continue;
                seen.add(id);
                snapshot.push({
                    id,
                    title: getTitleFromItem(item, id),
                    href: normalizeConversationHref(item.getAttribute('href'), id),
                    isCurrent: isCurrentConversationItem(item),
                    element: item
                });
            }

            return snapshot;
        }

        function getSidebarScrollTop(target = sidebarObserverTarget) {
            if (!target || !target.isConnected || typeof target.scrollTop !== 'number') {
                return null;
            }
            return target.scrollTop;
        }

        function getScrollDirection(previousScrollTop, currentScrollTop) {
            if (!Number.isFinite(previousScrollTop) || !Number.isFinite(currentScrollTop)) {
                return 'unknown';
            }
            if (currentScrollTop > previousScrollTop + 4) {
                return 'down';
            }
            if (currentScrollTop < previousScrollTop - 4) {
                return 'up';
            }
            return 'stable';
        }

        function determineInsertionIndexFromPreviousSnapshot(strippedOrder, previousSnapshotIds, visibleIds) {
            if (!strippedOrder.length || !previousSnapshotIds.length || !visibleIds.length) {
                return null;
            }

            const visibleSet = new Set(visibleIds);
            const sharedIds = previousSnapshotIds.filter(id => visibleSet.has(id));
            if (!sharedIds.length) {
                return null;
            }

            for (const sharedId of sharedIds) {
                const snapshotIndex = previousSnapshotIds.indexOf(sharedId);
                for (let i = snapshotIndex - 1; i >= 0; i--) {
                    const neighborId = previousSnapshotIds[i];
                    if (visibleSet.has(neighborId)) continue;
                    const strippedIndex = strippedOrder.indexOf(neighborId);
                    if (strippedIndex !== -1) {
                        return strippedIndex + 1;
                    }
                }
                for (let i = snapshotIndex + 1; i < previousSnapshotIds.length; i++) {
                    const neighborId = previousSnapshotIds[i];
                    if (visibleSet.has(neighborId)) continue;
                    const strippedIndex = strippedOrder.indexOf(neighborId);
                    if (strippedIndex !== -1) {
                        return strippedIndex;
                    }
                }
            }

            return null;
        }

        function determineInsertionIndex(previousOrder, strippedOrder, visibleIds, previousSnapshotIds, scrollDirection) {
            if (!visibleIds.length) {
                return strippedOrder.length;
            }

            const visibleSet = new Set(visibleIds);
            const earliestKnownId = visibleIds.find(id => previousOrder.includes(id));
            if (earliestKnownId) {
                const oldIndex = previousOrder.indexOf(earliestKnownId);
                return previousOrder.slice(0, oldIndex).filter(id => !visibleSet.has(id)).length;
            }

            const overlapIndex = determineInsertionIndexFromPreviousSnapshot(strippedOrder, previousSnapshotIds, visibleIds);
            if (overlapIndex !== null) {
                return overlapIndex;
            }

            if (scrollDirection === 'up') {
                return 0;
            }
            if (scrollDirection === 'down') {
                return strippedOrder.length;
            }
            return strippedOrder.length;
        }

        function detectDeletedIds(previousSnapshotIds, visibleIds) {
            const deletedIds = new Set();
            if (!previousSnapshotIds.length || !visibleIds.length) {
                return deletedIds;
            }

            const previousSnapshotSet = new Set(previousSnapshotIds);
            const visibleSet = new Set(visibleIds);
            const survivorsInPreviousOrder = previousSnapshotIds.filter(id => visibleSet.has(id));
            const survivorsInCurrentOrder = visibleIds.filter(id => previousSnapshotSet.has(id));

            if (survivorsInPreviousOrder.length < 2) {
                return deletedIds;
            }

            if (survivorsInPreviousOrder.join('\u0000') !== survivorsInCurrentOrder.join('\u0000')) {
                return deletedIds;
            }

            const firstSurvivorIndex = previousSnapshotIds.indexOf(survivorsInPreviousOrder[0]);
            const lastSurvivorIndex = previousSnapshotIds.lastIndexOf(survivorsInPreviousOrder[survivorsInPreviousOrder.length - 1]);
            if (firstSurvivorIndex === -1 || lastSurvivorIndex === -1 || firstSurvivorIndex >= lastSurvivorIndex) {
                return deletedIds;
            }

            for (let i = firstSurvivorIndex; i <= lastSurvivorIndex; i++) {
                const id = previousSnapshotIds[i];
                if (!visibleSet.has(id)) {
                    deletedIds.add(id);
                }
            }

            return deletedIds;
        }

        function getEffectiveCurrentConversationId(snapshot = currentVisibleSnapshot) {
            const currentUrlId = getConversationIdFromUrl();
            if (currentUrlId) {
                return currentUrlId;
            }
            const currentRow = snapshot.find(row => row.isCurrent);
            return currentRow ? currentRow.id : null;
        }

        function updateOrderedConversationState(snapshot) {
            const previousOrder = conversationState.order.slice();
            const previousSnapshotIds = conversationState.lastSnapshotIds.slice();
            const previousVisibleSnapshot = currentVisibleSnapshot.slice();
            const previousActiveConversationId = lastObservedActiveConversationId;
            const currentUrlConversationId = getConversationIdFromUrl();
            const currentScrollTop = getSidebarScrollTop(sidebarObserverTarget);
            const scrollDirection = getScrollDirection(conversationState.lastScrollTop, currentScrollTop);
            const visibleIds = snapshot.map(row => row.id);
            const visibleSet = new Set(visibleIds);
            const deletedIds = detectDeletedIds(previousSnapshotIds, visibleIds);
            const previousVisibleCurrentRow = previousVisibleSnapshot.find(row => row.id === previousActiveConversationId && row.isCurrent);

            if (previousVisibleCurrentRow && !currentUrlConversationId && !visibleSet.has(previousActiveConversationId)) {
                deletedIds.add(previousActiveConversationId);
            }

            const now = Date.now();
            const nextItemsById = { ...conversationState.itemsById };
            for (const row of snapshot) {
                const existing = nextItemsById[row.id];
                nextItemsById[row.id] = {
                    id: row.id,
                    title: row.title,
                    href: row.href,
                    firstSeenAt: existing && Number.isFinite(existing.firstSeenAt) ? existing.firstSeenAt : now,
                    lastSeenAt: now
                };
            }

            for (const id of deletedIds) {
                delete nextItemsById[id];
            }

            const workingOrder = previousOrder.filter(id => !deletedIds.has(id));
            const strippedOrder = workingOrder.filter(id => !visibleSet.has(id));
            const insertionIndex = determineInsertionIndex(workingOrder, strippedOrder, visibleIds, previousSnapshotIds, scrollDirection);
            const nextOrderRaw = strippedOrder.slice(0, insertionIndex)
                .concat(visibleIds)
                .concat(strippedOrder.slice(insertionIndex));

            const dedupedOrder = [];
            const seen = new Set();
            for (const id of nextOrderRaw) {
                if (seen.has(id) || !nextItemsById[id]) continue;
                seen.add(id);
                dedupedOrder.push(id);
            }
            for (const id of Object.keys(nextItemsById)) {
                if (seen.has(id)) continue;
                seen.add(id);
                dedupedOrder.push(id);
            }

            saveConversationState({
                order: dedupedOrder,
                itemsById: nextItemsById,
                lastSnapshotIds: visibleIds.slice(),
                lastScrollTop: currentScrollTop
            });

            currentVisibleSnapshot = snapshot;
            lastObservedActiveConversationId = getEffectiveCurrentConversationId(snapshot) || previousActiveConversationId;

            const selectedIndex = snapshot.findIndex(row => row.isCurrent);
            if (selectedIndex !== -1) {
                lastSelectedIndex = selectedIndex;
            }

            if (historyDialog && historyDialog.isConnected) {
                renderHistoryDialog();
            }

            const shouldTriggerAutoSelect = Boolean(
                previousVisibleCurrentRow &&
                previousActiveConversationId &&
                deletedIds.has(previousActiveConversationId) &&
                !currentUrlConversationId
            );

            if (shouldTriggerAutoSelect) {
                setTimeout(() => {
                    selectNextConversation();
                }, 100);
            }
        }

        function scheduleSidebarScan(delay = 250) {
            if (!isInitialized) return;
            if (sidebarScanTimer) {
                clearTimeout(sidebarScanTimer);
            }
            sidebarScanTimer = setTimeout(() => {
                sidebarScanTimer = null;
                runSidebarScan();
            }, delay);
        }

        function runSidebarScan() {
            if (!isInitialized || !sidebarObserverTarget || !sidebarObserverTarget.isConnected) {
                refreshSidebarObservation();
                return;
            }

            const snapshot = collectVisibleConversationSnapshot(sidebarObserverTarget);
            if (!snapshot.length) {
                currentVisibleSnapshot = [];
                lastObservedActiveConversationId = getEffectiveCurrentConversationId([]);
                updatePanelUI();
                if (historyDialog && historyDialog.isConnected) {
                    renderHistoryDialog();
                }
                return;
            }

            updateOrderedConversationState(snapshot);
            updatePanelUI();
        }

        function scheduleSidebarTargetRefresh(delay = 0) {
            if (attachRefreshTimer) {
                clearTimeout(attachRefreshTimer);
            }
            attachRefreshTimer = setTimeout(() => {
                attachRefreshTimer = null;
                refreshSidebarObservation();
            }, delay);
        }

        function refreshSidebarObservation() {
            if (!isInitialized) return;

            const nextTarget = findSidebarObservationTarget();
            if (nextTarget === sidebarObserverTarget) {
                if (sidebarObserverTarget) {
                    updatePanelUI();
                }
                return;
            }

            if (sidebarObserver) {
                sidebarObserver.disconnect();
                sidebarObserver = null;
            }

            sidebarObserverTarget = nextTarget;
            if (!sidebarObserverTarget) {
                currentVisibleSnapshot = [];
                updatePanelUI();
                if (historyDialog && historyDialog.isConnected) {
                    renderHistoryDialog();
                }
                return;
            }

            sidebarObserver = new MutationObserver(() => {
                scheduleSidebarScan(250);
            });
            sidebarObserver.observe(sidebarObserverTarget, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['href', 'title', 'aria-label', 'aria-current', 'class']
            });

            scheduleSidebarScan(0);
        }

        function findNextConversationId() {
            const currentId = getConversationIdFromUrl();
            const allItems = getConversationItems(sidebarObserverTarget);

            if (!currentId) {
                if (allItems.length > 0) {
                    const targetIndex = Math.max(0, Math.min(lastSelectedIndex, allItems.length - 1));
                    return getIdFromItem(allItems[targetIndex]);
                }
                return null;
            }

            const currentIndex = allItems.findIndex(item => getIdFromItem(item) === currentId);
            if (currentIndex !== -1) {
                for (let i = currentIndex + 1; i < allItems.length; i++) {
                    const nextId = getIdFromItem(allItems[i]);
                    if (nextId && nextId !== currentId) {
                        return nextId;
                    }
                }
            }
            return null;
        }

        function selectNextConversation(retryCount = 0, force = false) {
            if (!force && !isAutoSwitchEnabled()) {
                return;
            }

            const nextId = findNextConversationId();
            if (!nextId) {
                return;
            }

            const items = getConversationItems(sidebarObserverTarget);
            const target = items.find(item => getIdFromItem(item) === nextId);
            if (target) {
                window.geminiClickElement(target);
                return;
            }

            if (retryCount < 5) {
                setTimeout(() => selectNextConversation(retryCount + 1, force), 200);
                return;
            }

            window.location.href = `https://gemini.google.com/app/${nextId}`;
        }

        function getHistoryDialogTemplate() {
            return document.getElementById('gasn-history-dialog-template');
        }

        function closeHistoryDialog() {
            if (historyDialog && historyDialog.isConnected) {
                historyDialog.remove();
            }
            historyDialog = null;
        }

        function renderHistoryDialog() {
            if (!historyDialog || !historyDialog.isConnected) return;

            const list = historyDialog.querySelector('.gasn-history-list');
            const summary = historyDialog.querySelector('.gasn-history-summary');
            const detail = historyDialog.querySelector('.gasn-current-summary');
            const downloadButton = historyDialog.querySelector('.gasn-history-download-btn');
            if (!list || !summary || !detail) return;

            const savedCount = conversationState.order.length;
            summary.textContent = `${savedCount} saved conversations`;
            if (downloadButton) {
                downloadButton.disabled = savedCount === 0;
            }

            const currentUrlId = getConversationIdFromUrl();
            const currentVisibleSet = new Set(currentVisibleSnapshot.map(row => row.id));
            const currentRecord = currentUrlId ? conversationState.itemsById[currentUrlId] : null;
            const currentStoredIndex = currentUrlId ? conversationState.order.indexOf(currentUrlId) : -1;

            if (!currentUrlId) {
                detail.textContent = 'Current conversation: unavailable on this route';
            } else if (currentRecord && currentStoredIndex !== -1) {
                detail.textContent = `Current: #${currentStoredIndex + 1} ${currentRecord.title}`;
            } else if (currentRecord) {
                detail.textContent = `Current: ${currentRecord.title}`;
            } else {
                detail.textContent = `Current: ${currentUrlId} (not cached yet)`;
            }

            list.replaceChildren();

            if (!conversationState.order.length) {
                const empty = document.createElement('div');
                empty.className = 'gasn-history-empty';
                empty.textContent = 'No conversations have been cached yet.';
                list.appendChild(empty);
                return;
            }

            conversationState.order.forEach((id, index) => {
                const record = conversationState.itemsById[id];
                const row = document.createElement('div');
                row.className = 'gasn-history-row';
                if (currentUrlId && currentUrlId === id) {
                    row.classList.add('is-current');
                }

                const number = document.createElement('span');
                number.className = 'gasn-history-index';
                number.textContent = `#${index + 1}`;

                const title = document.createElement('span');
                title.className = 'gasn-history-title';
                title.textContent = record ? record.title : `Conversation ${id}`;

                const meta = document.createElement('span');
                meta.className = 'gasn-history-meta';
                meta.textContent = currentVisibleSet.has(id) ? `${id} • visible now` : id;

                row.appendChild(number);
                row.appendChild(title);
                row.appendChild(meta);
                list.appendChild(row);
            });
        }

        function downloadConversationState() {
            const data = {
                exportedAt: new Date().toISOString(),
                scriptVersion: GM_info.script.version,
                totalCount: conversationState.order.length,
                order: conversationState.order,
                itemsById: conversationState.itemsById
            };
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gemini-conversations-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function openHistoryDialog() {
            if (historyDialog && historyDialog.isConnected) {
                renderHistoryDialog();
                return;
            }

            const template = getHistoryDialogTemplate();
            if (!template) {
                return;
            }

            const fragment = template.content.cloneNode(true);
            const backdrop = fragment.querySelector('.gasn-history-dialog-backdrop');
            const closeButton = fragment.querySelector('.gasn-history-close-btn');
            const dialog = fragment.querySelector('.gasn-history-dialog');
            if (!backdrop || !closeButton || !dialog) {
                return;
            }

            backdrop.addEventListener('click', (event) => {
                if (event.target === backdrop) {
                    closeHistoryDialog();
                }
            });

            closeButton.addEventListener('click', () => {
                closeHistoryDialog();
            });

            const downloadButton = fragment.querySelector('.gasn-history-download-btn');
            if (downloadButton) {
                downloadButton.addEventListener('click', () => {
                    downloadConversationState();
                });
            }

            dialog.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            document.body.appendChild(backdrop);
            historyDialog = backdrop;
            renderHistoryDialog();
        }

        function updatePanelUI() {
            const panel = document.getElementById('gemini-auto-switch-panel');
            if (!panel) return;

            const checkbox = panel.querySelector('.auto-switch-checkbox');
            if (checkbox) {
                checkbox.checked = isAutoSwitchEnabled();
            }

            const listButton = panel.querySelector('.open-history-btn');
            if (listButton) {
                const savedCount = conversationState.order.length;
                listButton.disabled = savedCount === 0;
                listButton.title = savedCount > 0
                    ? `List ${savedCount} saved conversations`
                    : 'No saved conversations yet';
            }

            const snapshot = currentVisibleSnapshot.length ? currentVisibleSnapshot : collectVisibleConversationSnapshot(sidebarObserverTarget);
            const selectedIndex = snapshot.findIndex(row => row.isCurrent);
            if (selectedIndex !== -1) {
                lastSelectedIndex = selectedIndex;
            }
        }

        function createDraggablePanel() {
            if (document.getElementById('gemini-auto-switch-panel')) return;

            injectStyles();

            const commonHTMLStr = GM_getResourceText('gusCommonHTML');
            const innerHTMLStr = GM_getResourceText('geminiAutoSelectNextHTML');
            if (!commonHTMLStr || !innerHTMLStr) {
                console.error(`[GeminiAutoSelectNext] Templates not found. gusCommonHTML: ${!!commonHTMLStr}, geminiAutoSelectNextHTML: ${!!innerHTMLStr}`);
                return;
            }

            const contentDiv = document.createElement('div');
            window.geminiSetInnerHTML(contentDiv, innerHTMLStr, policy);

            const panel = window.geminiCreateCommonPanel({
                htmlString: commonHTMLStr,
                policy: policy,
                icon: gusEmoji,
                name: GM_info.script.name,
                version: GM_info.script.version,
                contentElement: contentDiv
            });

            panel.id = 'gemini-auto-switch-panel';
            document.body.appendChild(panel);

            const handle = panel.querySelector('.gus-panel-header') || panel;
            const inactiveHandle = panel.querySelector('.gus-inactive-content');
            if (handle) {
                window.geminiSetupDraggablePanel(panel, handle, CONSTANTS.PANEL_POSITION_KEY, { top: '80px', right: '20px' });
            }
            if (inactiveHandle) {
                window.geminiSetupDraggablePanel(panel, inactiveHandle, CONSTANTS.PANEL_POSITION_KEY, { top: '80px', right: '20px' });
            }
            window.geminiSetupMinimizablePanel(panel, CONSTANTS.STORAGE_KEY_MINIMIZED, handle, false);

            const checkbox = panel.querySelector('.auto-switch-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (event) => {
                    GM_setValue(CONSTANTS.STORAGE_KEY_AUTOSWITCH, event.target.checked);
                    updatePanelUI();
                });
            }

            const nextButton = panel.querySelector('.manual-next-btn');
            if (nextButton) {
                nextButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectNextConversation(0, true);
                });
            }

            const listButton = panel.querySelector('.open-history-btn');
            if (listButton) {
                listButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openHistoryDialog();
                });
            }

            updatePanelUI();
        }

        function respondCurrentConversationRequest(event) {
            const reqId = event && event.detail ? event.detail.reqId : null;
            const conversationId = getConversationIdFromUrl();
            const visibleRow = conversationId ? currentVisibleSnapshot.find(row => row.id === conversationId) : null;
            const storedRecord = conversationId ? conversationState.itemsById[conversationId] : null;
            const storedIndex = conversationId ? conversationState.order.indexOf(conversationId) : -1;

            window.dispatchEvent(new CustomEvent('gemini-auto-select-next:current-conversation', {
                detail: {
                    reqId,
                    conversationId,
                    title: visibleRow ? visibleRow.title : (storedRecord ? storedRecord.title : null),
                    storedIndex: storedIndex === -1 ? null : storedIndex + 1,
                    isKnown: Boolean(conversationId && (visibleRow || storedRecord)),
                    isVisibleInSidebar: Boolean(visibleRow),
                    orderedCount: conversationState.order.length
                }
            }));
        }

        function handleKeydown(event) {
            if (event.key === 'Escape' && historyDialog && historyDialog.isConnected) {
                closeHistoryDialog();
            }
        }

        function init() {
            if (isInitialized) return;
            isInitialized = true;

            createDraggablePanel();

            attachObserver = new MutationObserver(() => {
                if (!isInitialized) return;

                // Do not loop over mutation records here: during sidebar scrolling,
                // hundreds of mutations can fire in rapid succession, and iterating
                // over each record with querySelector calls is expensive.
                // Instead, we unconditionally schedule the debounced refresh (50 ms).
                // The debounce in scheduleSidebarTargetRefresh collapses all bursts
                // into a single DOM scan after the storm settles.
                if (!document.getElementById('gemini-auto-switch-panel')) {
                    createDraggablePanel();
                }

                scheduleSidebarTargetRefresh(50);
            });
            attachObserver.observe(document.body, { childList: true, subtree: true });

            keydownListener = handleKeydown;
            document.addEventListener('keydown', keydownListener);

            requestNextListener = () => {
                selectNextConversation(0, true);
            };
            window.addEventListener('gemini-auto-select-next:request-next', requestNextListener);

            requestCurrentConversationListener = (event) => {
                respondCurrentConversationRequest(event);
            };
            window.addEventListener('gemini-auto-select-next:request-current-conversation', requestCurrentConversationListener);

            refreshSidebarObservation();
        }

        function cleanup() {
            if (!isInitialized) return;
            isInitialized = false;

            if (attachObserver) {
                attachObserver.disconnect();
                attachObserver = null;
            }
            if (sidebarObserver) {
                sidebarObserver.disconnect();
                sidebarObserver = null;
            }
            if (attachRefreshTimer) {
                clearTimeout(attachRefreshTimer);
                attachRefreshTimer = null;
            }
            if (sidebarScanTimer) {
                clearTimeout(sidebarScanTimer);
                sidebarScanTimer = null;
            }

            sidebarObserverTarget = null;
            currentVisibleSnapshot = [];
            closeHistoryDialog();

            if (keydownListener) {
                document.removeEventListener('keydown', keydownListener);
                keydownListener = null;
            }
            if (requestNextListener) {
                window.removeEventListener('gemini-auto-select-next:request-next', requestNextListener);
                requestNextListener = null;
            }
            if (requestCurrentConversationListener) {
                window.removeEventListener('gemini-auto-select-next:request-current-conversation', requestCurrentConversationListener);
                requestCurrentConversationListener = null;
            }

            const panel = document.getElementById('gemini-auto-switch-panel');
            if (panel) {
                panel.remove();
            }
        }

        function checkUrl() {
            lastObservedActiveConversationId = getEffectiveCurrentConversationId();
            if (isAppPage()) {
                init();
            } else {
                cleanup();
            }
        }

        if (window.navigation) {
            window.navigation.addEventListener('navigatesuccess', () => {
                setTimeout(checkUrl, 400);
            });
        } else {
            routeFallbackInterval = setInterval(() => {
                if (window.location.href !== lastUrl) {
                    lastUrl = window.location.href;
                    setTimeout(checkUrl, 400);
                }
            }, 500);
        }

        if (document.body) {
            checkUrl();
        } else {
            window.addEventListener('DOMContentLoaded', checkUrl);
        }

        window.addEventListener('beforeunload', () => {
            if (routeFallbackInterval) {
                clearInterval(routeFallbackInterval);
                routeFallbackInterval = null;
            }
        }, { once: true });
    };

    if (document.readyState === 'complete') {
        initUserScript();
    } else {
        window.addEventListener('load', initUserScript);
    }
})();
