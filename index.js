// --- Element Caching ---
const itemCache = new WeakMap();
const scriptNameToItem = new Map();

function getCachedElements(item) {
    let cached = itemCache.get(item);
    if (!cached) {
        cached = {
            installBtn: item.querySelector('.install-button'),
            latestBadge: item.querySelector('.latest-version'),
            installedBadge: item.querySelector('.installed-version'),
            buttonText: item.querySelector('.install-button-text')
        };
        itemCache.set(item, cached);
    }
    return cached;
}

// Total Scripts Count
function updateTotalScriptsCount() {
    const items = document.querySelectorAll('.project-item');
    let count = 0;
    items.forEach(item => {
        if (item.style.display !== 'none') count++;
    });
    const badge = document.getElementById('total-scripts-count');
    if (badge) badge.textContent = count;
}

// Search and Filter Logic
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.project-item');

        items.forEach(item => {
            const title = item.querySelector('.project-title')?.textContent.toLowerCase() || '';
            const desc = item.querySelector('.project-desc')?.textContent.toLowerCase() || '';
            if (title.includes(term) || desc.includes(term)) {
                item.style.display = 'flex'; // our items use flex
            } else {
                item.style.display = 'none';
            }
        });

        // Hide empty sections
        const sections = document.querySelectorAll('.domain-section');
        sections.forEach(section => {
            const visibleItems = section.querySelectorAll('.project-item[style="display: flex;"], .project-item:not([style*="display: none"])');
            if (visibleItems.length === 0 && term !== '') {
                section.style.display = 'none';
            } else {
                section.style.display = 'block';
            }
        });

        updateTotalScriptsCount();
    });
}

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
            // Rewrite github.com raw URLs to raw.githubusercontent.com to avoid CORS redirects
            if (url.includes('github.com') && url.includes('/raw/')) {
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/');
                const rawIndex = pathParts.indexOf('raw');
                if (rawIndex !== -1 && pathParts.length > rawIndex + 2) {

                    // A simpler generic rewrite:
                    // https://github.com/TakashiSasaki/repo/raw/refs/heads/main/path ->
                    // https://raw.githubusercontent.com/TakashiSasaki/repo/refs/heads/main/path

                    let newPath = urlObj.pathname.replace('/raw/', '/');
                    url = `https://raw.githubusercontent.com${newPath}`;
                }
            }

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

    const promises = Array.from(projectItems).map(async (item) => {
        const { installBtn, latestBadge } = getCachedElements(item);
        if (installBtn && installBtn.href && latestBadge) {
            const version = await fetchVersion(installBtn.href);
            if (version) {
                latestBadge.textContent = `v${version}`;
                latestBadge.classList.add('installed'); // use green style
                item.dataset.serverVersion = version;
            } else {
                latestBadge.textContent = 'Error';
                latestBadge.classList.add('outdated');
            }
            updateButtonState(item);
        }
    });

    await Promise.all(promises);
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

function updateButtonState(item) {
    const { installBtn, buttonText } = getCachedElements(item);
    if (!installBtn || !buttonText) return;

    const serverVersion = item.dataset.serverVersion;
    const installedVersion = item.dataset.installedVersion;

    if (!installedVersion) {
        // Not installed
        buttonText.textContent = 'Install';
        installBtn.classList.remove('installed-btn', 'update-btn');
        return;
    }

    if (serverVersion && compareVersions(serverVersion, installedVersion) > 0) {
        // Update available
        buttonText.textContent = 'Update';
        installBtn.classList.add('update-btn');
        installBtn.classList.remove('installed-btn');
    } else {
        // Up to date
        buttonText.textContent = 'Installed';
        installBtn.classList.add('installed-btn');
        installBtn.classList.remove('update-btn');
    }
}

// --- Installed Script Detection ---
document.addEventListener('userscript-check-installed', (event) => {
    // Expected detail: { name: 'Script Name', version: '1.0.0' }
    const detail = event.detail;
    if (!detail || !detail.name) return;

    // Some scripts might dispatch an array of results or single objects
    const processResult = (name, version) => {
        const item = scriptNameToItem.get(name);
        if (item) {
            const { installedBadge } = getCachedElements(item);
            if (installedBadge) {
                installedBadge.textContent = `v${version}`;
                installedBadge.classList.remove('outdated');
                installedBadge.classList.add('installed');
            }
            item.dataset.installedVersion = version;
            updateButtonState(item);
        }
    };

    if (Array.isArray(detail)) {
        detail.forEach(script => processResult(script.name, script.version));
    } else {
        processResult(detail.name, detail.version);
    }
});

// Listen for messages from window.postMessage (in case userscripts use that instead of custom events)
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'userscript-check-installed') {
        const detail = event.data.detail;
        if (!detail) return;

        const processResult = (name, version) => {
            const item = scriptNameToItem.get(name);
            if (item) {
                const { installedBadge } = getCachedElements(item);
                if (installedBadge) {
                    installedBadge.textContent = `v${version}`;
                    installedBadge.classList.remove('outdated');
                    installedBadge.classList.add('installed');
                }
                item.dataset.installedVersion = version;
                updateButtonState(item);
            }
        };

        if (Array.isArray(detail)) {
            detail.forEach(script => processResult(script.name, script.version));
        } else {
            processResult(detail.name, detail.version);
        }
    }
});

async function initialize() {
    updateTotalScriptsCount();

    const projectItems = document.querySelectorAll('.project-item');

    // 1. Populate script name index
    projectItems.forEach(item => {
        const installBtn = item.querySelector('.install-button');
        if (!installBtn) return;

        const scriptName = installBtn.getAttribute('data-script-name');
        if (scriptName) {
            scriptNameToItem.set(scriptName, item);
        }

        getCachedElements(item);
    });

    // 2. Fetch latest versions
    await fetchAndApplyLatestVersions();

    // 3. Ping installed userscripts
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('userscript-ping'));
        window.postMessage({ type: 'userscript-ping' }, '*');
    }, 1000);
}

// --- Run Initialization ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
