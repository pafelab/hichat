from playwright.sync_api import sync_playwright
import os

def test_custom_menu():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        page.set_content("<html><body><h1>Overlay</h1></body></html>")

        # Read overlay-preload.js
        with open("overlay-preload.js", "r") as f:
            preload_script = f.read()

        # Execute it with local mock
        page.evaluate(f"""() => {{
            const ipcRendererMock = {{
                listeners: {{}},
                on: function(channel, callback) {{
                    this.listeners[channel] = callback;
                }},
                send: function(channel, data) {{
                    console.log(`IPC Sent: ${{channel}}`, JSON.stringify(data));
                }}
            }};
            window.ipcRendererMock = ipcRendererMock;

            const require = function(module) {{
                if (module === 'electron') {{
                    return {{
                        ipcRenderer: ipcRendererMock,
                        webFrame: {{
                            getZoomFactor: function() {{ return 1.0; }}
                        }}
                    }};
                }}
                return {{}};
            }};

            {preload_script}
        }}""")

        # Trigger menu
        print("Triggering menu toggle...")
        page.evaluate("window.ipcRendererMock.listeners['toggle-menu']()")

        # Wait for menu to appear
        page.locator("#custom-radial-menu").wait_for()
        print("Menu appeared!")

        # Check if checkbox is checked
        is_checked = page.is_checked("#menu-open")
        print(f"Menu open checkbox checked: {is_checked}")

        page.screenshot(path="verification/verification_menu_open.png")

        # Click Transform button
        print("Clicking Transform button...")
        page.click("#menu-btn-transform")

        # Check if menu closed
        is_checked_after = page.is_checked("#menu-open")
        print(f"Menu open checkbox checked after click: {is_checked_after}")

        page.screenshot(path="verification/verification_menu_closed.png")

        browser.close()

if __name__ == "__main__":
    test_custom_menu()
