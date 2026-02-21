// --- State ---

let sources = [];
let selectedSourceId = null;
let globalSettings = {
    menuShortcut: 'Shift+F1',
    toggleShortcut: 'Shift+F2',
    hideFromObs: false,
    language: 'en'
};

// --- DOM Elements ---
const sourceListEl = document.getElementById('source-list');
const propForm = document.getElementById('properties-form');
const noSelectionMsg = document.getElementById('no-selection-msg');
const launchBtn = document.getElementById('launch');
const closeBtn = document.getElementById('close-app');
const statusEl = document.getElementById('status');
const launchTipEl = document.getElementById('launch-tip');

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
    zoom: document.getElementById('prop-zoom'),
    interact: document.getElementById('prop-interact'),
    css: document.getElementById('prop-css')
};

const deleteSourceBtn = document.getElementById('delete-source-btn');

// Global Settings Inputs
const settingsInputs = {
    menuShortcut: document.getElementById('menu-shortcut'),
    toggleShortcut: document.getElementById('toggle-shortcut'),
    hideFromObs: document.getElementById('hide-from-obs'),
};

const customSelect = document.querySelector('.custom-select');
const customOptions = document.querySelectorAll('.custom-option');
const currentLangText = document.getElementById('current-lang-text');
const currentFlag = document.getElementById('current-flag');

// --- Helper: Real-time Update ---
let notifyTimeout;
function notifyMain() {
    if (notifyTimeout) clearTimeout(notifyTimeout);
    notifyTimeout = setTimeout(() => {
        if (window.api) {
            window.api.send('update-sources-realtime', {
                sources,
                settings: globalSettings
            });
        }
    }, 200);
}

// --- Localization ---
function updateLanguage(lang) {
    if (!translations[lang]) lang = 'en';
    const t = translations[lang];

    document.title = t.appTitle;
    document.querySelector('h1').innerText = "art " + t.appTitle; // Keeping existing logic
    document.querySelector('h1').innerHTML = "🎨 " + t.appTitle;

    document.querySelector('[data-tab="sources"]').innerText = t.tabSources;
    document.querySelector('[data-tab="settings"]').innerText = t.tabSettings;

    document.querySelector('.source-list-panel .panel-header h2').innerText = t.panelSources;
    document.getElementById('add-source-btn').innerText = t.btnAdd;
    document.getElementById('add-source-btn').title = t.btnAdd;

    document.querySelector('.properties-panel .panel-header h2').innerText = t.panelProperties;
    document.getElementById('no-selection-msg').innerText = t.msgNoSelection;

    // Explicit updates
    setLabelText('prop-name', t.labelName);
    setLabelText('prop-url', t.labelUrl);
    setLabelText('prop-width', t.labelWidth);
    setLabelText('prop-height', t.labelHeight);
    setLabelText('prop-x', t.labelX);
    setLabelText('prop-y', t.labelY);

    // Mute
    const muteLabel = document.querySelector('#prop-muted').parentNode;
    if (muteLabel) muteLabel.lastChild.textContent = " " + t.labelMute;

    // Interact
    const interactSpan = document.querySelector('#prop-interact ~ span');
    if (interactSpan) interactSpan.innerText = t.labelInteractive;

    updateLabelFor('prop-name', t.labelName);
    updateLabelFor('prop-url', t.labelUrl);
    updateLabelFor('prop-width', t.labelWidth);
    updateLabelFor('prop-height', t.labelHeight);
    updateLabelFor('prop-x', t.labelX);
    updateLabelFor('prop-y', t.labelY);

    // Audio label
    const audioGroup = document.querySelector('#prop-volume').closest('.form-group');
    if (audioGroup) audioGroup.querySelector('label').innerText = t.labelAudio;

    // Opacity
    const opacityLabel = document.querySelector('#prop-opacity').previousElementSibling;
    if (opacityLabel) {
        opacityLabel.firstChild.textContent = t.labelOpacity + ": ";
    }

    // Zoom
    const zoomLabel = document.querySelector('#prop-zoom').previousElementSibling;
    if (zoomLabel) {
        zoomLabel.firstChild.textContent = t.labelZoom + ": ";
    }

    // Custom CSS
    const cssGroup = document.querySelector('#prop-css').closest('.form-group');
    if (cssGroup) cssGroup.querySelector('label').innerText = t.labelCustomCss;

    // Settings Tab
    updateLabelFor('menu-shortcut', t.labelMenuShortcut);
    document.querySelector('#menu-shortcut ~ small').innerText = t.descMenuShortcut;

    updateLabelFor('toggle-shortcut', t.labelToggleShortcut);
    document.querySelector('#toggle-shortcut ~ small').innerText = t.descToggleShortcut;

    // Hide OBS
    const hideObsSpan = document.querySelector('#hide-from-obs ~ span');
    if (hideObsSpan) hideObsSpan.innerText = t.labelHideObs;
    document.querySelector('#hide-from-obs').closest('.form-group').querySelector('small').innerText = t.descHideObs;

    updateLabelFor('language-select', t.labelLanguage);

    // Update Section
    const updateTitle = document.getElementById('update-title');
    if (updateTitle) updateTitle.innerText = t.updateTitle;
    const checkUpdateBtn = document.getElementById('check-update-btn');
    if (checkUpdateBtn) checkUpdateBtn.innerText = t.btnCheckUpdate;
    const restartUpdateBtn = document.getElementById('restart-update-btn');
    if (restartUpdateBtn) restartUpdateBtn.innerText = t.btnRestart;

    // Update Custom Select Option Labels (Flags are static)
    // We need to map values because DOM doesn't have IDs for options easily.
    // Or just leave them alone? Languages names are usually static in their own language?
    // "English" is English. "ไทย" is Thai. 
    // Usually language selector names should NOT change with locale.
    // "English" should always be "English", not "Aannggkrit".
    // So we DON'T translate the option texts.
    // But we might need to translate the label "Language".

    // Tips
    document.querySelector('.tips-box h3').innerText = t.tipsTitle;
    const items = document.querySelectorAll('.tips-box ul li');
    if (items.length >= 3) {
        items[0].innerHTML = t.tip1;
        items[1].innerHTML = t.tip2;
        items[2].innerHTML = t.tip3;
    }

    // Launch Btn
    launchBtn.innerText = t.btnLaunch;

    // Delete Btn
    if (deleteSourceBtn) deleteSourceBtn.innerText = t.btnDelete;
    if (closeBtn && t.btnClose) {
        closeBtn.innerText = "❌ " + t.btnClose;
    }
}

