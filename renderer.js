// --- DOM Elements & State ---
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const launchBtn = document.getElementById('launch');
const statusEl = document.getElementById('status');

// --- Helper Functions ---
function setStatus(msg, isError = false) {
    statusEl.innerText = msg;
    if (isError) {
        statusEl.classList.add('error');
    } else {
        statusEl.classList.remove('error');
    }
}

// --- Tab Switching Logic ---
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.style.display = 'none'); // Reset display

        // Add active class to clicked
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetContent = document.getElementById(targetId);

        if (targetContent) {
            targetContent.style.display = 'block';
            targetContent.classList.add('active'); // for animation
        }
    });
});

// Initialize first tab
if (tabBtns.length > 0) {
    tabBtns[0].click();
}


// --- Launch Logic ---
launchBtn.addEventListener('click', () => {
    // Gather values
    const url = document.getElementById('url').value;
    const css = document.getElementById('css').value;
    const x = parseInt(document.getElementById('x').value) || 0;
    const y = parseInt(document.getElementById('y').value) || 0;
    const width = parseInt(document.getElementById('width').value) || 400;
    const height = parseInt(document.getElementById('height').value) || 600;
    const zoom = parseFloat(document.getElementById('zoom').value) || 1.0;

    // Streamlabs values
    const slUrl = document.getElementById('sl-url').value;
    const slWidth = parseInt(document.getElementById('sl-width').value) || 600;
    const slHeight = parseInt(document.getElementById('sl-height').value) || 400;
    const slZoom = parseFloat(document.getElementById('sl-zoom').value) || 1.0;
    const slCss = document.getElementById('sl-css').value;

    // Settings
    const menuShortcut = document.getElementById('menu-shortcut').value || 'Shift+F1';
    const hideFromObs = document.getElementById('hide-from-obs').checked;

    if (!url && !slUrl) {
        setStatus('Please enter at least one URL (YouTube/Twitch or Streamlabs)', true);
        return;
    }

    // UI Feedback
    const originalText = launchBtn.innerText;
    launchBtn.disabled = true;
    launchBtn.innerText = '🚀 Launching...';

    // Send IPC
    window.api.send('launch-overlay', { 
        url, css, x, y, width, height, zoom, menuShortcut, hideFromObs,
        slUrl, slWidth, slHeight, slZoom, slCss
    });

    setStatus('Overlay launched successfully!');

    setTimeout(() => {
        launchBtn.disabled = false;
        launchBtn.innerText = originalText;
    }, 2000);
});

// --- Real-time Zoom Display ---
document.getElementById('zoom').addEventListener('input', (e) => {
    document.getElementById('zoom-val').innerText = e.target.value;
});
document.getElementById('sl-zoom').addEventListener('input', (e) => {
    document.getElementById('sl-zoom-val').innerText = e.target.value;
});

// --- Shortcut Display Update ---
const shortcutInput = document.getElementById('menu-shortcut');
const displayShortcut = document.getElementById('display-shortcut');
if (shortcutInput && displayShortcut) {
    shortcutInput.addEventListener('input', () => {
        displayShortcut.textContent = shortcutInput.value || 'Shift+F1';
    });
}


// --- CSS Presets ---
const PRESETS = {
    youtube: `/* YouTube Chat Minimalist */
body { background-color: transparent !important; }
yt-live-chat-renderer { background-color: transparent !important; }
yt-live-chat-text-message-renderer {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: #ffffff !important;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}
yt-live-chat-header-renderer,
yt-live-chat-message-input-renderer {
    display: none !important;
}`,
    twitch: `/* Twitch Chat Minimalist */
body { background-color: transparent !important; }
.chat-room { background: transparent !important; }
.chat-line__message {
    font-family: 'Inter', sans-serif;
    color: #ffffff !important;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}
.stream-chat-header,
.chat-input {
    display: none !important;
}`
};

const presetYoutubeBtn = document.getElementById('preset-youtube');
const presetTwitchBtn = document.getElementById('preset-twitch');
const presetClearBtn = document.getElementById('preset-clear');
const cssTextarea = document.getElementById('css');

if (presetYoutubeBtn) {
    presetYoutubeBtn.addEventListener('click', () => {
        cssTextarea.value = PRESETS.youtube;
    });
}

if (presetTwitchBtn) {
    presetTwitchBtn.addEventListener('click', () => {
        cssTextarea.value = PRESETS.twitch;
    });
}

if (presetClearBtn) {
    presetClearBtn.addEventListener('click', () => {
        cssTextarea.value = '';
    });
}


// --- Load Settings (IPC) ---
window.api.on('load-settings', (settings) => {
    if (settings.url) document.getElementById('url').value = settings.url;
    if (settings.css) document.getElementById('css').value = settings.css;
    if (settings.x) document.getElementById('x').value = settings.x;
    if (settings.y) document.getElementById('y').value = settings.y;
    if (settings.width) document.getElementById('width').value = settings.width;
    if (settings.height) document.getElementById('height').value = settings.height;
    if (settings.zoom) {
        document.getElementById('zoom').value = settings.zoom;
        document.getElementById('zoom-val').innerText = settings.zoom;
    }
    if (settings.menuShortcut) {
        document.getElementById('menu-shortcut').value = settings.menuShortcut;
        if (displayShortcut) displayShortcut.textContent = settings.menuShortcut;
    }
    if (settings.hideFromObs) document.getElementById('hide-from-obs').checked = settings.hideFromObs;

    // Streamlabs
    if (settings.slUrl) document.getElementById('sl-url').value = settings.slUrl;
    if (settings.slWidth) document.getElementById('sl-width').value = settings.slWidth;
    if (settings.slHeight) document.getElementById('sl-height').value = settings.slHeight;
    if (settings.slZoom) {
        document.getElementById('sl-zoom').value = settings.slZoom;
        document.getElementById('sl-zoom-val').innerText = settings.slZoom;
    }
    if (settings.slCss) document.getElementById('sl-css').value = settings.slCss;
});
