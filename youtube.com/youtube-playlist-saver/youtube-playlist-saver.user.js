    function createPanel() {
        if (document.getElementById('youtube-playlist-saver-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'youtube-playlist-saver-panel';
        panel.className = 'yus-panel';

        const headerRow = document.createElement('div');
        headerRow.className = 'yus-header';

        const titleLabel = document.createElement('span');
        titleLabel.className = 'yus-title';
        titleLabel.textContent = 'Youtube Playlist Saver';

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
        contentDiv.id = 'youtube-playlist-saver-panel-content';
        contentDiv.className = 'yus-active-content';
        panel.appendChild(contentDiv);



        document.body.appendChild(panel);

        window.youtubeSetupDraggablePanel(panel, headerRow, 'youtube-playlist-saver_panel_position');
        window.youtubeSetupMinimizablePanel(panel, 'youtube-playlist-saver_is_minimized', false);
    }

    function updatePanelVisibility() {
        const panel = document.getElementById('youtube-playlist-saver-panel');
        if (!panel) return;
        panel.style.display = isActive ? 'flex' : 'none';
    }

