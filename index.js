// Domain nav smooth scrolling
const domainLinks = document.querySelectorAll('.domain-nav-link');
domainLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').replace('#', '');
        const target = document.getElementById(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// --- Dynamic Version Fetching ---
async function fetchAndApplyLatestVersions() {
    const projectItems = document.querySelectorAll('.project-item');

    const fetchVersion = async (url) => {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                console.error(`Failed to fetch ${url}: ${response.statusText}`);
                return null;
            }
            const scriptText = await response.text();
            const match = scriptText.match(/@version\s+([\d.]+)/);
            return match ? match[1] : null;
        } catch (error) {
            console.error(`Error fetching or parsing ${url}:`, error);
            return null;
        }
    };

    const updateServerVersionUI = (item, version) => {
        const badge = item.querySelector('.version-badge.latest');
        const installBtn = item.querySelector('.install-button');

        if (!badge) return;

        if (!version) {
            badge.textContent = 'Error';
            badge.classList.add('outdated');
        } else {
            badge.textContent = `v${version}`;
            badge.classList.add('latest');
            // Store version on the item for comparison logic
            item.dataset.serverVersion = version;

            // Trigger a re-evaluation of the button state
            updateButtonState(item);
        }
    };

    const promises = Array.from(projectItems).map(async (item) => {
        const btn = item.querySelector('.install-button');
        if (btn && btn.href) {
            const version = await fetchVersion(btn.href);
            updateServerVersionUI(item, version);
        }
    });

    await Promise.all(promises);
}

function updateButtonState(item) {
    const installBtn = item.querySelector('.install-button');
    if (!installBtn) return;

    const serverVersion = item.dataset.serverVersion;
    const installedVersion = item.dataset.installedVersion;

    if (!installedVersion) {
        // Case: Not installed
        installBtn.innerHTML = installBtn.dataset.originalContent || installBtn.innerHTML; // Restore icon+text
        installBtn.style.backgroundColor = ''; // Default green
        installBtn.classList.remove('installed');
        return;
    }

    const compareVersions = (v1, v2) => {
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
    };

    if (serverVersion && compareVersions(serverVersion, installedVersion) > 0) {
        // Case: Update available
        installBtn.innerHTML = `
            <svg height="16" viewBox="0 0 24 24" width="16"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Update
        `;
        installBtn.style.backgroundColor = '#f39c12'; // Orange
    } else {
        // Case: Up to date (or server version unknown)
        installBtn.textContent = 'Installed'; // Simplify text
        installBtn.style.backgroundColor = '#6c757d'; // Grey
    }
}


// --- Installed Script Detection ---
document.addEventListener('userscript-check-installed', (event) => {
    const { name, version: installedVersion } = event.detail;
    const projectItems = document.querySelectorAll('.project-item');

    projectItems.forEach(item => {
        const btn = item.querySelector('.install-button');
        if (btn && btn.getAttribute('data-script-name') === name) {

            // Update Installed Version Badge
            const badge = item.querySelector('.version-badge.installed');
            if (badge) {
                badge.textContent = `v${installedVersion}`;
                badge.classList.remove('outdated'); // Reset
                badge.classList.add('installed');
            }

            // Store state
            item.dataset.installedVersion = installedVersion;

            // Update Button
            updateButtonState(item);
        }
    });
});

async function initialize() {
    const projectItems = document.querySelectorAll('.project-item');

    // 1. Inject UI Structure
    projectItems.forEach(item => {
        const installBtn = item.querySelector('.install-button');
        if (!installBtn) return;

        // Save original button content once
        installBtn.dataset.originalContent = installBtn.innerHTML;

        // Create Footer Container
        const footer = document.createElement('div');
        footer.className = 'project-footer';

        // Create Version Info Area
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

        // Move button into footer
        footer.appendChild(versionInfo);

        // We need to clone or move the button. Moving is better to keep event listeners if any (though currently none are attached via JS except href)
        // But we need to insert the footer into the item, and move the button into the footer.
        item.appendChild(footer);
        footer.appendChild(installBtn);
    });


    // 2. Fetch latest versions
    await fetchAndApplyLatestVersions();

    // 3. Ping installed userscripts
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('userscript-ping'));
    }, 1000);
}

// --- Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

// --- Run Initialization ---
initialize();
