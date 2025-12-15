const { ipcRenderer } = require('electron');

let transformMode = false;
let trimMode = false;
let transformOverlay = null;

// State for Trim Mode
let cropValues = { top: 0, right: 0, bottom: 0, left: 0 };
let originalSize = { width: 0, height: 0 };

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

    // Notify main process to enable/disable interaction
    ipcRenderer.send('set-input-mode', active);

    if (active) createTransformUI();
    else removeTransformUI();
}

function toggleTrim(active) {
    if (transformMode && active) toggleTransform(false); // Exclusive modes
    
    // Notify main process to enable/disable interaction
    ipcRenderer.send('set-input-mode', active);

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
