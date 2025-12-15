const { app, BrowserWindow, ipcMain, Menu, MenuItem, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let configWindow;
let overlayWindow;
let alertWindow;

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
    return null;
}

function saveConfig(data) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

function createConfigWindow() {
    configWindow = new BrowserWindow({
        width: 600,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    configWindow.loadFile('index.html');

    configWindow.webContents.on('did-finish-load', () => {
        const config = loadConfig();
        if (config) {
            configWindow.webContents.send('load-settings', config);
        }
    });
}

function getEmbedUrl(inputUrl) {
    if (!inputUrl) return '';
    try {
        const urlObj = new URL(inputUrl);
        
        // YouTube
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            let videoId = urlObj.searchParams.get('v');
            
            // Handle youtu.be/VIDEO_ID
            if (!videoId && urlObj.hostname.includes('youtu.be')) {
                videoId = urlObj.pathname.slice(1);
            }
            
            // Handle youtube.com/live/VIDEO_ID
            if (!videoId && urlObj.pathname.startsWith('/live/')) {
                videoId = urlObj.pathname.replace('/live/', '');
            }

            if (videoId) {
                // Using popout url is better for standalone window
                return `https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`;
            }
        }
        
        // Twitch
        if (urlObj.hostname.includes('twitch.tv')) {
            const parts = urlObj.pathname.split('/').filter(p => p);
            if (parts.length > 0) {
                const channel = parts[0];
                return `https://www.twitch.tv/popout/${channel}/chat`;
            }
        }

        return inputUrl; 
    } catch (e) {
        console.error('Invalid URL:', e);
        return inputUrl;
    }
}

function getStreamlabsUrl(input) {
    if (!input) return null;
    if (input.startsWith('http')) return input;
    // Assume it's a token
    return `https://streamlabs.com/alert-box/v3/${input}`;
}

// IPC Handlers for Transform
ipcMain.on('overlay-move', (event, { x, y }) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        const [currentX, currentY] = senderWindow.getPosition();
        senderWindow.setPosition(currentX + x, currentY + y);
    }
});

ipcMain.on('overlay-resize', (event, { x, y, edge }) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        const [width, height] = senderWindow.getSize();
        const [posX, posY] = senderWindow.getPosition();
        let newWidth = width;
        let newHeight = height;
        let newX = posX;
        let newY = posY;

        if (edge.includes('e')) newWidth += x;
        if (edge.includes('s')) newHeight += y;
        if (edge.includes('w')) {
            newWidth -= x;
            newX += x;
        }
        if (edge.includes('n')) {
            newHeight -= y;
            newY += y;
        }

        // Min size check
        if (newWidth < 100) newWidth = 100;
        if (newHeight < 100) newHeight = 100;

        senderWindow.setBounds({ x: newX, y: newY, width: newWidth, height: newHeight });
    }
});

// IPC Handler for Trim
ipcMain.on('trim-resize', (event, { x, y, width, height }) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        const bounds = senderWindow.getBounds();
        const newBounds = {
            x: bounds.x + x,
            y: bounds.y + y,
            width: bounds.width + width,
            height: bounds.height + height
        };

        // Safety check to prevent negative size
        if (newBounds.width > 0 && newBounds.height > 0) {
            senderWindow.setBounds(newBounds);
        }
    }
});

ipcMain.on('request-toggle-click-through', (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        // Toggle ignore mouse events.
        // We need to know current state. We can store it on the window object or toggle.
        // Electron doesn't have a getter for ignoreMouseEvents state easily.
        // Let's assume default is TRUE (click-through).

        // However, we just came from a menu click, which temporarily disabled it.
        // The menu's `menu-will-close` handler re-enables it to TRUE after 100ms.

        // If the user clicked "Toggle Click-Through", they want to FLIP the persistent state.

        const currentState = senderWindow._clickThrough !== false; // Default true
        const newState = !currentState;
        senderWindow._clickThrough = newState;

        // Apply new state
        senderWindow.setIgnoreMouseEvents(newState, { forward: true });

        // IMPORTANT: The menu close handler will try to set it to TRUE.
        // We need to override or update that logic.
        // But the menu logic is inside createTransparentWindow.
    }
});

