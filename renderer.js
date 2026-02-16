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
    if (window.api) {
        window.api.send('launch-overlay', {
            url, css, x, y, width, height, zoom, menuShortcut, hideFromObs,
            slUrl, slWidth, slHeight, slZoom, slCss
        });
    } else {
        console.warn('Electron API not available');
    }

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
if (window.api) {
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
}

// --- Coordinate Pad Logic ---
function setupCoordinatePad() {
    const pad = document.getElementById('xy-pad');
    const xInput = document.getElementById('x');
    const yInput = document.getElementById('y');

    if (!pad || !xInput || !yInput) return;

    let isDragging = false;
    let startX, startY;

    pad.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        document.body.style.cursor = 'move';
        pad.classList.add('active'); // Visual feedback if needed
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (dx !== 0 || dy !== 0) {
            let currentX = parseInt(xInput.value) || 0;
            let currentY = parseInt(yInput.value) || 0;

            xInput.value = currentX + dx;
            yInput.value = currentY + dy;

            // Reset start to current to accumulate changes (relative drag)
            startX = e.clientX;
            startY = e.clientY;
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
            pad.classList.remove('active');
        }
    });
}

// --- CSS Syntax Highlighter ---
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function highlightCSS(code) {
    let html = '';
    let i = 0;
    const len = code.length;

    while (i < len) {
        // Comments /* ... */
        if (code.startsWith('/*', i)) {
            const end = code.indexOf('*/', i + 2);
            const content = (end === -1) ? code.slice(i) : code.slice(i, end + 2);
            html += '<span class="token-comment">' + escapeHtml(content) + '</span>';
            i += content.length;
            continue;
        }

        // Strings "..." or '...'
        if (code[i] === '"' || code[i] === "'") {
            const quote = code[i];
            let end = i + 1;
            while (end < len && (code[end] !== quote || code[end-1] === '\\')) { // Simple escape check
                end++;
            }
            if (end < len) end++;
            const content = code.slice(i, end);
            html += '<span class="token-string">' + escapeHtml(content) + '</span>';
            i += content.length;
            continue;
        }

        // Punctuation
        if ('{}:;'.includes(code[i])) {
            html += '<span class="token-punctuation">' + escapeHtml(code[i]) + '</span>';
            i++;
            continue;
        }

        // Whitespace
        if (/\s/.test(code[i])) {
            html += code[i];
            i++;
            continue;
        }

        // Word (Selector, Property, Value)
        let j = i;
        while (j < len && !' \t\n\r{}:;/"\''.includes(code[j])) {
            j++;
        }
        const word = code.slice(i, j);

        // Simple context heuristic
        let k = j;
        while (k < len && /\s/.test(code[k])) k++;

        let type = 'token-value';

        if (word.startsWith('.') || word.startsWith('#') || (k < len && code[k] === '{')) {
            type = 'token-selector';
        } else if (k < len && code[k] === ':') {
            // Check if we are inside a declaration block? Hard to know.
            // But usually 'property:'
            type = 'token-property';
        } else {
            type = 'token-value';
        }

        html += '<span class="' + type + '">' + escapeHtml(word) + '</span>';
        i = j;
    }

    // Ensure trailing newlines render in pre
    if (code.endsWith('\n')) {
        html += ' ';
    }

    return html;
}

function setupSyntaxHighlighter() {
    const editors = [
        { input: 'css', highlight: 'css-highlight' },
        { input: 'sl-css', highlight: 'sl-css-highlight' }
    ];

    editors.forEach(editor => {
        const textarea = document.getElementById(editor.input);
        const code = document.getElementById(editor.highlight);

        if (!textarea || !code) return;

        const update = () => {
            code.innerHTML = highlightCSS(textarea.value);
            // Sync scroll
            code.scrollTop = textarea.scrollTop;
            code.scrollLeft = textarea.scrollLeft;
        };

        textarea.addEventListener('input', update);
        textarea.addEventListener('scroll', () => {
             code.scrollTop = textarea.scrollTop;
             code.scrollLeft = textarea.scrollLeft;
        });

        // Sync initially and on preset buttons
        update();

        // Hook into preset buttons for #css
        if (editor.input === 'css') {
            const btns = document.querySelectorAll('.preset-buttons button');
            btns.forEach(btn => btn.addEventListener('click', () => setTimeout(update, 0)));
        }
    });
}

// Initialize features
document.addEventListener('DOMContentLoaded', () => {
    setupCoordinatePad();
    setupSyntaxHighlighter();
});

// Also run setup immediately in case DOM is already ready (script at end of body)
setupCoordinatePad();
setupSyntaxHighlighter();
