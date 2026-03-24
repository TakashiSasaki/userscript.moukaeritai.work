from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto('https://example.com/')

        with open('gemini.google.com/gemini-auto-select-next/gemini-auto-select-next.user.js', 'r') as f:
            script_content = f.read()

        with open('gemini.google.com/gemini-auto-select-next/style.css', 'r') as f:
            css_content = f.read()

        # Let's bypass host check
        script_content = script_content.replace(
            'const isInstallCheckHost = installCheckHosts.includes(location.hostname);',
            'const isInstallCheckHost = false;'
        )

        # Modify the IIFE to expose init
        script_content = script_content.replace(
            '(function () {',
            'window.geminiAutoSelectNextMockInit = null; (function () {'
        ).replace(
            'function init() {',
            'window.geminiAutoSelectNextMockInit = init; function init() {'
        )

        page.evaluate(f"""
            document.body.innerHTML = `
                <style>body {{ font-family: sans-serif; background: #f0f0f0; margin: 0; padding: 20px; }}</style>
                <h1>Test Page for Gemini Auto-Select Next</h1>
                <a href="/app/1234567890123456" class="conversation selected">Conversation 1</a>
            `;

            window.GM_info = {{ script: {{ name: 'Gemini Auto-Select Next', version: '0.2.34' }} }};
            window.GM_setValue = () => {{}};
            window.GM_getValue = () => {{ return {{ top: '80px', right: '20px' }}; }};
            window.GM_getResourceText = () => `{css_content}`;
            window.GM_addStyle = (css) => {{
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
                return style;
            }};
        """)

        page.add_script_tag(content=script_content)

        # Call init directly
        page.evaluate("window.geminiAutoSelectNextMockInit && window.geminiAutoSelectNextMockInit()")

        # Wait for the panel
        page.wait_for_selector('#gemini-auto-switch-panel.ready', state='visible', timeout=5000)

        # Take a screenshot
        page.screenshot(path='screenshot.png')

        browser.close()

if __name__ == '__main__':
    run()
