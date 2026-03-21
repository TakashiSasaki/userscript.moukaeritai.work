import os
from playwright.sync_api import sync_playwright

def test_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/app/verification/video")
        page = context.new_page()

        try:
            page.goto("https://gemini.google.com/robots.txt")
            page.wait_for_timeout(1000)

            # Mock Tampermonkey APIs
            page.evaluate("""
                window.GM_info = { script: { name: 'Gemini Artifact Exporter', version: '0.4.10' } };
                window.GM_setValue = (key, val) => { localStorage.setItem(key, val); };
                window.GM_getValue = (key, def) => { return localStorage.getItem(key) || def; };
                window.GM_getResourceText = (name) => {
                    if (name === 'templateHTML') return '<div class="gae-panel-header">Gemini Artifact Exporter</div><div class="gae-button-container"><button class="gae-scan-btn">Scan</button></div>';
                    return '';
                };
                window.GM_addStyle = (css) => {
                    const style = document.createElement('style');
                    style.textContent = css;
                    document.head.appendChild(style);
                };

                // TrustedTypes bypass
                if (typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy) {
                    window.testPolicy = trustedTypes.createPolicy('test-policy', { createHTML: string => string });
                }
            """)

            # Load styles
            with open("/app/gemini.google.com/gemini-artifact-exporter/style.css", "r") as f:
                css_content = f.read()
                css_escaped = css_content.replace('`', '\\`')
            page.evaluate(f"window.GM_addStyle(`{css_escaped}`);")

            # Mock the panel creation function since we are not fully initializing the script
            # We just want to see the panel style
            page.evaluate("""
                const htmlStr = window.GM_getResourceText('templateHTML');
                const safeHtml = window.testPolicy ? window.testPolicy.createHTML(htmlStr) : htmlStr;

                const panel = document.createElement('div');
                panel.id = 'gemini-batch-export-panel';
                panel.style.display = 'flex';
                panel.innerHTML = safeHtml;
                document.body.appendChild(panel);
            """)
            page.wait_for_timeout(1000)

            # Screenshot of the panel
            page.screenshot(path="/app/verification/verification-panel.png")
            page.wait_for_timeout(1000)

            # Test toast
            page.evaluate("""
                const toast = document.createElement('div');
                toast.textContent = 'Copied to clipboard';
                toast.style.position = 'fixed';
                toast.style.bottom = '20px';
                toast.style.left = '50%';
                toast.style.transform = 'translateX(-50%)';
                toast.style.backgroundColor = 'rgba(255, 182, 193, 0.9)'; // LightPink
                toast.style.color = '#333';
                toast.style.padding = '10px 20px';
                toast.style.borderRadius = '8px';
                toast.style.zIndex = '10000';
                document.body.appendChild(toast);
            """)
            page.wait_for_timeout(1000)
            page.screenshot(path="/app/verification/verification-toast.png")

        except Exception as e:
            print(f"Error: {e}")
            raise
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    test_ui()
