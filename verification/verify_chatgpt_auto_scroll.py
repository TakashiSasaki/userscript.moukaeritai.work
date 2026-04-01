import os
import time
from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 800, 'height': 600})
        page = context.new_page()

        # Load the userscript content
        script_path = 'chat.openai.com/chatgpt-auto-scroll/chatgpt-auto-scroll.user.js'
        with open(script_path, 'r') as f:
            script_content = f.read()

        # Remove IIFE and 'use strict' to expose internal functions for testing if needed,
        # but here we just want to see if it renders.
        # Actually, the memory says to do this for testing internal functions.
        # For now, let's just inject it as is, but we need to mock GM_ APIs.

        # Go to a blank page
        page.goto('about:blank')

        # Inject mocks and the script
        page.evaluate("""
            window.GM_info = {
                script: {
                    name: "ChatGPT Auto Scroll",
                    version: "1.0.15"
                }
            };
            window.GM_getValue = (key, defVal) => defVal;
            window.GM_setValue = (key, val) => {};

            // Bypass Trusted Types if necessary (though we removed innerHTML,
            // the site might still have it)
            if (typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy) {
                if (!trustedTypes.defaultPolicy) {
                    trustedTypes.createPolicy('default', {
                        createHTML: (string) => string,
                        createScript: (string) => string,
                        createScriptURL: (string) => string,
                    });
                }
            }
        """)

        # Inject the script
        page.add_script_tag(content=script_content)

        # Wait for the panel to be created (it's in a setInterval)
        time.sleep(2)

        # Check if the panel exists
        panel = page.query_selector('#chatgpt-auto-scroll-panel')
        if not panel:
            print("FAILED: Panel not found")
            browser.close()
            return

        print("SUCCESS: Panel found")

        # Check status text content
        status_el = page.query_selector('#chatgpt-auto-scroll-status')
        if status_el:
            text = status_el.inner_text()
            print(f"Status text:\n{text}")
            if 'State: Idle' in text and 'Scrolls: 0' in text:
                print("SUCCESS: Status text looks correct")
            else:
                print("FAILED: Status text incorrect")

            # Check white-space style
            style = page.evaluate("el => getComputedStyle(el).whiteSpace", status_el)
            print(f"White-space style: {style}")
            if style == 'pre-wrap':
                print("SUCCESS: white-space: pre-wrap is applied")
            else:
                print("FAILED: white-space: pre-wrap missing")
        else:
            print("FAILED: Status element not found")

        # Take a screenshot
        screenshot_path = 'verification/chatgpt_auto_scroll_fix.png'
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists('verification'):
        os.makedirs('verification')
    verify_ui()
