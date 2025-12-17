const { ipcRenderer, webFrame } = require('electron');

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
        border: 2px solid #ff0000; /* Red for Trim */
        z-index: 99999;
        pointer-events: none;
    }

    .trim-handle {
        position: absolute;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* Common style for the visual square anchor */
    .trim-handle::after {
        content: '';
        display: block;
        width: 10px;
        height: 10px;
        background-color: #ff0000;
        border: 1px solid white;
        box-shadow: 0 0 2px black;
    }

    /* Side handles for cropping (Hit areas + Anchors) */
    .trim-handle.n { top: -6px; left: 0; width: 100%; height: 12px; cursor: ns-resize; }
    .trim-handle.s { bottom: -6px; left: 0; width: 100%; height: 12px; cursor: ns-resize; }
    .trim-handle.w { left: -6px; top: 0; width: 12px; height: 100%; cursor: ew-resize; }
    .trim-handle.e { right: -6px; top: 0; width: 12px; height: 100%; cursor: ew-resize; }

    /* Corner handles for trim */
    .trim-handle.nw { top: -6px; left: -6px; width: 12px; height: 12px; cursor: nwse-resize; z-index: 10; }
    .trim-handle.ne { top: -6px; right: -6px; width: 12px; height: 12px; cursor: nesw-resize; z-index: 10; }
    .trim-handle.sw { bottom: -6px; left: -6px; width: 12px; height: 12px; cursor: nesw-resize; z-index: 10; }
    .trim-handle.se { bottom: -6px; right: -6px; width: 12px; height: 12px; cursor: nwse-resize; z-index: 10; }

    /* Corner handles are already small squares, so ::after fills them */
    .trim-handle.nw::after, .trim-handle.ne::after, .trim-handle.sw::after, .trim-handle.se::after {
        width: 100%; height: 100%;
    }

    #trim-close {
        position: absolute;
        top: 5px;
        right: 5px;
        background: #cc0000;
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        font-weight: bold;
        pointer-events: auto;
    }

    /* Radial Menu Styles */
    .menu-item,
    .menu-open-button {
      background: #EEEEEE;
      border-radius: 100%;
      width: 80px;
      height: 80px;
      margin-left: -40px;
      position: absolute;
      color: #FFFFFF;
      text-align: center;
      line-height: 80px;
      -webkit-transform: translate3d(0, 0, 0);
      transform: translate3d(0, 0, 0);
      -webkit-transition: transform ease-out 200ms, width 200ms, border-radius 200ms, opacity 200ms;
      transition: transform ease-out 200ms, width 200ms, border-radius 200ms, opacity 200ms;
      pointer-events: auto;

      /* New: Flex for content */
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0; /* Hidden by default */
    }

    /* Hover effect for buttons to expand into pill shape */
    .menu-item:hover {
        width: 180px;
        border-radius: 40px;
        z-index: 2000; /* Ensure overlap */
    }

    /* Text inside menu items */
    .menu-text {
        display: none;
        margin-left: 10px;
        white-space: nowrap;
        font-family: 'Sarabun', sans-serif;
        font-size: 16px;
        font-weight: bold;
    }

    .menu-item:hover .menu-text {
        display: inline-block;
    }

    .menu-open {
      display: none;
    }

    .lines {
      width: 25px;
      height: 3px;
      background: #596778;
      display: block;
      position: absolute;
      top: 50%;
      left: 50%;
      margin-left: -12.5px;
      margin-top: -1.5px;
      -webkit-transition: -webkit-transform 200ms;
      transition: -webkit-transform 200ms;
      transition: transform 200ms;
    }

    .line-1 {
      -webkit-transform: translate3d(0, -8px, 0);
      transform: translate3d(0, -8px, 0);
    }

    .line-2 {
      -webkit-transform: translate3d(0, 0, 0);
      transform: translate3d(0, 0, 0);
    }

    .line-3 {
      -webkit-transform: translate3d(0, 8px, 0);
      transform: translate3d(0, 8px, 0);
    }

    .menu-open:checked + .menu-open-button .line-1 {
      -webkit-transform: translate3d(0, 0, 0) rotate(45deg);
      transform: translate3d(0, 0, 0) rotate(45deg);
    }

    .menu-open:checked + .menu-open-button .line-2 {
      -webkit-transform: translate3d(0, 0, 0) scale(0.1, 1);
      transform: translate3d(0, 0, 0) scale(0.1, 1);
    }

    .menu-open:checked + .menu-open-button .line-3 {
      -webkit-transform: translate3d(0, 0, 0) rotate(-45deg);
      transform: translate3d(0, 0, 0) rotate(-45deg);
    }

    .radial-menu {
      margin: auto;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      width: 80px;
      height: 80px;
      text-align: center;
      box-sizing: border-box;
      font-size: 26px;
      z-index: 2147483647;
      pointer-events: none;
    }

    .menu-item:hover {
      background: #EEEEEE;
      color: #3290B1;
    }

    .menu-item:nth-child(3) { transition-duration: 180ms; }
    .menu-item:nth-child(4) { transition-duration: 180ms; }
    .menu-item:nth-child(5) { transition-duration: 180ms; }
    .menu-item:nth-child(6) { transition-duration: 180ms; }
    .menu-item:nth-child(7) { transition-duration: 180ms; }
    .menu-item:nth-child(8) { transition-duration: 180ms; }
    .menu-item:nth-child(9) { transition-duration: 180ms; }

    .menu-open-button {
      z-index: 2;
      transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transition-duration: 400ms;
      transform: scale(1.1, 1.1) translate3d(0, 0, 0);
      cursor: pointer;
      box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.14);
    }

    .menu-open-button:hover {
      transform: scale(1.2, 1.2) translate3d(0, 0, 0);
    }

    .menu-open:checked + .menu-open-button {
      transition-timing-function: linear;
      transition-duration: 200ms;
      transform: scale(0.8, 0.8) translate3d(0, 0, 0);
    }

    .menu-open:checked ~ .menu-item {
      transition-timing-function: cubic-bezier(0.935, 0, 0.34, 1.33);
      opacity: 1; /* Show when open */
    }

    .menu-open:checked ~ .menu-item:nth-child(3) {
      transition-duration: 180ms;
      transform: translate3d(0.08361px, -104.99997px, 0);
    }

    .menu-open:checked ~ .menu-item:nth-child(4) {
      transition-duration: 280ms;
      transform: translate3d(90.9466px, -52.47586px, 0);
    }

    .menu-open:checked ~ .menu-item:nth-child(5) {
      transition-duration: 380ms;
      transform: translate3d(90.9466px, 52.47586px, 0);
    }

    .menu-open:checked ~ .menu-item:nth-child(6) {
      transition-duration: 480ms;
      transform: translate3d(0.08361px, 104.99997px, 0);
    }

    .menu-open:checked ~ .menu-item:nth-child(7) {
      transition-duration: 580ms;
      transform: translate3d(-90.86291px, 52.62064px, 0);
    }

    .menu-open:checked ~ .menu-item:nth-child(8) {
      transition-duration: 680ms;
      transform: translate3d(-91.03006px, -52.33095px, 0);
    }

    .menu-open:checked ~ .menu-item:nth-child(9) {
      transition-duration: 780ms;
      transform: translate3d(-0.25084px, -104.9997px, 0);
    }

    .blue { background-color: #669AE1; box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.14); text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.12); }
    .blue:hover { color: #669AE1; text-shadow: none; }
    .green { background-color: #70CC72; box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.14); text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.12); }
    .green:hover { color: #70CC72; text-shadow: none; }
    .red { background-color: #FE4365; box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.14); text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.12); }
    .red:hover { color: #FE4365; text-shadow: none; }
    .purple { background-color: #C49CDE; box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.14); text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.12); }
    .purple:hover { color: #C49CDE; text-shadow: none; }
    .orange { background-color: #FC913A; box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.14); text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.12); }
    .orange:hover { color: #FC913A; text-shadow: none; }
    .lightblue { background-color: #62C2E4; box-shadow: 3px 3px 0 0 rgba(0, 0, 0, 0.14); text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.12); }
    .lightblue:hover { color: #62C2E4; text-shadow: none; }
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
    // Capture if not already captured? Or reset if re-entering?
    // If we re-enter, trimMode might be true or false depending on when this called.
    // Ensure wrapper exists.
    if (!document.getElementById('trim-content-wrapper')) {
        originalSize.width = Math.max(window.innerWidth, document.documentElement.scrollWidth);
        originalSize.height = Math.max(window.innerHeight, document.documentElement.scrollHeight);
        applyTrimCSS();
    }

    const trimOverlay = document.createElement('div');
    trimOverlay.id = 'trim-overlay';

    ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'].forEach(pos => {
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

// Custom Menu UI
function createMenuUI() {
    if (document.getElementById('custom-radial-menu')) return;
    injectStyles();

    // Inject FontAwesome
    if (!document.getElementById('fa-styles')) {
        const link = document.createElement('link');
        link.id = 'fa-styles';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
        document.head.appendChild(link);
    }

    const menuContainer = document.createElement('nav');
    menuContainer.id = 'custom-radial-menu';
    menuContainer.className = 'radial-menu';

    menuContainer.innerHTML = `
       <input type="checkbox" class="menu-open" name="menu-open" id="menu-open">
       <label class="menu-open-button" for="menu-open">
        <span class="lines line-1"></span>
        <span class="lines line-2"></span>
        <span class="lines line-3"></span>
      </label>

       <a href="#" class="menu-item blue" id="menu-btn-transform" title="Transform (Resize)"> <i class="fa fa-arrows"></i> <span class="menu-text">Resize</span> </a>
       <a href="#" class="menu-item red" id="menu-btn-trim" title="Trim (Crop)"> <i class="fa fa-crop"></i> <span class="menu-text">Crop</span> </a>
       <a href="#" class="menu-item green" id="menu-btn-reset" title="Reset Trim"> <i class="fa fa-refresh"></i> <span class="menu-text">Reset</span> </a>
       <a href="#" class="menu-item purple" id="menu-btn-clickthrough" title="Toggle Click-Through"> <i class="fa fa-mouse-pointer"></i> <span class="menu-text">Click-Through</span> </a>
       <a href="#" class="menu-item lightblue" id="menu-btn-hide" title="Hide/Show Chat"> <i class="fa fa-eye-slash"></i> <span class="menu-text">Hide/Show</span> </a>
       <a href="#" class="menu-item orange" id="menu-btn-close" title="Close Menu"> <i class="fa fa-times"></i> <span class="menu-text">Close</span> </a>
    `;

    document.documentElement.appendChild(menuContainer);

    // Add Listeners
    const closeMenu = () => {
        const checkbox = document.getElementById('menu-open');
        if (checkbox) checkbox.checked = false;
        ipcRenderer.send('menu-closed');
    };

    document.getElementById('menu-btn-transform').onclick = (e) => {
        e.preventDefault();
        toggleTransform(!transformMode);
        closeMenu();
    };

    document.getElementById('menu-btn-trim').onclick = (e) => {
        e.preventDefault();
        toggleTrim(!trimMode);
        closeMenu();
    };

    document.getElementById('menu-btn-reset').onclick = (e) => {
        e.preventDefault();
        ipcRenderer.send('request-reset-trim'); // Need to handle this locally or send ipc?
        // Existing reset-trim is listener.
        // We should just call the reset logic or emit event?
        // Logic for reset is inside listener: ipcRenderer.on('reset-trim'...)
        // We can just execute the logic:
        cropValues = { top: 0, right: 0, bottom: 0, left: 0 };
        const trimWrapper = document.getElementById('trim-content-wrapper');
        if (trimWrapper) {
            trimWrapper.style.setProperty('transform', 'translate(0px, 0px)', 'important');
        }
        closeMenu();
    };

    document.getElementById('menu-btn-clickthrough').onclick = (e) => {
        e.preventDefault();
        ipcRenderer.send('request-toggle-click-through');
        closeMenu();
    };

    document.getElementById('menu-btn-hide').onclick = (e) => {
        e.preventDefault();
        const wrapper = document.getElementById('trim-content-wrapper');
        // If wrapper exists, toggle its opacity. If not (not trimmed yet), toggle body?
        // But if wrapper doesn't exist, we haven't trimmed, so content is in body.
        // Wait, applyTrimCSS wraps everything. If not called, content is in body.
        // Let's ensure wrapper exists or toggle body.
        if (wrapper) {
            wrapper.style.opacity = (wrapper.style.opacity === '0') ? '1' : '0';
        } else {
            document.body.style.opacity = (document.body.style.opacity === '0') ? '1' : '0';
        }
        closeMenu();
    };

    document.getElementById('menu-btn-close').onclick = (e) => {
        e.preventDefault();
        closeMenu();
    };

    // Watch for menu toggle button (center button)
    const checkbox = document.getElementById('menu-open');
    checkbox.addEventListener('change', () => {
        if (!checkbox.checked) {
            ipcRenderer.send('menu-closed');
        }
    });
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
ipcRenderer.on('toggle-menu', () => {
    createMenuUI();
    const checkbox = document.getElementById('menu-open');
    if (checkbox) checkbox.checked = true;
});

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
    
    // Accumulate deltas during drag
    let totalDeltaX = 0;
    let totalDeltaY = 0;

    const scale = webFrame.getZoomFactor();
    const trimOverlay = document.getElementById('trim-overlay');
    const trimWrapper = document.getElementById('trim-content-wrapper');

    // Capture starting rect for UI feedback
    const startRect = trimOverlay.getBoundingClientRect(); // relative to viewport
    // Since overlay is fixed 100% size, startRect usually matches window size (0,0, w, h)

    const onMouseMove = (ev) => {
        const deltaX = ev.screenX - startX;
        const deltaY = ev.screenY - startY;

        // We only accumulate delta, do not send IPC yet
        totalDeltaX = deltaX;
        totalDeltaY = deltaY;

        // Calculate temporary visual adjustments
        let uiTop = 0;
        let uiLeft = 0;
        let uiWidth = startRect.width;
        let uiHeight = startRect.height;

        let clipTop = 0;
        let clipRight = 0;
        let clipBottom = 0;
        let clipLeft = 0;

        // Visual Feedback Logic
        if (pos.includes('w')) {
            // Dragging Left Handle:
            // UI moves Right (+delta), Width shrinks (-delta)
            // Clip Left increases (+delta/scale)
            uiLeft += deltaX / scale; // CSS pixels
            uiWidth -= deltaX / scale;
            clipLeft = deltaX / scale;
        }
        if (pos.includes('e')) {
            uiWidth += deltaX / scale;
            clipRight = -deltaX / scale; // Dragging left (-x) means crop from right (+val)? No.
            // Drag Right (+x) = Increase Width. Clip should be negative (grow)? Or we just resizing window?
            // "Crop" usually means shrinking.
            // If dragging Right Handle RIGHT (+x): Window grows. No crop.
            // If dragging Right Handle LEFT (-x): Window shrinks. Crop Right.
            // So clipRight should be -deltaX/scale (if deltaX is -10, clip is 10).
        }
        if (pos.includes('n')) {
            uiTop += deltaY / scale;
            uiHeight -= deltaY / scale;
            clipTop = deltaY / scale;
        }
        if (pos.includes('s')) {
            uiHeight += deltaY / scale;
            clipBottom = -deltaY / scale;
        }

        // Apply UI Feedback (The Green Box)
        // We need to set it relative to the window (viewport)
        trimOverlay.style.top = `${uiTop}px`;
        trimOverlay.style.left = `${uiLeft}px`;
        trimOverlay.style.width = `${uiWidth}px`;
        trimOverlay.style.height = `${uiHeight}px`;

        // Apply Content Masking (Preview)
        // clip-path: inset(top right bottom left)
        // Note: clip-path is applied to the wrapper.
        // We use Math.max(0, ...) to ensure we don't un-crop past 0 during preview?
        // Or do we allow expanding? If expanding, inset is negative? inset supports negative?
        // Usually inset clamps to border box.
        // Let's assume user is cropping IN.
        trimWrapper.style.clipPath = `inset(${clipTop}px ${-clipRight}px ${-clipBottom}px ${clipLeft}px)`;
    };

    const onMouseUp = (ev) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Reset UI previews
        trimOverlay.style.top = '0';
        trimOverlay.style.left = '0';
        trimOverlay.style.width = '100%';
        trimOverlay.style.height = '100%';
        trimWrapper.style.clipPath = '';

        // Calculate Final Commit Values
        // We use the LAST event's accumulated delta?
        // No, totalDelta is from StartX.
        // Screen coords:
        const finalDeltaX = totalDeltaX;
        const finalDeltaY = totalDeltaY;

        let trimUpdate = { x: 0, y: 0, width: 0, height: 0 };

        // Logic must match the visual feedback
        if (pos.includes('w')) {
            cropValues.left += (finalDeltaX / scale);
            trimUpdate.x = finalDeltaX;
            trimUpdate.width += -finalDeltaX;
        }
        if (pos.includes('e')) {
            cropValues.right -= (finalDeltaX / scale);
            trimUpdate.width += finalDeltaX;
        }
        if (pos.includes('n')) {
            cropValues.top += (finalDeltaY / scale);
            trimUpdate.y = finalDeltaY;
            trimUpdate.height += -finalDeltaY;
        }
        if (pos.includes('s')) {
            trimUpdate.height += finalDeltaY;
        }

        // Apply permanent CSS transform
        if (trimWrapper) {
            trimWrapper.style.setProperty('transform', `translate(-${cropValues.left}px, -${cropValues.top}px)`, 'important');
        }

        // Send Resize Command
        if (trimUpdate.width !== 0 || trimUpdate.height !== 0 || trimUpdate.x !== 0 || trimUpdate.y !== 0) {
            ipcRenderer.send('trim-resize', trimUpdate);
        }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}
