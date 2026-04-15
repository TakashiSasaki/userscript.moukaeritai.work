document.addEventListener('DOMContentLoaded', async () => {
    let serverVersion = null;
    try {
        const rawUrl = 'https://raw.githubusercontent.com/TakashiSasaki/userscript.moukaeritai.work/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-search-snippet-helper/gemini-search-snippet-helper.user.js';
        const response = await fetch(rawUrl);
        if (response.ok) {
            const text = await response.text();
            const versionMatch = text.match(/\/\/ @version\s+([\d.]+)/);
            if (versionMatch) {
                serverVersion = versionMatch[1];
                const latestBadge = document.querySelector('.latest-version');
                if (latestBadge) latestBadge.textContent = `Latest: v${serverVersion}`;
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
        if (name === 'Gemini Search Snippet Helper' || name === 'gemini-search-snippet-helper') {
            const installedBadge = document.querySelector('.installed-version');
            if (installedBadge) {
                installedBadge.textContent = `Installed: v${version}`;
                installedBadge.style.display = 'block';
            }

            const installBtn = document.querySelector('.install-button');
            const btnText = installBtn ? installBtn.querySelector('span') : null;
            if (serverVersion && installBtn) {
                if (checkUpdate(serverVersion, version)) {
                    if (btnText) btnText.textContent = 'Update';
                    installBtn.style.backgroundColor = '#f39c12';
                    installBtn.style.boxShadow = '0 4px 15px rgba(243, 156, 18, 0.3)';
                } else {
                    if (btnText) btnText.textContent = 'Installed';
                    installBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    installBtn.style.color = '#fff';
                    installBtn.style.boxShadow = 'none';
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
