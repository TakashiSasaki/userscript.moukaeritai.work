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

document.addEventListener('userscript-check-installed', (event) => {
    const { name, version } = event.detail;
    const buttons = document.querySelectorAll('.install-button');

    // Semantic Versioning comparison
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
            // Extract version from button text "Install (vX.Y.Z)"
            const match = btn.textContent.match(/v(\d+\.\d+\.\d+)/);
            const serverVersion = match ? match[1] : null;

            if (serverVersion && compareVersions(serverVersion, version) > 0) {
                // Update available
                btn.innerHTML = `<svg height="16" viewBox="0 0 24 24" width="16"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Update (v${serverVersion})`;
                btn.style.backgroundColor = '#f39c12'; // Orange for update
                btn.style.boxShadow = '0 4px 15px rgba(243, 156, 18, 0.4)';
                btn.style.pointerEvents = 'auto';
                btn.classList.remove('installed');
            } else {
                // Installed and up-to-date
                btn.textContent = `Installed (v${version})`;
                btn.style.backgroundColor = '#6c757d'; // Grey for installed
                btn.style.boxShadow = 'none';
                btn.style.pointerEvents = 'none';
                btn.classList.add('installed');
            }
        }
    });
});

// Initial state: set buttons to "Checking..."
const installButtons = document.querySelectorAll('.install-button');
installButtons.forEach(btn => {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.textContent = 'Checking...';
    btn.style.backgroundColor = '#6c757d';
    btn.style.pointerEvents = 'none';
    btn.style.boxShadow = 'none';
});

// Ping userscripts to report themselves after a random delay (3-5s)
setTimeout(() => {
    installButtons.forEach(btn => {
        btn.innerHTML = btn.dataset.originalHtml;
        btn.style.backgroundColor = '';
        btn.style.pointerEvents = '';
        btn.style.boxShadow = '';
    });
    document.dispatchEvent(new CustomEvent('userscript-ping'));
}, Math.floor(Math.random() * 2000) + 3000);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
