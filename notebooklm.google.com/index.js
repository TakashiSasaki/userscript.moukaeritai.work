document.addEventListener('userscript-check-installed', (event) => {
    const { name, version } = event.detail;
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
            const match = btn.textContent.match(/v(\d+\.\d+\.\d+)/);
            const serverVersion = match ? match[1] : null;

            if (serverVersion && compareVersions(serverVersion, version) > 0) {
                btn.innerHTML = `<svg height="18" viewBox="0 0 24 24" width="18"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Update (v${serverVersion})`;
                btn.style.boxShadow = '0 0 15px rgba(66, 133, 244, 0.6)';
                btn.style.background = '#357ae8';
                btn.classList.remove('installed');
                btn.style.pointerEvents = 'auto';
            } else {
                btn.textContent = `Installed (v${version})`;
                btn.classList.add('installed');
                btn.style.pointerEvents = 'none';
                btn.style.background = '';
                btn.style.boxShadow = '';
            }
        }
    });
});

window.addEventListener('load', () => {
    document.dispatchEvent(new CustomEvent('userscript-ping'));
});
