const assert = require('assert');

// Mocks
const ipcCalls = [];
const ipcRenderer = {
    send: (channel, data) => {
        ipcCalls.push({ channel, data, time: Date.now() });
    }
};

let eventListeners = {};
const document = {
    addEventListener: (event, handler) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(handler);
    },
    removeEventListener: (event, handler) => {
        if (eventListeners[event]) {
            eventListeners[event] = eventListeners[event].filter(h => h !== handler);
        }
    }
};

// Mock rAF
const requestAnimationFrame = (cb) => setTimeout(cb, 16);

// Original Code (Adapted for test context)
function startResizeOriginal(e, pos) {
    let startX = e.screenX;
    let startY = e.screenY;

    const onMouseMove = (ev) => {
        const deltaX = ev.screenX - startX;
        const deltaY = ev.screenY - startY;
        ipcRenderer.send('overlay-resize', { x: deltaX, y: deltaY, edge: pos });
        startX = ev.screenX;
        startY = ev.screenY;
    };

    document.addEventListener('mousemove', onMouseMove);
    return onMouseMove;
}

// Optimized Code
function startResizeOptimized(e, pos) {
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

    document.addEventListener('mousemove', onMouseMove);
    return onMouseMove;
}

async function runBenchmark() {
    console.log("Starting Benchmark...");

    // Test 1: Original
    ipcCalls.length = 0;
    eventListeners = {};

    console.log("Testing Original Implementation...");
    startResizeOriginal({ screenX: 0, screenY: 0 }, 'se');

    const moveHandlerOriginal = eventListeners['mousemove'][0];

    // Simulate 50 moves over 100ms (every 2ms)
    // Total duration: 100ms
    for (let i = 1; i <= 50; i++) {
        moveHandlerOriginal({ screenX: i, screenY: i });
        await new Promise(r => setTimeout(r, 2));
    }

    const originalCount = ipcCalls.length;
    console.log(`Original IPC Calls: ${originalCount}`);

    // Test 2: Optimized
    ipcCalls.length = 0;
    eventListeners = {};

    console.log("Testing Optimized Implementation...");
    startResizeOptimized({ screenX: 0, screenY: 0 }, 'se');

    const moveHandlerOptimized = eventListeners['mousemove'][0];

    // Simulate 50 moves over 100ms (every 2ms)
    for (let i = 1; i <= 50; i++) {
        moveHandlerOptimized({ screenX: i, screenY: i });
        await new Promise(r => setTimeout(r, 2));
    }

    // Wait for pending rAF
    await new Promise(r => setTimeout(r, 50));

    const optimizedCount = ipcCalls.length;
    console.log(`Optimized IPC Calls: ${optimizedCount}`);

    console.log(`Reduction: ${originalCount} -> ${optimizedCount}`);
    if (originalCount > 0) {
        console.log(`Improvement: ${((originalCount - optimizedCount) / originalCount * 100).toFixed(1)}%`);
    }
}

runBenchmark();
