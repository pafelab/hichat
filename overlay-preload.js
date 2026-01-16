const { ipcRenderer } = require('electron');

let transformMode = false;
let trimMode = false;
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
    // If starting trim mode, we capture the current size as the "Source Size"
    if (!trimMode) {
        // Use scrollWidth/Height to capture full content size if larger than window
        // But typically we want the current visible viewport to be locked.
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
    if (trimMode && active) toggleTrim(false); // Exclusive modes
    transformMode = active;
    if (active) createTransformUI();
    else removeTransformUI();
}

function toggleTrim(active) {
    if (transformMode && active) toggleTransform(false); // Exclusive modes
    
    // Logic for initializing trim state is inside createTrimUI to handle toggling
    if (active) {
        trimMode = true;
        createTrimUI();
    } else {
        // We keep trimMode = true logic-wise? 
        // No, user wants to "Apply" and hide UI.
        // But the "Crop" effect must persist.
        // So we remove UI but don't reset variables.
        trimMode = false; // "Mode" is off (UI hidden), but effect persists.
        removeTrimUI();
    }
}
function applyTrimCSS() {
    // Create a wrapper div that will hold all content and apply the crop
    let trimWrapper = document.getElementById('trim-content-wrapper');
    
    if (!trimWrapper) {
        // First time - wrap all body content
        trimWrapper = document.createElement('div');
        trimWrapper.id = 'trim-content-wrapper';
        
        // Move all body children into wrapper
        while (document.body.firstChild) {
            trimWrapper.appendChild(document.body.firstChild);
        }
        document.body.appendChild(trimWrapper);
    }
    
    // Style the wrapper to freeze content and apply crop offset
    trimWrapper.style.setProperty('position', 'fixed', 'important');
    trimWrapper.style.setProperty('width', `${originalSize.width}px`, 'important');
    trimWrapper.style.setProperty('height', `${originalSize.height}px`, 'important');
    trimWrapper.style.setProperty('left', '0', 'important');
    trimWrapper.style.setProperty('top', '0', 'important');
    trimWrapper.style.setProperty('transform', `translate(-${cropValues.left}px, -${cropValues.top}px)`, 'important');
    trimWrapper.style.setProperty('overflow', 'hidden', 'important');
    
    // Prevent body from scrolling or resizing
    document.body.style.setProperty('margin', '0', 'important');
    document.body.style.setProperty('padding', '0', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
}

// Dragging Logic (Transform)
function setupDragEvents(element) {
    let isDragging = false;
    let startX, startY;

    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.screenX;
        startY = e.screenY;
        document.body.style.cursor = 'move';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.screenX - startX;
        const deltaY = e.screenY - startY;
        ipcRenderer.send('overlay-move', { x: deltaX, y: deltaY });
        startX = e.screenX;
        startY = e.screenY;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.cursor = 'default';
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
    
    const onMouseMove = (ev) => {
        const deltaX = ev.screenX - startX;
        const deltaY = ev.screenY - startY;
        ipcRenderer.send('overlay-resize', { x: deltaX, y: deltaY, edge: pos });
        startX = ev.screenX;
        startY = ev.screenY;
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

ipcRenderer.on('reset-trim', () => {
    cropValues = { top: 0, right: 0, bottom: 0, left: 0 };
    const trimWrapper = document.getElementById('trim-content-wrapper');
    if (trimWrapper) {
        trimWrapper.style.setProperty('transform', 'translate(0px, 0px)', 'important');
    }
});

ipcRenderer.on('toggle-click-through', () => {
    // We need to ask main process to toggle the window state
    // But since main sent this to us, it expects us to handle it or bounce it back with state?
    // Let's assume we maintain the state here or just ask main to toggle.
    // For simplicity, let's send a message to main to toggle.
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
    
    const onMouseMove = (ev) => {
        const deltaX = ev.screenX - startX;
        const deltaY = ev.screenY - startY;

        // Logic:
        // If 'w' (left handle):
        //   Dragging Right (+x): Crop Left increases. Window X increases. Window Width decreases.
        //   Dragging Left (-x): Crop Left decreases. Window X decreases. Window Width increases.
        // If 'e' (right handle):
        //   Dragging Right (+x): Window Width increases.
        //   Dragging Left (-x): Window Width decreases.
        
        // We calculate delta to apply to crop
        let trimUpdate = { x: 0, y: 0, width: 0, height: 0 };
        
        if (pos === 'w') {
            cropValues.left += deltaX;
            trimUpdate.x = deltaX; // Move window right
            trimUpdate.width = -deltaX; // Shrink window
            document.body.style.setProperty('transform', `translate(-${cropValues.left}px, -${cropValues.top}px)`, 'important');
        } else if (pos === 'e') {
            cropValues.right -= deltaX; 
            trimUpdate.width = deltaX;
            // No content shift needed for right edge
        } else if (pos === 'n') {
            cropValues.top += deltaY;
            trimUpdate.y = deltaY; // Move window down
            trimUpdate.height = -deltaY; // Shrink window
            document.body.style.setProperty('transform', `translate(-${cropValues.left}px, -${cropValues.top}px)`, 'important');
        } else if (pos === 's') {
            trimUpdate.height = deltaY;
        }

        ipcRenderer.send('trim-resize', trimUpdate);

        startX = ev.screenX;
        startY = ev.screenY;
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}
