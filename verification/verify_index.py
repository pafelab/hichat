from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Load the index.html file
        filepath = os.path.abspath("index.html")
        page.goto(f"file://{filepath}")

        # Take a screenshot of the initial state
        page.screenshot(path="verification/index_initial.png", full_page=True)

        print("Screenshot taken: verification/index_initial.png")

        browser.close()

if __name__ == "__main__":
    run()
