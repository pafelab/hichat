const { ipcRenderer } = require('electron');

let sources = [];
let editMode = false;
let menuOpen = false;

const canvas = document.getElementById('overlay-canvas');

// --- IPC Listeners ---

ipcRenderer.on('update-sources', (event, newSources) => {
    sources = newSources;
    renderSources();
});

ipcRenderer.on('toggle-edit-mode', (event, active) => {
    editMode = active;
    document.body.classList.toggle('editing-mode', active);
    renderSources(); // Re-render to show/hide handles
});

ipcRenderer.on('toggle-menu', () => {
    toggleMenu(!menuOpen);
});

// --- Rendering ---

function renderSources() {
    // Naive re-render: clear and rebuild.
    // Optimization: Diffing by ID would be better, but MVP first.

    // existing wrappers
    const existingWrappers = Array.from(document.querySelectorAll('.source-wrapper'));
    const existingIds = existingWrappers.map(el => el.dataset.id);
    const newIds = sources.map(s => s.id);

    // Remove deleted
    existingWrappers.forEach(el => {
        if (!newIds.includes(el.dataset.id)) {
            el.remove();
        }
    });

    // Add or Update
    sources.forEach(source => {
        let wrapper = document.querySelector(`.source-wrapper[data-id="${source.id}"]`);
        let webview;

        if (!wrapper) {
            // Create New
            wrapper = document.createElement('div');
            wrapper.className = 'source-wrapper';
            wrapper.dataset.id = source.id;

            // Webview
            webview = document.createElement('webview');
            webview.src = source.url;
            webview.setAttribute('allowpopups', 'yes');
            webview.setAttribute('webpreferences', 'contextIsolation=no'); // Assuming we want some access, or strictly isolated?
            // Actually, for custom CSS we need to wait for dom-ready

            webview.addEventListener('dom-ready', () => {
                if (source.css) {
                    webview.insertCSS(source.css);
                }
                if (source.audio) {
                    webview.setAudioMuted(source.audio.muted);
                    // Volume injection could happen here
                }
            });

            // Append
            wrapper.appendChild(webview);

            // Source Header (Drag Handle + Name + Opacity Control)
            const header = document.createElement('div');
            header.className = 'source-header';

            // Inline styles for header (can be moved to CSS for better management, but keeping inline for simplicity here)
            Object.assign(header.style, {
                position: 'absolute',
                top: '-28px',
                left: '0',
                minWidth: '120px',
                height: '28px',
                background: '#202225', // Discord-like dark
                color: '#dcddde',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                cursor: 'move', // Entire header is drag handle
                zIndex: '100',
                borderRadius: '4px 4px 0 0',
                fontSize: '12px',
                userSelect: 'none',
                gap: '8px',
                boxShadow: '0 -2px 5px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderBottom: 'none'
            });

            // Burger Icon
            const burger = document.createElement('span');
            burger.innerHTML = '☰';
            burger.style.fontSize = '14px';
            burger.style.opacity = '0.7';
            header.appendChild(burger);

            // Title
            const title = document.createElement('span');
            title.className = 'source-title';
            title.innerText = source.name || 'Source';
            title.style.fontWeight = '600';
            title.style.whiteSpace = 'nowrap';
            title.style.overflow = 'hidden';
            title.style.textOverflow = 'ellipsis';
            title.style.maxWidth = '150px';
            header.appendChild(title);

            // Opacity Slider (Mini)
            const opacityContainer = document.createElement('div');
            opacityContainer.style.display = 'flex';
            opacityContainer.style.alignItems = 'center';
            opacityContainer.style.marginLeft = 'auto'; // Push to right
            opacityContainer.title = 'Opacity';

            const opacityIcon = document.createElement('span');
            opacityIcon.innerText = '👁️';
            opacityIcon.style.fontSize = '10px';
            opacityIcon.style.marginRight = '4px';
            opacityContainer.appendChild(opacityIcon);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '100';
            slider.value = (source.opacity !== undefined ? source.opacity * 100 : 100);
            slider.style.width = '60px';
            slider.style.height = '4px';

            slider.addEventListener('mousedown', (e) => e.stopPropagation()); // Prevent drag
            slider.addEventListener('input', (e) => {
                const opacity = parseInt(e.target.value) / 100;
                // Apply opacity to webview/wrapper immediately
                wrapper.style.opacity = opacity;

                // Debounce update to main
                if (source._opacityTimeout) clearTimeout(source._opacityTimeout);
                source._opacityTimeout = setTimeout(() => {
                    const s = sources.find(src => src.id === source.id);
                    if (s) {
                        s.opacity = opacity;
                        notifyUpdate();
                    }
                }, 200);
            });

            opacityContainer.appendChild(slider);
            header.appendChild(opacityContainer);

            wrapper.appendChild(header);

            // Handles
            ['nw', 'ne', 'sw', 'se'].forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${pos}`;
                handle.dataset.pos = pos;
                wrapper.appendChild(handle);
            });

            canvas.appendChild(wrapper);

            // Drag Events
            setupDragEvents(wrapper, dragHandle);
            // Resize Events are handled by global delegation or specific bind?
            // Since we rebuild, let's bind to handles inside wrapper
            const handles = wrapper.querySelectorAll('.resize-handle');
            handles.forEach(h => setupResizeEvents(h, wrapper));
        } else {
            webview = wrapper.querySelector('webview');
            // Update URL if changed? (Avoid reload if same)
            if (webview.src !== source.url && source.url) {
                webview.src = source.url;
            }
        }

        // Apply Properties
        wrapper.style.left = `${source.x}px`;
        wrapper.style.top = `${source.y}px`;
        wrapper.style.width = `${source.width}px`;
        wrapper.style.height = `${source.height}px`;
        wrapper.style.zIndex = source.zIndex;
        if (source.opacity !== undefined) {
             wrapper.style.opacity = source.opacity;
        }
        wrapper.dataset.name = source.name || 'Source';

        // Interactive Mode
        if (source.interact && !editMode) {
             wrapper.classList.add('interactive');
             wrapper.style.pointerEvents = 'auto';
        } else {
             wrapper.classList.remove('interactive');
             // pointer-events handled by css .editing
        }

        // Audio Update
        if (webview && source.audio) {
            webview.setAudioMuted(source.audio.muted);
            // Volume hack
            if (!source.audio.muted) {
                 webview.executeJavaScript(`
                    document.querySelectorAll('video, audio').forEach(el => el.volume = ${source.audio.volume / 100});
                 `).catch(() => {});
            }
        }

        // Edit Mode Class
        if (editMode) {
            wrapper.classList.add('editing');
        } else {
            wrapper.classList.remove('editing');
        }
    });
}

// --- Interaction Logic ---

function setupDragEvents(wrapper, handle) {
    let startX, startY, startLeft, startTop;

    // Attach to handle specifically, or entire wrapper in edit mode?
    // Let's attach to handle ALWAYS (even outside edit mode if desired, but user said "when edit mode" in general, but the handle implies persistent).
    // Let's make the handle ALWAYS drag the window if it's visible.
    // If handle is only visible in edit mode (due to css), then it works.
    // But currently handle is always appended. Let's make it respect edit mode or allow drag.
    // User requested "add burger... drag position".

    const onMouseDown = (e) => {
        if (!editMode) return; // Only allow drag in edit mode? Or always via handle?
        // Typically handles are for edit mode. Let's stick to edit mode for safety unless requested otherwise.

        e.preventDefault();
        e.stopPropagation();

        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(wrapper.style.left || 0);
        startTop = parseInt(wrapper.style.top || 0);

        const onMouseMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            const newX = startLeft + dx;
            const newY = startTop + dy;

            wrapper.style.left = `${newX}px`;
            wrapper.style.top = `${newY}px`;

            // Update local model
            const id = wrapper.dataset.id;
            const source = sources.find(s => s.id === id);
            if (source) {
                source.x = newX;
                source.y = newY;
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            // Notify Main to save
            notifyUpdate();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Attach to handle for dragging
    if (handle) {
        handle.addEventListener('mousedown', onMouseDown);
    }

    // Also attach to wrapper body if in edit mode (legacy behavior)
    wrapper.addEventListener('mousedown', (e) => {
        // If clicking on resize handle or burger handle, ignore here (handled there)
        if (e.target.classList.contains('resize-handle') || e.target.closest('.drag-handle-icon')) return;

        // If strict mode, maybe only handle? But for usability, body drag in edit mode is good.
        onMouseDown(e);
    });
}

function setupResizeEvents(handle, wrapper) {
    handle.addEventListener('mousedown', (e) => {
        if (!editMode) return;
        e.preventDefault();
        e.stopPropagation();

        const pos = handle.dataset.pos;
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parseInt(wrapper.style.width || 400);
        const startHeight = parseInt(wrapper.style.height || 300);
        const startLeft = parseInt(wrapper.style.left || 0);
        const startTop = parseInt(wrapper.style.top || 0);

        const onMouseMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            let newW = startWidth;
            let newH = startHeight;
            let newX = startLeft;
            let newY = startTop;

            if (pos.includes('e')) newW = startWidth + dx;
            if (pos.includes('s')) newH = startHeight + dy;
            if (pos.includes('w')) {
                newW = startWidth - dx;
                newX = startLeft + dx;
            }
            if (pos.includes('n')) {
                newH = startHeight - dy;
                newY = startTop + dy;
            }

            if (newW < 50) newW = 50;
            if (newH < 50) newH = 50;

            wrapper.style.width = `${newW}px`;
            wrapper.style.height = `${newH}px`;
            wrapper.style.left = `${newX}px`;
            wrapper.style.top = `${newY}px`;

            // Update model
            const id = wrapper.dataset.id;
            const source = sources.find(s => s.id === id);
            if (source) {
                source.width = newW;
                source.height = newH;
                source.x = newX;
                source.y = newY;
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            notifyUpdate();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

function notifyUpdate() {
    ipcRenderer.send('sources-modified', sources);
}

// --- Menu Logic ---

// Reusing the style injection and menu creation logic from overlay-preload.js
// but simplified for this context.

const menuStyles = `
    #custom-menu-container {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        font-family: sans-serif;
        pointer-events: auto;
    }

    .menu-bar {
        display: flex;
        gap: 10px;
        padding: 10px 20px;
        background-color: rgba(32, 34, 37, 0.9);
        border-radius: 50px;
        backdrop-filter: blur(5px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }

    .menu-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 5px;
        border-radius: 50%;
        transition: transform 0.2s, background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
    }

    .menu-btn:hover {
        transform: scale(1.1);
        background: rgba(255,255,255,0.1);
    }

    .menu-btn.active {
        color: #00b0ff;
        background: rgba(0, 176, 255, 0.1);
    }
`;

function toggleMenu(show) {
    menuOpen = show;
    editMode = show; // Automatically toggle edit mode with menu
    renderSources(); // Apply visual changes

    let container = document.getElementById('custom-menu-container');

    if (show) {
        if (!container) {
            // Inject Styles
            if (!document.getElementById('menu-styles')) {
                const style = document.createElement('style');
                style.id = 'menu-styles';
                style.textContent = menuStyles;
                document.head.appendChild(style);
            }

            container = document.createElement('div');
            container.id = 'custom-menu-container';

            const bar = document.createElement('div');
            bar.className = 'menu-bar';

            const btns = [
                {
                    icon: '📐',
                    action: () => {
                        editMode = !editMode;
                        renderSources();
                        updateMenuState();
                    },
                    active: () => editMode
                },
                {
                    icon: '❌',
                    action: () => toggleMenu(false)
                }
            ];

            btns.forEach(b => {
                const btn = document.createElement('button');
                btn.className = 'menu-btn';
                if (b.active && b.active()) btn.classList.add('active');
                btn.innerHTML = b.icon;
                btn.onclick = b.action;
                bar.appendChild(btn);
            });

            container.appendChild(bar);
            document.body.appendChild(container);
        }

        // Notify main to enable mouse events if they were disabled
        ipcRenderer.send('menu-opened');

    } else {
        if (container) container.remove();
        // Check if we can restore click-through
        // If editMode is on, we might still want interaction?
        // No, typically if menu closes, we go back to normal unless in edit mode.
        // If Edit Mode is ON, we must keep mouse events enabled!
        if (!editMode) {
             ipcRenderer.send('menu-closed');
        }
    }
}

function updateMenuState() {
    const container = document.getElementById('custom-menu-container');
    if (!container) return;
    // lazy redraw
    container.remove();
    toggleMenu(true);
}
