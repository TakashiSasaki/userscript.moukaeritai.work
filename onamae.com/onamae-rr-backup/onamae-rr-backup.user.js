// ==UserScript==
// @name         お名前.com DNSレコードバックアップ
// @namespace    userscript.moukaeritai.work
// @version      0.0.3
// @description  お名前.comのDNSレコード設定画面を表示するたびに、レコード情報を自動的にバックアップします。
// @author       Takashi Sasaki
// @homepage     https://x.com/TakashiSasaki
// @match        https://navi.onamae.com/domain/setting/dns/control/input
// @match        https://userscript.moukaeritai.work/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @updateURL    https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/onamae.com/onamae-rr-backup/onamae-rr-backup.user.js
// @downloadURL  https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/onamae.com/onamae-rr-backup/onamae-rr-backup.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (location.hostname === 'userscript.moukaeritai.work') {
        window.dispatchEvent(new CustomEvent('userscript-check-installed', {
            detail: {
                name: GM_info.script.name,
                version: GM_info.script.version
            }
        }));
        return;
    }

    /**
     * DNS Record types that use 4 input fields for the value (e.g. A record IPv4).
     */
    const SPLIT_VALUE_TYPES = ['A'];

    /**
     * DNS Record types that have a priority field.
     */
    const PRIORITY_TYPES = ['MX'];

    /**
     * Main function to scan and backup records.
     */
    function backupRecords() {
        console.log('[onamae-rr-backup] Scanning records...');
        const rows = document.querySelectorAll('tr');
        if (rows.length === 0) {
            return;
        }

        const currentRecords = GM_getValue('records', {});
        // schema: { [key]: { type, host, value, priority, ttl, status, first_seen, last_seen } }

        let updateCount = 0;
        const now = new Date().toISOString();

        rows.forEach(row => {
            const cells = row.children;
            if (cells.length < 7) return;

            // Cell 1: Type (e.g., "A", "CNAME", "MX")
            const typeCell = cells[1];
            if (!typeCell) return;
            const type = typeCell.textContent.trim();
            const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'SPF']; // Add typical types
            if (!validTypes.includes(type)) return;

            // Cell 0: Host
            const host = cells[0].textContent.trim();

            // Cell 2: TTL
            const ttlInput = cells[2].querySelector('input');
            const ttl = ttlInput ? ttlInput.value.trim() : '';

            // Cell 3: Value
            let value = '';
            const valueCell = cells[3];
            if (SPLIT_VALUE_TYPES.includes(type)) {
                const inputs = valueCell.querySelectorAll('input');
                value = Array.from(inputs).map(input => input.value.trim()).join('.');
            } else {
                const input = valueCell.querySelector('input');
                value = input ? input.value.trim() : '';
            }

            // Cell 4: Priority
            let priority = '';
            const priorityCell = cells[4];
            if (PRIORITY_TYPES.includes(type)) {
                const input = priorityCell.querySelector('input');
                priority = input ? input.value.trim() : '0';
            } else {
                priority = '0';
            }

            // Cell 5: Status
            const statusCell = cells[5];
            const select = statusCell.querySelector('select');
            const status = select ? select.value : 'unknown';

            // Generate a unique key for the record
            // Key must distinguish between records. Using host+type+value+priority
            const key = `${type}|${host}|${value}|${priority}`;

            if (currentRecords[key]) {
                // Update existing record
                currentRecords[key].last_seen = now;
                // Update mutable fields just in case (though key covers most)
                currentRecords[key].ttl = ttl;
                currentRecords[key].status = status;
            } else {
                // New record
                currentRecords[key] = {
                    type: type,
                    host: host,
                    value: value,
                    priority: priority,
                    ttl: ttl,
                    status: status,
                    first_seen: now,
                    last_seen: now
                };
                updateCount++;
                console.log(`[onamae-rr-backup] New record found: ${key}`);
            }
        });

        if (updateCount > 0) {
            GM_setValue('records', currentRecords);
            console.log(`[onamae-rr-backup] Saved ${updateCount} new records. Total: ${Object.keys(currentRecords).length}`);
        } else {
            // Save anyway to update last_seen for existing records? 
            // Ideally yes, but to avoid excessive writes, maybe we batch or only do it if meaningful changes.
            // But the requirement says "record last observed time", so we should save even if only timestamps changed.
            // However, GM_setValue might be sync/expensive.
            // Let's save if any record was touched. The logic above updates last_seen in memory object.
            // We should check if *any* last_seen was updated or new record added.
            // Since we iterate all visible rows, we essentially update last_seen for all visible records.

            // Optimization: Check if stringified JSON changed? Or just save.
            // Given the infrequency of DNS editing, saving on every scan (debounced) is fine.
            GM_setValue('records', currentRecords);
        }
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Run backup with debounce on mutation
    const runBackup = debounce(backupRecords, 2000);

    // Observe changes in the body (or a more specific container if known)
    const observer = new MutationObserver((mutations) => {
        // Simple check to see if relevant nodes were added/removed
        let shouldRun = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                shouldRun = true;
                break;
            }
        }
        if (shouldRun) {
            runBackup();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial run in case the page is already loaded
    setTimeout(backupRecords, 3000);

})();