function updateLabelFor(inputId, text) {
    let label = document.querySelector(`label[for="${inputId}"]`);
    if (!label) {
        const input = document.getElementById(inputId);
        if (input) {
            const parent = input.closest('.form-group');
            if (parent) {
                label = parent.querySelector('label');
            }
        }
    }
    if (label) label.innerText = text;
}

function setLabelText(inputId, text) {
    updateLabelFor(inputId, text);
}

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
        zoom: 1.0,
        interact: false,
        css: ''
    };
    sources.push(newSource);
    renderSourceList();
    selectSource(newSource.id);
    notifyMain();
}

function removeSource(id) {
    if (confirm('Are you sure you want to delete this source?')) {
        sources = sources.filter(s => s.id !== id);
        if (selectedSourceId === id) {
            selectSource(null);
        }
        renderSourceList();
        notifyMain();
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
    notifyMain();
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

    const opacity = source.opacity !== undefined ? source.opacity : 1.0;
    propInputs.opacity.value = Math.round(opacity * 100);
    document.getElementById('prop-opacity-val').innerText = Math.round(opacity * 100) + '%';

    const zoom = source.zoom !== undefined ? source.zoom : 1.0;
    propInputs.zoom.value = zoom;
    document.getElementById('prop-zoom-val').innerText = zoom.toFixed(1);

    propInputs.interact.checked = source.interact || false;
    propInputs.css.value = source.css || '';
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
    source.zoom = parseFloat(propInputs.zoom.value);

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

if (deleteSourceBtn) {
    deleteSourceBtn.addEventListener('click', () => {
        if (selectedSourceId) {
            removeSource(selectedSourceId);
        }
    });
}

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
        if (input === propInputs.zoom) {
            document.getElementById('prop-zoom-val').innerText = parseFloat(input.value).toFixed(1);
        }
        notifyMain();
    });
});

