from playwright.sync_api import sync_playwright
import os

def test_templates():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Browser error: {exc}"))

        # Mock window.api and electron
        page.add_init_script("""
            window.api = {
                send: function() { console.log("Mock api.send"); },
                on: function() { console.log("Mock api.on"); }
            };

            window.require = function(module) {
                if (module === 'electron') {
                    return {
                        ipcRenderer: {
                            on: function() {},
                            send: function() {},
                            invoke: function() { return Promise.resolve({}); }
                        }
                    };
                }
                return {};
            };
        """)

        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Check buttons
        page.locator("#btn-preset-youtube").wait_for()

        # Click Twitch button first to be sure we change from default
        print("Clicking Twitch...")
        page.click("#btn-preset-twitch")
        twitch_css = page.input_value("#css")

        if ".chat-room" in twitch_css:
            print("Twitch CSS applied successfully")
        else:
            print("Twitch CSS NOT applied.")

        page.screenshot(path="verification/verification_twitch.png")

        # Click YouTube button
        print("Clicking YouTube...")
        page.click("#btn-preset-youtube")
        # Check textarea content
        yt_css = page.input_value("#css")

        if "yt-live-chat-header-renderer" in yt_css:
            print("YouTube CSS applied successfully")
        else:
            print("YouTube CSS NOT applied")

        page.screenshot(path="verification/verification_youtube.png")

        # Click Clear
        print("Clicking Clear...")
        page.click("#btn-preset-clear")
        clear_css = page.input_value("#css")
        if clear_css == "":
             print("Clear worked")

        page.screenshot(path="verification/verification_clear.png")

        browser.close()

if __name__ == "__main__":
    test_templates()
