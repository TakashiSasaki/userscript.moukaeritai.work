import time
from playwright.sync_api import sync_playwright

def test_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # We just need to load the template and style to check UI rendering
        page.goto("file:///app/gemini.google.com/gemini-export-to-docs/index.html")

        # Load the custom CSS and template
        with open("/app/gemini.google.com/gemini-export-to-docs/style.css", "r") as f:
            css = f.read()
        with open("/app/gemini.google.com/gemini-export-to-docs/template.html", "r") as f:
            html = f.read()

        page.evaluate("""(data) => {
            const style = document.createElement('style');
            style.innerHTML = data.css;
            document.head.appendChild(style);

            const div = document.createElement('div');
            div.innerHTML = data.html;
            document.body.appendChild(div);

            // Reconstruct the panel structure for testing
            const panel = document.createElement('div');
            panel.id = 'gemini-one-turn-panel';
            panel.style.top = '50px';
            panel.style.left = '50px';

            const tpl = document.getElementById('tpl-one-turn-panel');
            panel.appendChild(tpl.content.cloneNode(true));
            document.body.appendChild(panel);
        }""", {"css": css, "html": html})

        # Wait for render
        time.sleep(1)
        page.screenshot(path="test_ui_active.png")

        # Test inactive state
        page.evaluate("""() => {
            document.getElementById('gemini-one-turn-panel').classList.add('inactive');
        }""")
        time.sleep(1)
        page.screenshot(path="test_ui_inactive.png")

        browser.close()

if __name__ == '__main__':
    test_ui()
