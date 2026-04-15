document.addEventListener('DOMContentLoaded', async () => {
    let serverVersion = null;
    try {
        // Fetch from Github raw URL as requested, to bypass CORS and get the latest
        const rawUrl = 'https://raw.githubusercontent.com/TakashiSasaki/userscript.moukaeritai.work/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-export-to-docs/gemini-export-to-docs.user.js';
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

    // Helper for version comparison
    function parseVersion(v) { return v ? v.split('.').map(Number) : []; }
    function checkUpdate(latest, installed) {
        if (!latest || !installed) return false;
        const lParts = parseVersion(latest);
        const iParts = parseVersion(installed);
        for (let i = 0; i < Math.max(lParts.length, iParts.length); i++) {
            const l = lParts[i] || 0, inst = iParts[i] || 0;
            if (l > inst) return true;
            if (l < inst) return false;
        }
        return false;
    }

    // Fetch Dependency Versions
    const depCards = document.querySelectorAll('.dep-card');
    depCards.forEach(async (card) => {
        const url = card.getAttribute('data-url');
        try {
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                const vMatch = text.match(/\/\/ @version\s+([\d.]+)/);
                if (vMatch) {
                    const version = vMatch[1];
                    card.dataset.latestVersion = version;
                    const latestSpan = card.querySelector('.dep-latest');
                    if (latestSpan) latestSpan.textContent = `v${version}`;
                    updateDepCardState(card);
                }
            }
        } catch (e) {}
    });

    function updateDepCardState(card) {
        const latest = card.dataset.latestVersion;
        const installed = card.dataset.installedVersion;
        const btn = card.querySelector('.dep-install-btn');
        if (!installed || !btn) return;
        
        if (latest && checkUpdate(latest, installed)) {
            btn.textContent = 'Update';
            btn.style.backgroundColor = '#f39c12';
        } else {
            btn.textContent = 'Installed';
            btn.style.backgroundColor = '#f6f8fa';
            btn.style.color = '#24292e';
            btn.style.border = '1px solid #e1e4e8';
        }
    }

    // Listen for installed userscript reports
    document.addEventListener('userscript-check-installed', (event) => {
        const { name, version } = event.detail;
        
        // Logic for main script
        if (name === 'Gemini 1-Click Export to Docs' || name === 'Gemini 1-Click Export to Docs (Dev)') {
            const installedBadge = document.querySelector('.installed-version');
            if (installedBadge) {
                installedBadge.textContent = `Installed: v${version}`;
                installedBadge.style.display = 'block';
            }
            
            const installBtn = document.querySelector('.install-button');
            const btnText = document.querySelector('.button-text');
            if (serverVersion && installBtn && btnText) {
                if (checkUpdate(serverVersion, version)) {
                    btnText.textContent = 'Update';
                    installBtn.style.backgroundColor = '#f39c12';
                    installBtn.style.color = '#fff';
                } else {
                    btnText.textContent = 'Installed';
                    installBtn.style.backgroundColor = '#f6f8fa';
                    installBtn.style.color = '#24292e';
                }
            }
        }

        // Logic for dependency scripts
        depCards.forEach(card => {
            const scriptName = card.getAttribute('data-script-name');
            if (name === scriptName) {
                card.dataset.installedVersion = version;
                const installedSpan = card.querySelector('.dep-installed');
                if (installedSpan) {
                    installedSpan.textContent = `v${version}`;
                    installedSpan.style.color = '#2ea44f';
                    installedSpan.style.fontWeight = 'bold';
                }
                updateDepCardState(card);
            }
        });
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

    const depInstallBtns = document.querySelectorAll('.dep-install-btn');
    depInstallBtns.forEach(btn => btn.addEventListener('click', startPolling));
});
