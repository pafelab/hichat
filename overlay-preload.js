const { ipcRenderer } = require('electron');

let transformMode = false;
let trimMode = false;
let menuOpen = false;
let transformOverlay = null;

// State for Trim Mode
let cropValues = { top: 0, right: 0, bottom: 0, left: 0 };
let originalSize = { width: 0, height: 0 };

// CSS for the custom menu
const menuStyles = `
    #custom-menu-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2147483647;
        font-family: sans-serif;
    }

    .menu-bar {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background-color: #e8e4df;
        border-radius: 9999px; /* full rounded */
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); /* shadow-xl */
        font-size: 1.5rem; /* text-2xl */
        transition: all 0.3s;
    }

    .menu-bar:hover {
        transform: scaleX(1.05);
    }

    .menu-btn {
        position: relative;
        cursor: pointer;
        background-color: white;
        border-radius: 9999px;
        padding: 0.5rem 0.75rem; /* p-2 px-3 */
        border: none;
        outline: none;
        transition: all 0.3s;
        font-size: 1.5rem;
        line-height: 1;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .menu-btn:hover {
        transform: translateY(-1.25rem) scale(1.25); /* -translate-y-5 scale-125 */
        z-index: 10;
    }

    /* Tooltip using ::before */
    .menu-btn::before {
        content: attr(data-label);
        position: absolute;
        top: -1.75rem; /* -top-7 */
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        font-size: 0.6rem;
        height: 1rem;
        padding: 0 0.25rem;
        border-radius: 0.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
    }

    .menu-btn:hover::before {
        opacity: 1;
    }

    /* Dark mode override if needed, here hardcoded based on snippet logic but simplified */
    @media (prefers-color-scheme: dark) {
        .menu-bar {
            background-color: #191818;
        }
        .menu-btn {
            background-color: #191818;
        }
        .menu-btn::before {
            background-color: white;
            color: black;
        }
    }
`;

// CSS for the transform overlay
const overlayStyles = `
    #transform-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        border: 4px dashed #00b0ff;
        z-index: 99999;
        pointer-events: none;
    }
    
    .resize-handle {
        position: absolute;
        width: 20px;
        height: 20px;
        background-color: #00b0ff;
        pointer-events: auto;
    }
    
    .resize-handle.nw { top: -10px; left: -10px; cursor: nwse-resize; }
    .resize-handle.ne { top: -10px; right: -10px; cursor: nesw-resize; }
    .resize-handle.sw { bottom: -10px; left: -10px; cursor: nesw-resize; }
    .resize-handle.se { bottom: -10px; right: -10px; cursor: nwse-resize; }
    
    .move-handle {
        position: absolute;
        top: 10px;
        left: 10px;
        right: 10px;
        bottom: 10px;
        cursor: move;
        pointer-events: auto;
        background-color: rgba(0, 176, 255, 0.1);
    }

    #transform-close {
        position: absolute;
        top: 5px;
        right: 5px;
        background: red;
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        font-weight: bold;
        pointer-events: auto;
    }
    
    /* Trim Mode Styles */
    #trim-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        border: 4px dashed #00ff00; /* Green for Trim */
        z-index: 99999;
        pointer-events: none;
    }

    .trim-handle {
        position: absolute;
        background-color: #00ff00;
        pointer-events: auto;
    }
    
    /* Side handles for cropping */
    .trim-handle.n { top: -5px; left: 0; width: 100%; height: 10px; cursor: ns-resize; }
    .trim-handle.s { bottom: -5px; left: 0; width: 100%; height: 10px; cursor: ns-resize; }
    .trim-handle.w { left: -5px; top: 0; width: 10px; height: 100%; cursor: ew-resize; }
    .trim-handle.e { right: -5px; top: 0; width: 10px; height: 100%; cursor: ew-resize; }

    #trim-close {
        position: absolute;
        top: 5px;
        right: 5px;
        background: #00aa00;
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        font-weight: bold;
        pointer-events: auto;
    }

    /* Custom Menu Styles */
    #custom-menu-overlay {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(32, 34, 37, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 50px;
        padding: 8px 16px;
        display: flex;
        gap: 12px;
        z-index: 100000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        pointer-events: auto;
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
        from { transform: translate(-50%, 100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }

    .menu-btn {
        background: transparent;
        border: none;
        color: #dcddde;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .menu-btn:hover {
        background-color: rgba(255,255,255,0.1);
        color: #fff;
        transform: scale(1.1);
    }

    .menu-btn.active {
        color: #5865F2;
        background-color: rgba(88, 101, 242, 0.1);
    }

    .menu-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: #000;
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        margin-bottom: 8px;
        transition: opacity 0.2s;
    }

    .menu-btn:hover .menu-tooltip {
        opacity: 1;
    }
`;

