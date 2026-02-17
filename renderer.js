// --- State ---
let sources = [];
let selectedSourceId = null;
let globalSettings = {
    menuShortcut: 'Shift+F1',
    hideFromObs: false
};

// --- DOM Elements ---
const sourceListEl = document.getElementById('source-list');
const propForm = document.getElementById('properties-form');
const noSelectionMsg = document.getElementById('no-selection-msg');
const launchBtn = document.getElementById('launch');
const statusEl = document.getElementById('status');

// Property Inputs
const propInputs = {
    name: document.getElementById('prop-name'),
    url: document.getElementById('prop-url'),
    width: document.getElementById('prop-width'),
    height: document.getElementById('prop-height'),
    x: document.getElementById('prop-x'),
    y: document.getElementById('prop-y'),
    muted: document.getElementById('prop-muted'),
    volume: document.getElementById('prop-volume'),
    opacity: document.getElementById('prop-opacity'),
    interact: document.getElementById('prop-interact'),
    css: document.getElementById('prop-css')
};

// Global Settings Inputs
const settingsInputs = {
    menuShortcut: document.getElementById('menu-shortcut'),
    hideFromObs: document.getElementById('hide-from-obs')
};

// --- Helper Functions ---
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function setStatus(msg, isError = false) {
    statusEl.innerText = msg;
    statusEl.className = isError ? 'error' : '';
    setTimeout(() => {
        statusEl.innerText = '';
        statusEl.className = '';
    }, 3000);
}

// --- Source Management ---

function addSource() {
    const newSource = {
        id: generateId(),
        name: 'New Source',
        url: '',
        width: 400,
        height: 600,
        x: 50,
        y: 50,
        zIndex: sources.length + 1,
        audio: { muted: false, volume: 100 },
        opacity: 1.0,
        interact: false,
        css: ''
    };
    sources.push(newSource);
    renderSourceList();
    selectSource(newSource.id);
}

function removeSource(id) {
    if (confirm('Are you sure you want to delete this source?')) {
        sources = sources.filter(s => s.id !== id);
        if (selectedSourceId === id) {
            selectSource(null);
        }
        renderSourceList();
    }
}

function moveSource(direction) {
    if (!selectedSourceId) return;
    const idx = sources.findIndex(s => s.id === selectedSourceId);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
        // Swap with previous
        [sources[idx], sources[idx - 1]] = [sources[idx - 1], sources[idx]];
    } else if (direction === 'down' && idx < sources.length - 1) {
        // Swap with next
        [sources[idx], sources[idx + 1]] = [sources[idx + 1], sources[idx]];
    }

    // Update Z-Index based on new order
    sources.forEach((s, i) => s.zIndex = i + 1);

    renderSourceList();
}

function selectSource(id) {
    selectedSourceId = id;
    renderSourceList(); // Update active class

    if (id) {
        const source = sources.find(s => s.id === id);
        if (source) {
            loadSourceToForm(source);
            propForm.style.display = 'block';
            noSelectionMsg.style.display = 'none';
        }
    } else {
        propForm.style.display = 'none';
        noSelectionMsg.style.display = 'block';
    }
}

function loadSourceToForm(source) {
    propInputs.name.value = source.name || '';
    propInputs.url.value = source.url || '';
    propInputs.width.value = source.width || 400;
    propInputs.height.value = source.height || 600;
    propInputs.x.value = source.x || 0;
    propInputs.y.value = source.y || 0;
    propInputs.muted.checked = source.audio?.muted || false;
    propInputs.volume.value = source.audio?.volume || 100;
    document.getElementById('prop-volume-val').innerText = (source.audio?.volume || 100) + '%';

    // Opacity
    const opacity = source.opacity !== undefined ? source.opacity : 1.0;
    propInputs.opacity.value = Math.round(opacity * 100);
    document.getElementById('prop-opacity-val').innerText = Math.round(opacity * 100) + '%';

    propInputs.interact.checked = source.interact || false;
    propInputs.css.value = source.css || '';

    // Trigger highlight update if needed
    if (document.getElementById('css-highlight')) {
        // highlightCSS(source.css || ''); // If syntax highlighter exists
    }
}

function updateSelectedSourceFromForm() {
    if (!selectedSourceId) return;
    const source = sources.find(s => s.id === selectedSourceId);
    if (!source) return;

    source.name = propInputs.name.value;
    source.url = propInputs.url.value;
    source.width = parseInt(propInputs.width.value) || 100;
    source.height = parseInt(propInputs.height.value) || 100;
    source.x = parseInt(propInputs.x.value) || 0;
    source.y = parseInt(propInputs.y.value) || 0;
    source.interact = propInputs.interact.checked;
    source.css = propInputs.css.value;

    if (!source.audio) source.audio = {};
    source.audio.muted = propInputs.muted.checked;
    source.audio.volume = parseInt(propInputs.volume.value);

    source.opacity = parseInt(propInputs.opacity.value) / 100;

    // Update list name if changed
    const item = document.querySelector(`.source-item[data-id="${selectedSourceId}"] .source-name`);
    if (item) item.innerText = source.name;
}

