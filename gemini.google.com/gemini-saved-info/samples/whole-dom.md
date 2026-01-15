# DOM Analysis: `whole-dom.html`

> **Note:** This DOM fragment was captured from the page `https://gemini.google.com/saved-info` and represents the entire page's DOM structure at that time.

This document outlines the high-level architecture of the Gemini web application's DOM.

## Main Layout Components

The application is structured with a main root component (`<chat-app>`) that holds the side navigation and the main content area.

### 1. Application Root

*   **Selector:** `chat-app#app-root`
*   **Purpose:** The root element of the Angular application, containing the entire user interface.

### 2. Side Navigation

*   **Selector:** `side-navigation-v2`
*   **Purpose:** The collapsible navigation panel on the left side of the screen.
*   **Contents:**
    *   New Chat button (`[data-test-id="new-chat-button"]`)
    *   "My Stuff" section with recent items (`my-stuff-recents-preview`)
    *   "Gems" list (`bot-list`)
    *   Chat history (`conversations-list`)
    *   Settings & Help buttons

### 3. Top Bar

*   **Selector:** `top-bar-actions`
*   **Purpose:** The horizontal bar at the top of the page.
*   **Contents:**
    *   Side navigation toggle button (`[data-test-id="side-nav-menu-button"]`)
    *   User profile and account button (Google Account icon).

### 4. Main Content Area

*   **Selector:** `bard-sidenav-content`
*   **Purpose:** The container for the currently active page or view.
*   **Mechanism:** It contains a `<router-outlet>` which Angular uses to dynamically load different components based on the URL.
*   **In this Sample:** The `<router-outlet>` is followed by the `<saved-info-page>` component. This confirms that the structure of `whole-dom.html` contains the entire structure documented in `saved-info-dialog.md`.
