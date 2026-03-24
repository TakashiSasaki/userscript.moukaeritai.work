import time
from playwright.sync_api import sync_playwright

def test_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/app/verification/video")
        page = context.new_page()

        # Let's bypass Content-Security-Policy completely with this flag, or use evaluate instead of add_script_tag
        page.goto("about:blank")

        # Inject the HTML
        with open("/app/gemini.google.com/gemini-export-to-docs/template.html", "r") as f:
            template_content = f.read()
        with open("/app/gemini.google.com/gemini-export-to-docs/style.css", "r") as f:
            style_content = f.read()

        page.set_content(f"""
            <html>
            <head>
                <style>{style_content}</style>
            </head>
            <body>
                <div id="templates" style="display:none;">{template_content.replace('{{scriptVersion}}', '0.4.37')}</div>

                <div id="gemini-one-turn-panel" class="inactive" style="top: 100px; left: 100px;">
                    <!-- Copied from template JS injection -->
                    <div class="one-turn-inactive-content" title="Gemini 1-Click Export to Docs">
                        <div class="one-turn-inactive-title">Export to Docs</div>
                        <div class="one-turn-inactive-version">v0.4.37</div>
                    </div>
                </div>
            </body>
            </html>
        """)
        page.wait_for_timeout(500)

        # Get the panel element and take a screenshot of it specifically
        panel = page.locator("#gemini-one-turn-panel")
        panel.screenshot(path="/app/verification/test_inactive.png")
        print("Screenshot saved to /app/verification/test_inactive.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    test_ui()