// Helper to create transparent window
// Helper to create transparent window
// Helper to create transparent window
function createTransparentWindow(opts) {
    const win = new BrowserWindow({
        ...opts,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        visibleOnAllWorkspaces: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            preload: path.join(__dirname, 'overlay-preload.js')
        }
    });

    win.setAlwaysOnTop(true, 'screen-saver');
    
    // CRITICAL: Enable click-through by default
    win.setIgnoreMouseEvents(true, { forward: true });
    win._clickThrough = true; // Track state

    win.on('closed', () => {
        // Handled by caller
    });

    // Function to show context menu
    const showContextMenu = () => {
        // Temporarily disable click-through
        win.setIgnoreMouseEvents(false);
        
        const menu = new Menu();
        menu.append(new MenuItem({
            label: 'Transform (Resize Window) - Press T',
            click: () => win.webContents.send('toggle-transform')
        }));
        menu.append(new MenuItem({
            label: 'Trim (Crop Edges) - Press C',
            click: () => win.webContents.send('toggle-trim')
        }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({
            label: 'Reset Trim - Press R',
            click: () => win.webContents.send('reset-trim')
        }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({
            label: 'Toggle Click-Through - Press Space',
            click: () => win.webContents.send('toggle-click-through')
        }));
        
        menu.popup({ window: win });
        
        // Restore state after menu closes
        menu.on('menu-will-close', () => {
            setTimeout(() => {
                if (!win.isDestroyed()) {
                    // Restore to what it was supposed to be
                    const shouldIgnore = win._clickThrough !== false;
                    win.setIgnoreMouseEvents(shouldIgnore, { forward: true });
                }
            }, 100);
        });
    };

    // Listen for show-menu event from renderer
    win.webContents.on('ipc-message', (event, channel) => {
        if (channel === 'show-context-menu') {
            showContextMenu();
        }
    });

    // Deny new windows
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    
    // Expose menu function
    win.openContextMenu = showContextMenu;

    return win;
}


ipcMain.on('launch-overlay', (event, data) => {
    const { url, css, x, y, width, height, zoom, menuShortcut, slUrl, slWidth, slHeight } = data;
    
    saveConfig(data);

    // Register global shortcut
    globalShortcut.unregisterAll(); // Clear previous
    if (menuShortcut) {
        try {
            const ret = globalShortcut.register(menuShortcut, () => {
                if (overlayWindow && !overlayWindow.isDestroyed()) {
                    overlayWindow.openContextMenu();
                }
            });
            if (!ret) {
                console.error('Registration failed for shortcut:', menuShortcut);
            }
        } catch (err) {
            console.error('Error registering shortcut:', err);
        }
    }

    // --- Chat Overlay ---
    const embedUrl = getEmbedUrl(url);

    if (overlayWindow) {
        overlayWindow.removeAllListeners('closed'); 
        if (!overlayWindow.isDestroyed()) overlayWindow.close();
        overlayWindow = null;
    }

    if (embedUrl) {
        overlayWindow = createTransparentWindow({
            x: x, y: y, width: width, height: height
        });
        overlayWindow.on('closed', () => overlayWindow = null);
        overlayWindow.loadURL(embedUrl);
        overlayWindow.webContents.on('did-finish-load', () => {
            if (zoom) overlayWindow.webContents.setZoomFactor(zoom);
            if (css) overlayWindow.webContents.insertCSS(css).catch(e => console.error('Failed to inject CSS:', e));
        });
    }

    // --- Streamlabs Overlay ---
    const streamlabsLink = getStreamlabsUrl(slUrl);

    if (alertWindow) {
        alertWindow.removeAllListeners('closed');
        if (!alertWindow.isDestroyed()) alertWindow.close();
        alertWindow = null;
    }

    if (streamlabsLink) {
        // Calculate center if not specified (or default logic)
        // Here we just use default screen center if user didn't specify (but UI sends values)
        // Actually UI sends defaults 600x400.
        // Let's center it on primary display by default if x/y aren't provided (but UI doesn't provide SL x/y).
        // Since UI doesn't provide SL X/Y, we should calculate center.
        
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
        const alertW = slWidth || 600;
        const alertH = slHeight || 400;
        const alertX = Math.round((screenW - alertW) / 2);
        const alertY = Math.round((screenH - alertH) / 2);

        alertWindow = createTransparentWindow({
            x: alertX, y: alertY, width: alertW, height: alertH
        });
        alertWindow.on('closed', () => alertWindow = null);
        alertWindow.loadURL(streamlabsLink);
        // Streamlabs usually doesn't need custom CSS or Zoom, but we could add if needed.
        // It should be transparent by default.
    }
});

app.whenReady().then(() => {
    createConfigWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createConfigWindow();
        }
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
