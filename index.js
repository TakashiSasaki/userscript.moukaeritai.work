// Tab switching logic
const tabBtns = document.querySelectorAll('.tab-btn');
const projectItems = document.querySelectorAll('.project-item');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        tabBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');

        projectItems.forEach(item => {
            const category = item.getAttribute('data-category');
            if (filter === 'all' || filter === category) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    });
});

// --- Dynamic Version Fetching ---
async function fetchAndApplyLatestVersions() {
    const buttons = document.querySelectorAll('.install-button');

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

    const updateButton = (btn, version) => {
        if (!version) {
            btn.textContent = 'Version N/A';
            btn.style.backgroundColor = '#dc3545'; // Red for error
            return;
        }
        const currentText = btn.innerHTML;
        const updatedText = currentText.replace(/\(v[\d.]+\)/, `(v${version})`);
        btn.innerHTML = updatedText;
        btn.dataset.version = version; // Store for later comparison
    };

    const promises = Array.from(buttons).map(async (btn) => {
        const scriptUrl = btn.href;
        if (scriptUrl) {
            const version = await fetchVersion(scriptUrl);
            updateButton(btn, version);
        }
    });

    await Promise.all(promises);
}


// --- Installed Script Detection ---
document.addEventListener('userscript-check-installed', (event) => {
    const { name, version: installedVersion } = event.detail;
    const buttons = document.querySelectorAll('.install-button');

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

    buttons.forEach(btn => {
        if (btn.getAttribute('data-script-name') === name) {
            const serverVersion = btn.dataset.version;

            if (serverVersion && compareVersions(serverVersion, installedVersion) > 0) {
                btn.innerHTML = `<svg height="16" viewBox="0 0 24 24" width="16"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Update (v${serverVersion})`;
                btn.style.backgroundColor = '#f39c12';
                btn.style.boxShadow = '0 4px 15px rgba(243, 156, 18, 0.4)';
                btn.style.pointerEvents = 'auto';
                btn.classList.remove('installed');
            } else {
                btn.textContent = `Installed (v${installedVersion})`;
                btn.style.backgroundColor = '#6c757d';
                btn.style.boxShadow = 'none';
                btn.style.pointerEvents = 'none';
                btn.classList.add('installed');
            }
        }
    });
});

async function initialize() {
    // 1. Fetch latest versions and update buttons
    await fetchAndApplyLatestVersions();

    // 2. Ping installed userscripts after a delay to check their versions
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('userscript-ping'));
    }, 1000); // 1-second delay after fetching is done
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