function createCustomMenu() {
    if (document.getElementById('custom-menu-container')) return;

    // Inject Menu Styles
    if (!document.getElementById('menu-styles')) {
        const style = document.createElement('style');
        style.id = 'menu-styles';
        style.textContent = menuStyles;
        document.head.appendChild(style);
    }

    const container = document.createElement('div');
    container.id = 'custom-menu-container';

    const menuBar = document.createElement('div');
    menuBar.className = 'menu-bar';

    // Define buttons
    const buttons = [
        { label: 'Transform', icon: '↔️', action: () => toggleTransform(!transformMode) },
        { label: 'Trim', icon: '✂️', action: () => toggleTrim(!trimMode) },
        { label: 'Reset', icon: '🔄', action: () => {
            cropValues = { top: 0, right: 0, bottom: 0, left: 0 };
            const trimWrapper = document.getElementById('trim-content-wrapper');
            if (trimWrapper) {
                trimWrapper.style.setProperty('transform', 'translate(0px, 0px)', 'important');
            }
            location.reload();
        }},
        { label: 'Lock/Unlock', icon: '🔒', action: () => ipcRenderer.send('request-toggle-click-through') },
        { label: 'Close', icon: '❌', action: () => closeCustomMenu() }
    ];

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = 'menu-btn';
        button.dataset.label = btn.label;
        button.innerText = btn.icon;
        button.onclick = (e) => {
            e.stopPropagation();
            btn.action();
            // Optional: Close menu after action?
            // Usually context menus close after action.
            // But Transform/Trim might want to stay open?
            // Let's close it to mimic context menu behavior.
            if (btn.label !== 'Close') closeCustomMenu();
        };
        menuBar.appendChild(button);
    });

    container.appendChild(menuBar);
    document.body.appendChild(container);

    // Close on click outside
    const outsideClickListener = (e) => {
        if (!menuBar.contains(e.target)) {
            closeCustomMenu();
        }
    };

    // Delay adding listener to avoid immediate close
    setTimeout(() => {
        document.addEventListener('click', outsideClickListener);
    }, 50);

    // Store listener to remove later
    container._outsideClickListener = outsideClickListener;
}

function closeCustomMenu() {
    const container = document.getElementById('custom-menu-container');
    if (container) {
        document.removeEventListener('click', container._outsideClickListener);
        container.remove();
        ipcRenderer.send('menu-closed');
    }
}

function createTransformUI() {
    if (document.getElementById('transform-overlay')) return;
    injectStyles();

    transformOverlay = document.createElement('div');
    transformOverlay.id = 'transform-overlay';
    
    const moveHandle = document.createElement('div');
    moveHandle.className = 'move-handle';
    transformOverlay.appendChild(moveHandle);

    ['nw', 'ne', 'sw', 'se'].forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        handle.dataset.pos = pos;
        transformOverlay.appendChild(handle);
    });

    const closeBtn = document.createElement('button');
    closeBtn.id = 'transform-close';
    closeBtn.innerText = 'Done';
    closeBtn.onclick = () => toggleTransform(false);
    transformOverlay.appendChild(closeBtn);

    document.documentElement.appendChild(transformOverlay);

    setupDragEvents(moveHandle);
    setupResizeEvents();
}

function createTrimUI() {
    if (document.getElementById('trim-overlay')) return;
    injectStyles();

    // Lock Body Size if not already locked
    if (!trimMode) {
        originalSize.width = Math.max(window.innerWidth, document.documentElement.scrollWidth);
        originalSize.height = Math.max(window.innerHeight, document.documentElement.scrollHeight);
        applyTrimCSS();
    }

    const trimOverlay = document.createElement('div');
    trimOverlay.id = 'trim-overlay';

    ['n', 's', 'e', 'w'].forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `trim-handle ${pos}`;
        handle.dataset.pos = pos;
        trimOverlay.appendChild(handle);
    });

    const closeBtn = document.createElement('button');
    closeBtn.id = 'trim-close';
    closeBtn.innerText = 'Done';
    closeBtn.onclick = () => toggleTrim(false);
    trimOverlay.appendChild(closeBtn);

    document.documentElement.appendChild(trimOverlay);
    setupTrimEvents();
}

