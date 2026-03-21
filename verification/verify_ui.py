import os
import sys
import glob
from playwright.sync_api import sync_playwright

def test_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/app/verification/video")
        page = context.new_page()

        try:
            # According to memory:
            # "To verify userscripts with Playwright without a complex Tampermonkey extension setup,
            # navigate to a lightweight page on the target domain (e.g., `/robots.txt`) to naturally
            # bypass `window.location` checks... mock required Tampermonkey APIs... and then load/inject
            # the userscript content."

            # Since the script matches https://gemini.google.com/*, let's go there.
            page.goto("https://gemini.google.com/robots.txt")
            page.wait_for_timeout(1000)

            # Mock Tampermonkey APIs
            page.evaluate("""
                window.GM_info = { script: { name: 'Gemini Prompt Injector', version: '0.4.10' } };
                window.GM_setValue = (key, val) => { localStorage.setItem(key, val); };
                window.GM_getValue = (key, def) => { return localStorage.getItem(key) || def; };
            """)

            # Load and inject the userscript
            with open("/app/gemini.google.com/gemini-prompt-injector/gemini-prompt-injector.user.js", "r") as f:
                script_content = f.read()

            # Add DOMContentLoaded trigger if it's already loaded
            script_content += "\nif (document.readyState === 'complete') { document.dispatchEvent(new Event('DOMContentLoaded')); }"

            page.evaluate(script_content)
            page.wait_for_timeout(1000)

            # Check if UI is injected
            ui = page.locator("#gpi-test-ui")
            ui.wait_for(state="visible", timeout=5000)

            # Screenshot of the expanded state
            page.screenshot(path="/app/verification/verification-expanded.png")
            page.wait_for_timeout(1000)

            # Click minimize button
            minimize_btn = ui.locator("button[title='最小化']")
            minimize_btn.click()
            page.wait_for_timeout(1000)

            # Screenshot of the minimized state
            page.screenshot(path="/app/verification/verification-minimized.png")
            page.wait_for_timeout(1000)

        except Exception as e:
            print(f"Error: {e}")
            raise
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    test_ui()
