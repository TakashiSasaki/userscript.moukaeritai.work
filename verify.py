from playwright.sync_api import sync_playwright, expect

def verify_feature(page):
    page.goto('file:///app/index.html')
    page.wait_for_load_state("networkidle")

    # Assert 12 domain count for gemini
    expect(page.locator("a[href='#gemini'] .domain-count")).to_have_text("12")

    # Assert 2 domain count for docs
    expect(page.locator("a[href='#docs'] .domain-count")).to_have_text("2")

    # Check that auto paste is moved to docs
    expect(page.locator("#docs .project-item:has-text('Auto Paste in New Tab')")).to_be_visible()

    # Make sure we don't have href=gemini.google.com/index.html anymore
    hrefs = page.evaluate("Array.from(document.querySelectorAll('#gemini a')).map(a => a.getAttribute('href'))")
    for href in hrefs:
        if href == "gemini.google.com/index.html":
            raise AssertionError("Found an un-migrated link: " + href)

    print("Verification passed!")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    verify_feature(page)
    browser.close()