function createMenuUI() {
    if (document.getElementById('custom-menu-overlay')) return;
    injectStyles();

    const menu = document.createElement('div');
    menu.id = 'custom-menu-overlay';

    const items = [
        {
            icon: '📐',
            label: 'Transform (Resize Window)',
            action: () => toggleTransform(!transformMode),
            active: () => transformMode
        },
        {
            icon: '✂️',
            label: 'Trim (Crop Edges)',
            action: () => toggleTrim(!trimMode),
            active: () => trimMode
        },
        {
            icon: '🔄',
            label: 'Reset Trim',
            action: () => {
                cropValues = { top: 0, right: 0, bottom: 0, left: 0 };
                document.body.style.setProperty('transform', 'translate(0px, 0px)', 'important');
                toggleMenu(false);
            }
        },
        {
            icon: '🖱️',
            label: 'Toggle Click-Through',
            action: () => ipcRenderer.send('request-toggle-click-through')
        },
        {
            icon: '❌',
            label: 'Close Menu',
            action: () => toggleMenu(false)
        }
    ];

    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'menu-btn';
        if (item.active && item.active()) btn.classList.add('active');

        btn.innerHTML = `${item.icon}<div class="menu-tooltip">${item.label}</div>`;
        btn.onclick = item.action;

        menu.appendChild(btn);
    });

    document.documentElement.appendChild(menu);
}

function removeMenuUI() {
    const menu = document.getElementById('custom-menu-overlay');
    if (menu) menu.remove();
}

function injectStyles() {
    if (!document.getElementById('transform-styles')) {
        const style = document.createElement('style');
        style.id = 'transform-styles';
        style.textContent = overlayStyles;
        document.head.appendChild(style);
    }
}

function removeTransformUI() {
    const overlay = document.getElementById('transform-overlay');
    if (overlay) overlay.remove();
}

function removeTrimUI() {
    const overlay = document.getElementById('trim-overlay');
    if (overlay) overlay.remove();
}

function toggleTransform(active) {
    if (trimMode && active) toggleTrim(false);
    transformMode = active;
    if (active) createTransformUI();
    else removeTransformUI();
    // Refresh menu active states if open
    if (menuOpen) {
        removeMenuUI();
        createMenuUI();
    }
}

function toggleTrim(active) {
    if (transformMode && active) toggleTransform(false);
    
    if (active) {
        trimMode = true;
        createTrimUI();
    } else {
        trimMode = false;
        removeTrimUI();
    }
    // Refresh menu active states if open
    if (menuOpen) {
        removeMenuUI();
        createMenuUI();
    }
}

function toggleMenu(active) {
    menuOpen = active;
    if (active) {
        createMenuUI();
        ipcRenderer.send('menu-opened'); // Tell main to disable click-through
    } else {
        removeMenuUI();
        ipcRenderer.send('menu-closed'); // Tell main to enable click-through
    }
}

function applyTrimCSS() {
    // Apply styles directly to document.body instead of wrapping content
    // This fixes issues with YouTube Live Chat layout
    
    // Ensure HTML is hidden overflow
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    
    // Lock Body Size to original captured size
    document.body.style.setProperty('position', 'absolute', 'important');
    document.body.style.setProperty('width', `${originalSize.width}px`, 'important');
    document.body.style.setProperty('height', `${originalSize.height}px`, 'important');
    document.body.style.setProperty('left', '0', 'important');
    document.body.style.setProperty('top', '0', 'important');
    document.body.style.setProperty('margin', '0', 'important');
    document.body.style.setProperty('padding', '0', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');

    // Apply transform
    document.body.style.setProperty('transform', `translate(-${cropValues.left}px, -${cropValues.top}px)`, 'important');
}

// Dragging Logic (Transform)
function setupDragEvents(element) {
    let startX, startY;
    let rafId = null;
    let pendingDeltaX = 0;
    let pendingDeltaY = 0;

    const onMouseMove = (e) => {
        // Accumulate deltas directly
        pendingDeltaX += (e.screenX - startX);
        pendingDeltaY += (e.screenY - startY);

        startX = e.screenX;
        startY = e.screenY;

        if (!rafId) {
            rafId = requestAnimationFrame(() => {
                if (pendingDeltaX !== 0 || pendingDeltaY !== 0) {
                    ipcRenderer.send('overlay-move', { x: pendingDeltaX, y: pendingDeltaY });
                    pendingDeltaX = 0;
                    pendingDeltaY = 0;
                }
                rafId = null;
            });
        }
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        if (pendingDeltaX !== 0 || pendingDeltaY !== 0) {
            ipcRenderer.send('overlay-move', { x: pendingDeltaX, y: pendingDeltaY });
            pendingDeltaX = 0;
            pendingDeltaY = 0;
        }
    };

    element.addEventListener('mousedown', (e) => {
        startX = e.screenX;
        startY = e.screenY;
        document.body.style.cursor = 'move';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// Resizing Logic (Transform)
function setupResizeEvents() {
    const handles = document.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const pos = handle.dataset.pos;
            startResize(e, pos);
        });
    });
}

