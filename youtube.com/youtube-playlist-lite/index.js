/**
 * YouTube Playlist Lite - Dynamic Version Fetching
 */

const SCRIPT_NAME = 'YouTube Playlist Lite';
const SCRIPT_URL = 'youtube-playlist-lite.user.js'; // Local relative path or full raw URL

async function fetchLatestVersion() {
    const latestBadge = document.querySelector('.latest-version');
    const updateBtn = document.getElementById('install-btn');
    if (!latestBadge) return;

    try {
        const response = await fetch(SCRIPT_URL + '?t=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) throw new Error('Fetch failed');

        const text = await response.text();
        const match = text.match(/@version\s+([\d.]+)/);
        if (match) {
            const version = match[1];
            latestBadge.textContent = 'v' + version;
            updateBtn.dataset.serverVersion = version;
            checkAndUpdateButtonState();
        } else {
            latestBadge.textContent = 'Error';
        }
    } catch (error) {
        console.error('Error fetching version:', error);
        latestBadge.textContent = 'Error';
    }
}

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

function checkAndUpdateButtonState() {
    const installBtn = document.getElementById('install-btn');
    const btnText = installBtn ? installBtn.querySelector('span') : null;
    const installedBadge = document.querySelector('.installed-version');

    if (!installBtn || !btnText) return;

    const serverVersion = installBtn.dataset.serverVersion;
    const installedVersion = installBtn.dataset.installedVersion;

    if (!installedVersion) {
        btnText.textContent = 'Install';
        installBtn.classList.remove('installed-btn', 'update-btn');
        if (installedBadge) installedBadge.style.display = 'none';
        return;
    }

    if (installedBadge) {
        installedBadge.textContent = 'Installed: v' + installedVersion;
        installedBadge.style.display = 'block';
    }

    if (serverVersion && compareVersions(serverVersion, installedVersion) > 0) {
        btnText.textContent = 'Update';
        installBtn.classList.add('update-btn');
        installBtn.classList.remove('installed-btn');
    } else {
        btnText.textContent = 'Installed';
        installBtn.classList.add('installed-btn');
        installBtn.classList.remove('update-btn');
    }
}

// Detection from Tampermonkey
document.addEventListener('userscript-check-installed', (event) => {
    const detail = event.detail;
    if (detail && detail.name === SCRIPT_NAME) {
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.dataset.installedVersion = detail.version;
            checkAndUpdateButtonState();
        }
    }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchLatestVersion();

    // Ping installed script
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('userscript-ping'));
    }, 1000);
});
