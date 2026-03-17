# YouTube Domain Agent Guidelines

This document outlines the domain-specific learnings and guidelines for developing user scripts targeting YouTube (youtube.com). These rules supplement the global guidelines in the root `AGENTS.md`.

## YouTube (SPA & Performance)

YouTube user script development learnings:

1.  **SPA Navigation & Cleanup**:
    -   **Early Cleanup**: On SPA sites like YouTube, rely on early navigation events like `yt-navigate-start` to stop observers and timers *before* page teardown begins. Waiting for `finish` events often causes browser hangs as observers process thousands of deletion mutations.
    -   **Idempotency**: Ensure cleanup functions are idempotent so they can be safely called multiple times (e.g., on start, on finish, on unload).

2.  **Observer Performance**:
    -   **Avoid Broad Monitoring**: Do NOT monitor `document.body` with `subtree: true` if massive DOM changes are expected.
    -   **Polling Alternatives**: For waiting on elements during transitions, lightweight polling (`setInterval`) is often safer and more performant than `MutationObserver`.

3.  **Strict Context Checking**:
    -   **URL Verification**: Always verify `window.location.pathname` or parameters at the start of your main logic to ensure UI elements don't bleed into unintended pages (e.g., playlist tools appearing on video watch pages).

4.  **Trusted Types Compliance (Security)**:
    -   **Avoid `innerHTML`**: Modern sites like YouTube enforce Trusted Types security policies that block assignment to `innerHTML`.
    -   **Use DOM Methods**: Always use `document.createElement()`, `textContent`, `setAttribute()`, and `appendChild()` to securely construct UI elements.
