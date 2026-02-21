from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        page.wait_for_timeout(1000)

        # Debug translations
        try:
            t_type = page.evaluate("typeof translations")
            print(f"typeof translations: {t_type}")

            w_t = page.evaluate("window.translations")
            print(f"window.translations is defined: {w_t is not None}")
        except Exception as e:
            print(f"Error checking translations: {e}")

        # Try to call updateLanguage
        try:
            page.evaluate("updateLanguage('en')")
        except Exception as e:
            print(f"Error calling updateLanguage: {e}")
            # Try fixing the call if needed, e.g. use window.translations in renderer?
            # Or maybe just skip if it fails, but we want to verify.

        page.wait_for_timeout(500)

        h1_text = page.locator('h1').inner_text()
        print(f"H1 Text: {h1_text}")

        doc_title = page.title()
        print(f"Document Title: {doc_title}")

        page.screenshot(path="verification/title_verification.png")

        browser.close()

if __name__ == "__main__":
    run()
