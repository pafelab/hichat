from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Listen for console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        try:
            print("Navigating to frontend...")
            page.goto("http://localhost:5173")

            # Wait a bit to see if we are stuck on loading
            try:
                page.wait_for_selector("text=Loading AI Models...", timeout=5000)
                print("App is showing 'Loading AI Models...'")
            except:
                pass

            print("Waiting for main title...")
            page.wait_for_selector("text=Face Finder AI", timeout=10000)

            print("Checking for Upload View...")
            if page.locator("text=Upload Photos").is_visible():
                print("Upload View found.")
            else:
                print("Upload View NOT found.")

            print("Checking for Search View...")
            if page.locator("text=Find My Photos").is_visible():
                print("Search View found.")
            else:
                print("Search View NOT found.")

            print("Taking screenshot...")
            page.screenshot(path="verification/app_screenshot.png")
            print("Screenshot saved to verification/app_screenshot.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_screenshot.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app()