function startResize(e, pos) {
    let startX = e.screenX;
    let startY = e.screenY;
    
    let ticking = false;
    let latestScreenX = startX;
    let latestScreenY = startY;

    const onMouseMove = (ev) => {
        latestScreenX = ev.screenX;
        latestScreenY = ev.screenY;

        if (!ticking) {
            requestAnimationFrame(() => {
                const deltaX = latestScreenX - startX;
                const deltaY = latestScreenY - startY;

                if (deltaX !== 0 || deltaY !== 0) {
                    ipcRenderer.send('overlay-resize', { x: deltaX, y: deltaY, edge: pos });
                    startX = latestScreenX;
                    startY = latestScreenY;
                }
                ticking = false;
            });
            ticking = true;
        }
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// IPC Listeners from Menu
ipcRenderer.on('toggle-menu', () => createCustomMenu()); // New IPC for custom menu

ipcRenderer.on('toggle-transform', () => toggleTransform(!transformMode));
ipcRenderer.on('toggle-trim', () => toggleTrim(!trimMode));
ipcRenderer.on('toggle-menu', () => toggleMenu(!menuOpen)); // New Listener

ipcRenderer.on('reset-trim', () => {
    cropValues = { top: 0, right: 0, bottom: 0, left: 0 };
    document.body.style.setProperty('transform', 'translate(0px, 0px)', 'important');
});

ipcRenderer.on('toggle-click-through', () => {
    ipcRenderer.send('request-toggle-click-through');
});

// Trim Logic
function setupTrimEvents() {
    const handles = document.querySelectorAll('.trim-handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const pos = handle.dataset.pos;
            startTrim(e, pos);
        });
    });
}

function startTrim(e, pos) {
    let startX = e.screenX;
    let startY = e.screenY;
    
    // Throttling state
    let pendingTrimUpdate = { x: 0, y: 0, width: 0, height: 0 };
    let rafId = null;

    const flushTrimUpdate = () => {
        if (pendingTrimUpdate.x !== 0 || pendingTrimUpdate.y !== 0 || pendingTrimUpdate.width !== 0 || pendingTrimUpdate.height !== 0) {
            ipcRenderer.send('trim-resize', pendingTrimUpdate);
            pendingTrimUpdate = { x: 0, y: 0, width: 0, height: 0 };
        }
        rafId = null;
    };

    const onMouseMove = (ev) => {
        const deltaX = ev.screenX - startX;
        const deltaY = ev.screenY - startY;

        let currentDelta = { x: 0, y: 0, width: 0, height: 0 };
        
        if (pos === 'w') {
            cropValues.left += deltaX;
            currentDelta.x = deltaX;
            currentDelta.width = -deltaX;
            document.body.style.setProperty('transform', `translate(-${cropValues.left}px, -${cropValues.top}px)`, 'important');
        } else if (pos === 'e') {
            cropValues.right -= deltaX; 
            currentDelta.width = deltaX;
        } else if (pos === 'n') {
            cropValues.top += deltaY;
            currentDelta.y = deltaY;
            currentDelta.height = -deltaY;
            document.body.style.setProperty('transform', `translate(-${cropValues.left}px, -${cropValues.top}px)`, 'important');
        } else if (pos === 's') {
            currentDelta.height = deltaY;
        }

        pendingTrimUpdate.x += currentDelta.x;
        pendingTrimUpdate.y += currentDelta.y;
        pendingTrimUpdate.width += currentDelta.width;
        pendingTrimUpdate.height += currentDelta.height;

        if (!rafId) {
            rafId = requestAnimationFrame(flushTrimUpdate);
        }

        startX = ev.screenX;
        startY = ev.screenY;
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        flushTrimUpdate();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}