function renderSourceList() {
    sourceListEl.innerHTML = '';
    sources.forEach((source, index) => {
        const li = document.createElement('li');
        li.className = `source-item ${source.id === selectedSourceId ? 'active' : ''}`;
        li.dataset.id = source.id;
        li.onclick = () => selectSource(source.id);

        li.innerHTML = `
            <span class="source-name">${source.name || 'Source'}</span>
            <div class="source-actions">
                <button class="icon-btn delete-btn" title="Remove">🗑️</button>
            </div>
        `;

        // Stop propagation for delete
        const delBtn = li.querySelector('.delete-btn');
        delBtn.onclick = (e) => {
            e.stopPropagation();
            removeSource(source.id);
        };

        sourceListEl.appendChild(li);
    });
}

// --- Event Listeners ---

document.getElementById('add-source-btn').addEventListener('click', addSource);
document.getElementById('move-up-btn').addEventListener('click', () => moveSource('up'));
document.getElementById('move-down-btn').addEventListener('click', () => moveSource('down'));

// Bind Inputs
Object.values(propInputs).forEach(input => {
    input.addEventListener('input', () => {
        updateSelectedSourceFromForm();
        if (input === propInputs.volume) {
            document.getElementById('prop-volume-val').innerText = input.value + '%';
        }
        if (input === propInputs.opacity) {
            document.getElementById('prop-opacity-val').innerText = input.value + '%';
        }
    });
});

// Bind Settings
if (settingsInputs.menuShortcut) {
    settingsInputs.menuShortcut.addEventListener('input', (e) => {
        globalSettings.menuShortcut = e.target.value;
    });
}
if (settingsInputs.hideFromObs) {
    settingsInputs.hideFromObs.addEventListener('change', (e) => {
        globalSettings.hideFromObs = e.target.checked;
    });
}

// CSS Presets
const PRESETS = {
    yt: `/* YouTube Chat Minimalist */
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
}`,
    sl: `body { background: transparent; overflow: hidden; }`
};

['yt', 'twitch', 'sl'].forEach(key => {
    const btn = document.getElementById(`preset-${key}`);
    if (btn) {
        btn.addEventListener('click', () => {
            if (selectedSourceId) {
                propInputs.css.value = PRESETS[key];
                updateSelectedSourceFromForm();
            }
        });
    }
});

// Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active')); // use class instead of style display for css animation

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');
    });
});

// Launch Button
launchBtn.addEventListener('click', () => {
    if (sources.length === 0) {
        setStatus('Please add at least one source.', true);
        return;
    }

    launchBtn.disabled = true;
    launchBtn.innerText = '🚀 Launching...';

    // Send to Main
    if (window.api) {
        window.api.send('launch-overlay', {
            sources,
            settings: globalSettings
        });
    }

    setStatus('Overlay launched / updated!');
    setTimeout(() => {
        launchBtn.disabled = false;
        launchBtn.innerText = '🚀 Launch / Update Overlay';
    }, 2000);
});

// --- IPC Inbound ---

if (window.api) {
    window.api.on('load-settings', (data) => {
        if (data.sources) {
            sources = data.sources;
            renderSourceList();
        }
        if (data.settings) {
            globalSettings = data.settings;
            if (settingsInputs.menuShortcut) settingsInputs.menuShortcut.value = globalSettings.menuShortcut || 'Shift+F1';
            if (settingsInputs.hideFromObs) settingsInputs.hideFromObs.checked = globalSettings.hideFromObs || false;
        }

        // Legacy Config Migration (if needed)
        // If sources is empty but we have 'url' in data, migrate it.
        if ((!sources || sources.length === 0) && data.url) {
            addSource(); // Add default
            const s = sources[0];
            s.name = 'Legacy Chat';
            s.url = data.url;
            s.css = data.css;
            s.x = data.x;
            s.y = data.y;
            s.width = data.width;
            s.height = data.height;
            renderSourceList();
        }
    });

    window.api.on('sources-modified', (newSources) => {
        // Update local state from Overlay changes (drag/resize)
        // We merge carefully to avoid overwriting current form edits if possible
        // But for simplicity, we just update position/size

        newSources.forEach(ns => {
            const local = sources.find(s => s.id === ns.id);
            if (local) {
                local.x = ns.x;
                local.y = ns.y;
                local.width = ns.width;
                local.height = ns.height;
            }
        });

        // Refresh form if open
        if (selectedSourceId) {
            const current = sources.find(s => s.id === selectedSourceId);
            if (current) loadSourceToForm(current);
        }
    });
}
