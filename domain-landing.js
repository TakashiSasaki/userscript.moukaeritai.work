/**
 * Shared version-check logic for domain landing pages.
 * Dynamically fetches the latest version from GitHub raw URLs
 * and compares with installed userscript versions.
 */

const DOWNLOAD_ICON = '<svg height="18" viewBox="0 0 24 24" width="18"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>';

function compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

async function fetchVersion(url) {
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return null;
        const text = await response.text();
        const match = text.match(/@version\s+([\d.]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function updateButtonState(btn) {
    const serverVersion = btn.dataset.serverVersion;
    const installedVersion = btn.dataset.installedVersion;

    if (!installedVersion) {
        // Not installed - show Install with server version
        if (serverVersion) {
            btn.innerHTML = `${DOWNLOAD_ICON} Install (v${serverVersion})`;
        } else {
            btn.innerHTML = `${DOWNLOAD_ICON} Install`;
        }
        btn.classList.remove('installed');
        btn.style.pointerEvents = '';
        btn.style.background = '';
        btn.style.boxShadow = '';
        return;
    }

    if (serverVersion && compareVersions(serverVersion, installedVersion) > 0) {
        // Update available
        btn.innerHTML = `${DOWNLOAD_ICON} Update (v${serverVersion})`;
        btn.style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.6)';
        btn.style.background = '#f39c12';
        btn.classList.remove('installed');
        btn.style.pointerEvents = 'auto';
    } else {
        // Installed & up-to-date
        btn.textContent = `Installed (v${installedVersion})`;
        btn.classList.add('installed');
        btn.style.pointerEvents = 'none';
        btn.style.background = '';
        btn.style.boxShadow = '';
    }
}

async function initVersionCheck() {
    const buttons = document.querySelectorAll('.install-button');

    // 1. Set initial loading state
    buttons.forEach(btn => {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = `${DOWNLOAD_ICON} Loading...`;
    });

    // 2. Fetch latest versions from GitHub in parallel
    const promises = Array.from(buttons).map(async btn => {
        if (btn.href) {
            const version = await fetchVersion(btn.href);
            if (version) {
                btn.dataset.serverVersion = version;
            }
        }
        updateButtonState(btn);
    });
    await Promise.all(promises);

    // 3. Listen for installed userscript reports
    document.addEventListener('userscript-check-installed', (event) => {
        const { name, version } = event.detail;
        buttons.forEach(btn => {
            if (btn.getAttribute('data-script-name') === name) {
                btn.dataset.installedVersion = version;
                updateButtonState(btn);
            }
        });
    });

    // 4. Ping installed userscripts after a short delay
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('userscript-ping'));
    }, 1000);
}

// Run
initVersionCheck();
