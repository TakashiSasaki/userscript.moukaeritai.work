/**
 * Shared version-check logic for domain landing pages.
 * Dynamically fetches the latest version from GitHub raw URLs
 * and compares with installed userscript versions.
 * Injects "Latest" and "Installed" version badges into each card.
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
        // Github Pages might block fetch to raw URLs due to CORS if they redirect to raw.githubusercontent.com
        // We can rewrite the URL to raw.githubusercontent.com explicitly
        let fetchUrl = url;
        if (url.includes('github.com') && url.includes('/raw/')) {
            // e.g. https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-history-loader/gemini-history-loader.user.js
            // -> https://raw.githubusercontent.com/TakashiSasaki/userscript.moukaeritai.work/refs/heads/userscript.moukaeritai.work/gemini.google.com/gemini-history-loader/gemini-history-loader.user.js
            fetchUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/raw/', '/');
        }

        const cacheBuster = fetchUrl.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
        const response = await fetch(fetchUrl + cacheBuster, { cache: 'no-store' });
        if (!response.ok) return null;
        const text = await response.text();
        const match = text.match(/@version\s+([\d.]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function updateButtonState(item) {
    const btn = item.querySelector('.install-button');
    if (!btn) return;

    const serverVersion = item.dataset.serverVersion;
    const installedVersion = item.dataset.installedVersion;

    if (!installedVersion) {
        // Not installed
        let label = (btn.dataset.originalContent || '').replace(/Install/i, 'Install');
        if (serverVersion) {
            label = label.replace(/Install/i, `Install (v${serverVersion})`);
        }
        btn.innerHTML = label;
        btn.classList.remove('installed');
        btn.style.pointerEvents = '';
        btn.style.background = '';
        btn.style.boxShadow = '';
        return;
    }

    if (serverVersion && compareVersions(serverVersion, installedVersion) > 0) {
        // Update available
        let label = (btn.dataset.originalContent || '').replace(/Install/i, 'Update');
        label = label.replace(/Update/i, `Update (v${serverVersion})`);
        btn.innerHTML = label;
        btn.style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.6)';
        btn.style.background = '#f39c12';
        btn.classList.remove('installed');
        btn.style.pointerEvents = 'auto';
    } else {
        // Installed & up-to-date
        btn.textContent = 'Installed';
        btn.classList.add('installed');
        btn.style.pointerEvents = 'none';
        btn.style.background = '';
        btn.style.boxShadow = '';
    }
}

function injectVersionStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .project-footer {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 12px;
            margin-top: auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }
        .version-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 0.8em;
            color: rgba(255, 255, 255, 0.6);
        }
        .version-row {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .version-label {
            min-width: 60px;
        }
        .version-badge {
            background-color: rgba(255, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-weight: bold;
            font-size: 0.95em;
        }
        .version-badge.latest {
            background-color: rgba(16, 185, 129, 0.2);
            color: #6ee7b7;
        }
        .version-badge.installed {
            background-color: rgba(59, 130, 246, 0.2);
            color: #93c5fd;
        }
        .version-badge.outdated {
            background-color: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
        }
    `;
    document.head.appendChild(style);
}

async function initVersionCheck() {
    const projectItems = document.querySelectorAll('.project-item');

    // 0. Inject CSS for version badges
    injectVersionStyles();

    // 1. Inject version badge UI and footer structure
    projectItems.forEach(item => {
        const installBtn = item.querySelector('.install-button');
        if (!installBtn) return;

        // Strip hardcoded version from original content if present
        let cleanHTML = installBtn.innerHTML.replace(/\s*\(v[\d.]+\)/g, '');
        installBtn.innerHTML = cleanHTML;

        // Save original button content
        installBtn.dataset.originalContent = cleanHTML;

        // Create footer container
        const footer = document.createElement('div');
        footer.className = 'project-footer';

        // Create version info
        const versionInfo = document.createElement('div');
        versionInfo.className = 'version-info';
        versionInfo.innerHTML = `
            <div class="version-row">
                <span class="version-label">Latest:</span>
                <span class="version-badge latest">...</span>
            </div>
            <div class="version-row">
                <span class="version-label">Installed:</span>
                <span class="version-badge installed">-</span>
            </div>
        `;

        // Assemble: versionInfo + button => footer => item
        footer.appendChild(versionInfo);
        item.appendChild(footer);
        footer.appendChild(installBtn);
    });

    // 2. Fetch latest versions from GitHub in parallel
    const promises = Array.from(projectItems).map(async item => {
        const btn = item.querySelector('.install-button');
        if (!btn || !btn.href) return;

        const version = await fetchVersion(btn.href);
        const badge = item.querySelector('.version-badge.latest');

        if (version) {
            item.dataset.serverVersion = version;
            if (badge) {
                badge.textContent = `v${version}`;
            }
        } else {
            if (badge) {
                badge.textContent = 'Error';
                badge.classList.add('outdated');
            }
        }

        updateButtonState(item);
    });
    await Promise.all(promises);

    // 3. Listen for installed userscript reports
    document.addEventListener('userscript-check-installed', (event) => {
        const { name, version } = event.detail;
        projectItems.forEach(item => {
            const btn = item.querySelector('.install-button');
            if (btn && btn.getAttribute('data-script-name') === name) {
                item.dataset.installedVersion = version;

                // Update installed badge
                const badge = item.querySelector('.version-badge.installed');
                if (badge) {
                    badge.textContent = `v${version}`;
                    badge.classList.remove('outdated');
                }

                updateButtonState(item);
            }
        });
    });

    // 4. Ping installed userscripts after a short delay
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('userscript-ping'));
    }, 1000);

    // 5. Poll for installation status after clicking an install button
    projectItems.forEach(item => {
        const installBtn = item.querySelector('.install-button');
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                let attempts = 0;
                const maxAttempts = 5;
                const intervalMs = 2000;
                
                const pollInterval = setInterval(() => {
                    attempts++;
                    document.dispatchEvent(new CustomEvent('userscript-ping'));
                    
                    if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                    }
                }, intervalMs);
            });
        }
    });
}

// Run
initVersionCheck();
