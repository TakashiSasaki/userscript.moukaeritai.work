import os
import json
from playwright.sync_api import sync_playwright

def verify_feature(page):
    page.route("**/*", lambda route: route.continue_() if route.request.resource_type in ["document", "script", "xhr", "fetch"] else route.abort())

    page.goto("https://gemini.google.com/robots.txt")
    page.wait_for_timeout(500)

    # Inject TrustedTypes bypass policy
    page.evaluate('''() => {
        if (typeof trustedTypes !== 'undefined' && trustedTypes.createPolicy) {
            window.myPolicy = trustedTypes.createPolicy('myPolicy', { createHTML: (string) => string });
        }
    }''')

    with open('/app/gemini.google.com/gemini-history-loader/style.css', 'r') as f:
        css_content = f.read()
    with open('/app/gemini.google.com/gemini-history-loader/template.html', 'r') as f:
        html_content = f.read()
    with open('/app/gemini.google.com/gemini-history-loader/gemini-history-loader.user.js', 'r') as f:
        js_content = f.read()

    page.evaluate(f'''
        window.css_content = {json.dumps(css_content)};
        window.html_content = {json.dumps(html_content)};
        window.GM_info = {{ script: {{ name: 'Gemini History Loader', version: '0.1.4' }} }};
        window.GM_setValue = (k, v) => {{ localStorage.setItem(k, JSON.stringify(v)) }};
        window.GM_getValue = (k, d) => {{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }};
        window.GM_addStyle = (c) => {{
            const s = document.createElement('style');
            if (window.myPolicy) {{
                s.innerHTML = window.myPolicy.createHTML(c);
            }} else {{
                s.innerHTML = c;
            }}
            document.head.appendChild(s);
        }};
        window.GM_getResourceText = (n) => {{
            if (n === 'css') return window.css_content;
            if (n === 'templateHTML') return window.html_content;
            return '';
        }};
    ''')

    page.evaluate(js_content)
    # the script creates UI 1 second after load, but we injected it late. Let's just call createUI directly or dispatch load
    page.evaluate('''() => {
        window.dispatchEvent(new Event('load'));
    }''')

    page.wait_for_timeout(2000)

    # Show it clearly
    page.evaluate('''() => {
        const el = document.getElementById('gemini-history-loader-panel');
        if(el) {
            el.style.top = '100px';
            el.style.left = '100px';
            el.style.right = '';
            el.style.bottom = '';
        }
    }''')
    page.wait_for_timeout(500)

    page.screenshot(path="verification/verification.png")
    page.wait_for_timeout(500)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="verification/video")
        page = context.new_page()
        try:
            verify_feature(page)
        finally:
            context.close()
            browser.close()