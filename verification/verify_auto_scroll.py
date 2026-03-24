import os
from playwright.sync_api import sync_playwright

def verify_feature():
    os.makedirs("/tmp/verification/video", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/tmp/verification/video")
        page = context.new_page()

        # Route to block unnecessary resources to speed up loading (as per memory)
        page.route("**/*", lambda route: route.continue_() if route.request.resource_type in ["document", "script", "xhr", "fetch"] else route.abort())

        # Navigate to gemini.google.com robots.txt to bypass location checks
        page.goto("https://gemini.google.com/robots.txt")
        page.wait_for_timeout(1000)

        # Mock Tampermonkey APIs and GM_info
        page.evaluate("""
            window.GM_info = { script: { version: '0.2.35', name: 'Gemini Auto-Scroll' } };
            window.GM_setValue = async () => {};
            window.GM_getValue = async () => {};
            window.GM_registerMenuCommand = () => {};
            window.GM_addStyle = (css) => {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
                return style;
            };
            window.GM_getResourceText = () => ''; // We'll inject CSS manually below
        """)

        # Read and inject CSS
        with open("gemini.google.com/gemini-auto-scroll/style.css", "r") as f:
            css_content = f.read()
            page.evaluate(f"""
                const style = document.createElement('style');
                style.textContent = `{css_content}`;
                document.head.appendChild(style);
                style.id = 'gemini-auto-scroll-styles';
            """)

        # Read and inject UserScript
        with open("gemini.google.com/gemini-auto-scroll/gemini-auto-scroll.user.js", "r") as f:
            js_content = f.read()
            page.evaluate(js_content)

        page.wait_for_timeout(2000) # Wait for script to initialize and render UI

        # Dispatch fake ping to bypass install check (if needed, though we mocked it slightly differently, script might just run)
        # Actually the script has:
        # const isInstallCheckHost = installCheckHosts.includes(location.hostname)...
        # Since we are on gemini.google.com, it will not return early.

        # Force init AutoScroll as if we navigated to /app
        page.evaluate("window.history.pushState({}, '', '/app/123'); window.dispatchEvent(new Event('popstate'));")

        page.wait_for_timeout(3000) # Wait for panel to appear

        # Take screenshot of the panel
        panel = page.locator("#gemini-auto-scroll-panel")
        if panel.is_visible():
            panel.screenshot(path="/tmp/verification/verification.png")
            page.screenshot(path="/tmp/verification/full_page.png")
        else:
            print("Panel not found. Taking full page screenshot.")
            page.screenshot(path="/tmp/verification/full_page_error.png")

        page.wait_for_timeout(1000)
        context.close()
        browser.close()

if __name__ == "__main__":
    verify_feature()
