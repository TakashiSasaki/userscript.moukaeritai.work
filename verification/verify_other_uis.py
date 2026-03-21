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

            # Helper to load css
            def load_css(filepath):
                with open(filepath, "r") as f:
                    css_content = f.read()
                    css_escaped = css_content.replace('`', '\\`')
                page.evaluate(f"window.GM_addStyle(`{css_escaped}`);")

            load_css("/app/gemini.google.com/gemini-one-click-delete/style.css")
            load_css("/app/gemini.google.com/gemini-auto-scroll/style.css")
            load_css("/app/gemini.google.com/gemini-turn-counter/style.css")


            page.evaluate("""
                const getTrustedHTML = (html) => window.testPolicy ? window.testPolicy.createHTML(html) : html;

                // gemini-one-click-delete panel
                const ocdPanel = document.createElement('div');
                ocdPanel.id = 'gemini-delete-panel';
                ocdPanel.innerHTML = getTrustedHTML('<span class="version-badge">v0.3.3</span><button class="gdp-main-delete-btn">Delete</button>');
                ocdPanel.style.top = '100px';
                ocdPanel.style.left = '50px';
                document.body.appendChild(ocdPanel);

                // gemini-auto-scroll panel
                const asPanel = document.createElement('div');
                asPanel.id = 'gemini-auto-scroll-panel';
                asPanel.className = 'ready'; // to show it
                asPanel.innerHTML = getTrustedHTML(`
                    <div class="widget-header">
                        <h1>Auto-Scroll</h1>
                        <span class="version-badge">v0.2.34</span>
                    </div>
                    <div class="panel-content"><button class="auto-scroll-btn stopped">Scroll</button></div>
                `);
                document.body.appendChild(asPanel);

                // gemini-turn-counter panel
                const tcPanel = document.createElement('div');
                tcPanel.id = 'gemini-turn-counter-ui';
                tcPanel.className = 'expanded';
                tcPanel.innerHTML = getTrustedHTML(`
                    <div class="gtc-content">
                        <div class="gtc-row"><span>Turns</span><span class="gtc-val">4</span></div>
                        <div class="gtc-row"><span>Images</span><span class="gtc-val">0</span></div>
                        <div class="gtc-setting-row"><input class="gtc-input" value="1000">ms</div>
                    </div>
                `);
                tcPanel.style.top = '200px';
                document.body.appendChild(tcPanel);
            """)

            page.wait_for_timeout(1000)
            page.screenshot(path="/app/verification/verification-other-uis.png")

        except Exception as e:
            print(f"Error: {e}")
            raise
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    test_ui()
