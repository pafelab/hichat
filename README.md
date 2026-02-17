# HiChat - Overlay Manager

HiChat is a powerful, transparent overlay application designed for streamers and content creators. It allows you to display multiple web sources (such as chat boxes from YouTube, Twitch, or Streamlabs) directly on your screen without a background, making it perfect for single-monitor setups or complex streaming configurations.

## Features

- **Transparent Overlay:** Seamlessly integrates with your desktop, allowing you to see your game or application underneath.
- **Multiple Sources:** Add and manage multiple web sources simultaneously.
- **Interactive Edit Mode:** Drag and resize sources directly on the screen using the "Edit Mode".
- **Audio Control:** Individually control the volume or mute specific sources.
- **Custom CSS:** Apply custom CSS to any source to style chat boxes or widgets exactly how you want.
- **OBS/Capture Hiding:** Toggle visibility to hide the overlay from streaming software (OBS, XSplit) while keeping it visible to you.
- **Global Shortcuts:** Configurable shortcut (default `Shift+F1`) to toggle menus and interaction modes.
- **Security Stripping:** Automatically strips `x-frame-options` headers to allow embedding of sites like YouTube and Twitch.

## Installation

To get started with HiChat, follow these steps:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/pafelab/hichat.git
    cd hichat
    ```

2.  **Install Dependencies:**
    Ensure you have [Node.js](https://nodejs.org/) installed, then run:
    ```bash
    npm install
    ```

3.  **Run the Application:**
    ```bash
    npm start
    ```

## User Manual

### 1. The Dashboard
When you launch HiChat, the main configuration window opens. This is your command center for managing sources and settings.

- **Sources Tab:** Manage your list of web sources.
- **Global Settings Tab:** Configure application-wide behavior.

### 2. Adding & Managing Sources
In the **Sources** tab:
- **Add Source:** Click the `➕ Add` button to create a new web source.
- **Remove Source:** Select a source from the list and click the `🗑️` (Trash) icon.
- **Reorder:** Use the `⬆️` and `⬇️` buttons to change the Z-index. Sources lower in the list appear *on top* of sources higher in the list.

### 3. Configuring a Source
Select a source from the list to edit its properties in the **Properties Panel**:

- **Name:** A friendly name for the source (e.g., "YouTube Chat").
- **URL:** The web address of the content you want to display.
- **Dimensions (Width/Height):** Set the initial size of the source window in pixels.
- **Position (X/Y):** Set the initial coordinates on your screen.
- **Audio:**
    - **Mute:** Check to silence the source.
    - **Volume:** Slider to adjust the volume (0-100%).
- **Opacity:** Adjust the transparency of the source.
- **Interactive (Clickable):**
    - **Enabled:** You can interact with the webpage (click links, scroll, type).
    - **Disabled:** Clicks pass through the source to the window behind it (useful for overlays while gaming).
- **Custom CSS:** Inject custom CSS styles. Use the preset buttons (YouTube, Twitch, Streamlabs) for quick styling templates.

### 4. Global Settings
In the **Global Settings** tab:
- **Menu Shortcut:** Define the global key combination to toggle the overlay menu/edit mode. Default is `Shift+F1`.
- **Hide from OBS/Capture:** If checked, the overlay will be visible to you but invisible to screen capture software like OBS.

### 5. Using the Overlay (Edit Mode)
Once you click **🚀 Launch / Update Overlay**:
- The configuration window will minimize (or stay open), and the transparent overlay will appear.
- **Toggle Edit Mode:** Press `Shift+F1` (or your configured shortcut).
    - **In Edit Mode:** You will see a menu bar and borders around your sources. You can **drag** sources to move them and **resize** them using the bottom-right corner handle.
    - **Exit Edit Mode:** Press `Shift+F1` again or click "Done" in the menu bar. The borders will disappear, and the overlay will return to its "pass-through" state (unless "Interactive" is enabled for specific sources).

## Shortcuts

| Action | Default Shortcut | Description |
| :--- | :--- | :--- |
| **Toggle Menu / Edit Mode** | `Shift+F1` | Opens the overlay menu and enables dragging/resizing of sources. |

## Troubleshooting

- **I can't click on the chat/source!**
    - Ensure "Interactive (Clickable)" is checked in the source properties, OR enter "Edit Mode" (`Shift+F1`) to temporarily interact with it.
- **The overlay is blocking my game clicks.**
    - Disable "Interactive (Clickable)" for that source. The overlay is designed to let clicks pass through when not in Edit Mode or explicitly set to interactive.
- **My changes aren't showing up.**
    - Click the **🚀 Launch / Update Overlay** button in the dashboard to apply changes to the active overlay.

## Development

- **Built with:** Electron, Vanilla JS, HTML/CSS.
- **Structure:**
    - `main.js`: Entry point, handles window creation and IPC.
    - `index.html` / `renderer.js`: The Settings Dashboard UI.
    - `overlay-container.html` / `overlay-manager.js`: The transparent overlay logic.

---
Created by Pafelab