// Bind Settings
if (settingsInputs.menuShortcut) {
    settingsInputs.menuShortcut.addEventListener('input', (e) => {
        globalSettings.menuShortcut = e.target.value;
        notifyMain();
    });
}
if (settingsInputs.hideFromObs) {
    settingsInputs.hideFromObs.addEventListener('change', (e) => {
        globalSettings.hideFromObs = e.target.checked;
        notifyMain();
    });
}
if (settingsInputs.toggleShortcut) {
    settingsInputs.toggleShortcut.addEventListener('input', (e) => {
        globalSettings.toggleShortcut = e.target.value;
        notifyMain();
    });
}
// Language Custom Select Logic
if (customSelect) {
    const trigger = customSelect.querySelector('.custom-select__trigger');

    trigger.addEventListener('click', () => {
        customSelect.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
        }
    });

    customOptions.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.getAttribute('data-value');
            const flag = option.getAttribute('data-flag');
            const text = option.innerText.trim();

            globalSettings.language = value;
            updateLanguage(value);
            notifyMain();

            currentLangText.innerText = text;
            currentFlag.src = flag;

            customOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');

            customSelect.classList.remove('open');
        });
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
                notifyMain();
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
        tabContents.forEach(c => c.classList.remove('active'));

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

    if (window.api) {
        window.api.send('launch-overlay', {
            sources,
            settings: globalSettings
        });
    }

    // Show Launch Tip
    const menuKey = globalSettings.menuShortcut || 'Shift+F1';
    const toggleKey = globalSettings.toggleShortcut || 'Shift+F2';
    const tipMsg = getTranslation('msgLaunchTip')
        .replace('{menuKey}', menuKey)
        .replace('{toggleKey}', toggleKey);

    if (launchTipEl) {
        launchTipEl.innerHTML = tipMsg;
        launchTipEl.style.display = 'block';
        setTimeout(() => {
            launchTipEl.style.display = 'none';
        }, 5000);
    }

    setStatus('Overlay launched / updated!');
    setTimeout(() => {
        launchBtn.disabled = false;
        launchBtn.innerText = '🚀 Launch / Update Overlay';
    }, 2000);
});

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        if (window.api) {
            window.api.send('close-app');
        }
    });
}

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
            if (settingsInputs.toggleShortcut) settingsInputs.toggleShortcut.value = globalSettings.toggleShortcut || 'Shift+F2';
            if (settingsInputs.hideFromObs) settingsInputs.hideFromObs.checked = globalSettings.hideFromObs || false;

            if (globalSettings.language) {
                const lang = globalSettings.language;
                const option = document.querySelector(`.custom-option[data-value="${lang}"]`);
                if (option) {
                    currentLangText.innerText = option.innerText.trim();
                    currentFlag.src = option.getAttribute('data-flag');
                    customOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                }
            }
            updateLanguage(globalSettings.language || 'en');
        }

        if ((!sources || sources.length === 0) && data.url) {
            addSource();
            const s = sources[0];
            s.name = 'Legacy Chat';
            s.url = data.url;
            s.css = data.css;
            s.x = data.x;
            s.y = data.y;
            s.width = data.width;
            s.height = data.height;
            renderSourceList();
            notifyMain();
        }
    });

    window.api.on('sources-modified', (newSources) => {
        newSources.forEach(ns => {
            const local = sources.find(s => s.id === ns.id);
            if (local) {
                local.x = ns.x;
                local.y = ns.y;
                local.width = ns.width;
                local.height = ns.height;
            }
        });

        if (selectedSourceId) {
            const current = sources.find(s => s.id === selectedSourceId);
            if (current) loadSourceToForm(current);
        }
    });
}

// --- Update Logic ---

const updateStatusText = document.getElementById('update-status-text');
const updateProgress = document.getElementById('update-progress');
const downloadProgressBar = document.getElementById('download-progress-bar');
const restartUpdateBtn = document.getElementById('restart-update-btn');
const checkUpdateBtn = document.getElementById('check-update-btn');

if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', () => {
        if (window.api) {
            window.api.send('check-for-update');
            checkUpdateBtn.disabled = true;
            updateStatusText.innerText = getTranslation('msgChecking');
        }
    });
}

if (restartUpdateBtn) {
    restartUpdateBtn.addEventListener('click', () => {
        if (window.api) {
            window.api.send('quit-and-install');
        }
    });
}

if (window.api) {
    window.api.on('update-message', (data) => {
        // data: { state: string, message?: string, progress?: number }
        const t = (key) => {
             // get current language translation
             const lang = globalSettings.language || 'en';
             return translations[lang] ? (translations[lang][key] || translations['en'][key]) : translations['en'][key];
        };

        if (data.state === 'checking') {
             updateStatusText.innerText = t('msgChecking');
             checkUpdateBtn.disabled = true;
             updateProgress.style.display = 'none';
        } else if (data.state === 'update-available') {
             updateStatusText.innerText = t('msgUpdateAvailable');
             updateProgress.style.display = 'block';
             downloadProgressBar.style.width = '0%';
        } else if (data.state === 'update-not-available') {
             updateStatusText.innerText = t('msgUpdateNotAvailable');
             checkUpdateBtn.disabled = false;
             updateProgress.style.display = 'none';
        } else if (data.state === 'error') {
             updateStatusText.innerText = t('msgUpdateError') + (data.message ? ': ' + data.message : '');
             checkUpdateBtn.disabled = false;
             updateProgress.style.display = 'none';
        } else if (data.state === 'download-progress') {
             if (data.progress !== undefined) {
                 downloadProgressBar.style.width = data.progress + '%';
                 updateStatusText.innerText = t('msgUpdateAvailable') + ' ' + Math.round(data.progress) + '%';
             }
        } else if (data.state === 'update-downloaded') {
             updateStatusText.innerText = t('msgUpdateDownloaded');
             updateProgress.style.display = 'none';
             checkUpdateBtn.style.display = 'none';
             restartUpdateBtn.style.display = 'inline-block';
        }
    });
}

function getTranslation(key) {
    const lang = globalSettings.language || 'en';
    return translations[lang] ? (translations[lang][key] || translations['en'][key]) : translations['en'][key];
}
