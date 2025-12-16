document.getElementById('launch').addEventListener('click', () => {
    const url = document.getElementById('url').value;
    const css = document.getElementById('css').value;
    const x = parseInt(document.getElementById('x').value) || 0;
    const y = parseInt(document.getElementById('y').value) || 0;
    const width = parseInt(document.getElementById('width').value) || 400;
    const height = parseInt(document.getElementById('height').value) || 600;
    const zoom = parseFloat(document.getElementById('zoom').value) || 1.0;
    const menuShortcut = document.getElementById('menu-shortcut').value || 'Shift+F1';

    // Streamlabs inputs
    const slUrl = document.getElementById('sl-url').value;
    const slWidth = parseInt(document.getElementById('sl-width').value) || 600;
    const slHeight = parseInt(document.getElementById('sl-height').value) || 400;

    if (!url && !slUrl) {
        alert('กรุณาใส่ลิ้งก์อย่างน้อยหนึ่งช่อง (Please enter at least one URL)');
        return;
    }

    window.api.send('launch-overlay', { 
        url, css, x, y, width, height, zoom, menuShortcut,
        slUrl, slWidth, slHeight
    });
    document.getElementById('status').innerText = 'Overlay launched!';
});

document.getElementById('zoom').addEventListener('input', (e) => {
    document.getElementById('zoom-val').innerText = e.target.value;
});

// Load settings
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
    if (settings.menuShortcut) document.getElementById('menu-shortcut').value = settings.menuShortcut;
    // Streamlabs Load
    if (settings.slUrl) document.getElementById('sl-url').value = settings.slUrl;
    if (settings.slWidth) document.getElementById('sl-width').value = settings.slWidth;
    if (settings.slHeight) document.getElementById('sl-height').value = settings.slHeight;
});

// Templates
const YOUTUBE_CSS = `/* YouTube Chat Clean Style */
body { background-color: transparent !important; }
yt-live-chat-renderer { background-color: transparent !important; }

/* Hide Header & Footer */
yt-live-chat-header-renderer,
yt-live-chat-message-input-renderer,
yt-live-chat-ticker-renderer {
    display: none !important;
}

/* Chat Messages */
yt-live-chat-text-message-renderer {
    font-family: 'Sarabun', sans-serif;
    font-size: 24px !important;
    line-height: 1.5;
    text-shadow: 2px 2px 4px #000000;
}

/* Author Name */
#author-name {
    color: #ffeb3b !important;
    font-weight: bold;
}

/* Hide Avatars (Optional - uncomment to hide) */
/* #img { display: none !important; } */
`;

const TWITCH_CSS = `/* Twitch Chat Clean Style */
body { background-color: transparent !important; }
.chat-room { background: transparent !important; }

/* Hide Header & Input */
.stream-chat-header,
.chat-input,
.chat-input-tray {
    display: none !important;
}

/* Messages */
.chat-line__message {
    background: transparent !important;
    font-family: 'Sarabun', sans-serif;
    font-size: 20px !important;
    text-shadow: 1px 1px 2px black;
    color: white !important;
}
`;

document.getElementById('btn-preset-youtube').addEventListener('click', () => {
    document.getElementById('css').value = YOUTUBE_CSS;
});

document.getElementById('btn-preset-twitch').addEventListener('click', () => {
    document.getElementById('css').value = TWITCH_CSS;
});

document.getElementById('btn-preset-clear').addEventListener('click', () => {
    document.getElementById('css').value = '';
});
