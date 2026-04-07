    function createPanel() {
        if (document.getElementById('youtube-playlist-scroller-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'youtube-playlist-scroller-panel';
        panel.className = 'yus-panel';

        const headerRow = document.createElement('div');
        headerRow.className = 'yus-header';

        const titleLabel = document.createElement('span');
        titleLabel.className = 'yus-title';
        titleLabel.textContent = 'Youtube Playlist Scroller';

        const versionLabel = document.createElement('span');
        versionLabel.className = 'yus-version';
        const v = typeof GM_info !== 'undefined' ? GM_info.script.version : '0.1.0';
        versionLabel.textContent = yusEmoji + ' ' + v;
        versionLabel.title = 'Double-click to minimize / drag to move';

        headerRow.appendChild(titleLabel);
        headerRow.appendChild(versionLabel);
        panel.appendChild(headerRow);

        const inactiveContent = document.createElement('div');
        inactiveContent.className = 'yus-inactive-content';
        panel.appendChild(inactiveContent);

        const contentDiv = document.createElement('div');
        contentDiv.id = 'youtube-playlist-scroller-panel-content';
        contentDiv.className = 'yus-active-content';
        panel.appendChild(contentDiv);



        document.body.appendChild(panel);

        window.youtubeSetupDraggablePanel(panel, headerRow, 'youtube-playlist-scroller_panel_position');
        window.youtubeSetupMinimizablePanel(panel, 'youtube-playlist-scroller_is_minimized', false);
    }

    function updatePanelVisibility() {
        const panel = document.getElementById('youtube-playlist-scroller-panel');
        if (!panel) return;
        panel.style.display = isActive ? 'flex' : 'none';
    }

