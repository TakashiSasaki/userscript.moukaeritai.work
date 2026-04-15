document.addEventListener('DOMContentLoaded', async () => {
    let serverVersion = null;
    try {
        const rawUrl = 'https://raw.githubusercontent.com/TakashiSasaki/userscript.moukaeritai.work/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-one-click-delete/gemini-one-click-delete.user.js';
        const response = await fetch(rawUrl);
        if (response.ok) {
            const text = await response.text();
            const versionMatch = text.match(/\/\/ @version\s+([\d.]+)/);
            const dateMatch = text.match(/\/\/ @lastModified\s+([\d-]+)/);
            if (versionMatch) {
                serverVersion = versionMatch[1];
                const date = dateMatch ? dateMatch[1] : '不明';

                const verEl = document.getElementById('ver-info');
                const dateEl = document.getElementById('date-info');
                if (verEl) verEl.textContent = `v${serverVersion}`;
                if (dateEl) dateEl.textContent = date;

                const latestBadge = document.querySelector('.latest-version');
                if (latestBadge) {
                    latestBadge.textContent = `Latest: v${serverVersion}`;
                }
            }
        }
    } catch (e) {
        console.warn('Could not fetch script version:', e);
    }

    function parseVersion(v) {
        return v ? v.split('.').map(Number) : [];
    }

    function checkUpdate(latest, installed) {
        if (!latest || !installed) return false;
        const lParts = parseVersion(latest);
        const iParts = parseVersion(installed);
        for (let i = 0; i < Math.max(lParts.length, iParts.length); i++) {
            const l = lParts[i] || 0,
                inst = iParts[i] || 0;
            if (l > inst) return true;
            if (l < inst) return false;
        }
        return false;
    }

    document.addEventListener('userscript-check-installed', (event) => {
        const {
            name,
            version
        } = event.detail;
        if (name === 'Gemini 1-Click Delete Conversation' || name === 'gemini-one-click-delete') {
            const installedBadge = document.querySelector('.installed-version');
            if (installedBadge) {
                installedBadge.textContent = `Installed: v${version}`;
                installedBadge.style.display = 'block';
            }

            const installBtn = document.querySelector('.install-button');
            const btnText = document.querySelector('.button-text');
            if (serverVersion && installBtn) {
                if (checkUpdate(serverVersion, version)) {
                    if (btnText) btnText.textContent = 'Update';
                    installBtn.style.backgroundColor = '#f39c12';
                    installBtn.style.color = '#fff';
                } else {
                    if (btnText) btnText.textContent = 'Installed';
                    installBtn.style.backgroundColor = '#f6f8fa';
                    installBtn.style.color = '#24292e';
                }
            }
        }
    });

    // Ping installed userscripts after a short delay
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('userscript-ping'));
    }, 1000);

    // Poll for installation status after clicking an install button
    const startPolling = () => {
        let attempts = 0;
        const maxAttempts = 5;
        const intervalMs = 2000;
        const pollInterval = setInterval(() => {
            attempts++;
            document.dispatchEvent(new CustomEvent('userscript-ping'));
            if (attempts >= maxAttempts) clearInterval(pollInterval);
        }, intervalMs);
    };

    const mainInstallBtn = document.querySelector('.install-button');
    if (mainInstallBtn) mainInstallBtn.addEventListener('click', startPolling);
});
