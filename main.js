const { app, BrowserWindow, ipcMain, Menu, MenuItem, screen, globalShortcut, session } = require('electron');
const path = require('path');
const fs = require('fs');

let configWindow;
let overlayWindow;

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

let cachedConfig = { sources: [], settings: {} };

async function loadConfig() {
    try {
        const data = await fs.promises.readFile(CONFIG_PATH, 'utf-8');
        cachedConfig = JSON.parse(data);
        return cachedConfig;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error loading config:', error);
        }
    }
    return { sources: [], settings: {} };
}

async function saveConfig(data) {
    cachedConfig = data;
    try {
        await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

function createConfigWindow() {
    if (configWindow && !configWindow.isDestroyed()) {
        configWindow.focus();
        return;
    }

    configWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    configWindow.loadFile('index.html');

    configWindow.webContents.on('did-finish-load', async () => {
        const config = await loadConfig();
        configWindow.webContents.send('load-settings', config);
    });

    configWindow.on('closed', () => {
        configWindow = null;
    });
}

function createOverlayWindow(settings) {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        return overlayWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    overlayWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width: width,
        height: height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true, // Required for overlay-manager to require('electron')
            contextIsolation: false,
            webviewTag: true // Required for <webview>
        }
    });

    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    
    // Default: Click-through enabled (ignore mouse)
    // overlay-manager will request interaction when needed (Edit Mode, Menu, or specific interactive source)
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });

    // Load the Container
    overlayWindow.loadFile('overlay-container.html');

    // Hide from capture if requested
    if (settings && settings.hideFromObs) {
        overlayWindow.setContentProtection(true);
    }

    // Handle Menu Opening (Shift+F1 default)
    overlayWindow.webContents.on('ipc-message', (event, channel, ...args) => {
        if (channel === 'menu-opened') {
            overlayWindow.setIgnoreMouseEvents(false);
        } else if (channel === 'menu-closed') {
            overlayWindow.setIgnoreMouseEvents(true, { forward: true });
        } else if (channel === 'sources-modified') {
            // Update cached config and notify settings window
            const sources = args[0];
            if (cachedConfig) {
                cachedConfig.sources = sources;
                saveConfig(cachedConfig);
            }
            if (configWindow && !configWindow.isDestroyed()) {
                configWindow.webContents.send('sources-modified', sources);
            }
        }
    });

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });

    return overlayWindow;
}

// --- IPC Handlers ---

ipcMain.on('launch-overlay', (event, data) => {
    // data = { sources: [], settings: {} }
    saveConfig(data);

    // Register Shortcut
    globalShortcut.unregisterAll();
    const shortcut = (data.settings && data.settings.menuShortcut) || 'Shift+F1';

    try {
        globalShortcut.register(shortcut, () => {
            if (overlayWindow && !overlayWindow.isDestroyed()) {
                // Toggle Menu inside overlay
                overlayWindow.webContents.send('toggle-menu');
            }
        });
    } catch (err) {
        console.error('Failed to register shortcut:', err);
    }

    // Create or Get Window
    const win = createOverlayWindow(data.settings);

    // Apply Settings (e.g., Content Protection)
    if (data.settings && data.settings.hideFromObs !== undefined) {
        win.setContentProtection(data.settings.hideFromObs);
    }

    // Send Sources
    if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => {
            win.webContents.send('update-sources', data.sources);
        });
    } else {
        win.webContents.send('update-sources', data.sources);
    }
});

// App Lifecycle

app.whenReady().then(() => {
    // Headers stripping for iframe/webview compatibility
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = Object.assign({}, details.responseHeaders);
        const headersToDelete = [
            'x-frame-options',
            'content-security-policy',
            'frame-ancestors',
            'strict-transport-security'
        ];
        Object.keys(responseHeaders).forEach(header => {
            if (headersToDelete.includes(header.toLowerCase())) {
                delete responseHeaders[header];
            }
        });
        callback({ cancel: false, responseHeaders });
    });

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
