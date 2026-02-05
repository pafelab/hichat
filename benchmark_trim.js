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
    },
    body: {
        style: {
            setProperty: (prop, val, priority) => {}
        }
    }
};

// Polyfill rAF for Node (approximate)
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);

// Shared state for the functions
let cropValues = { top: 0, right: 0, bottom: 0, left: 0 };

// 1. Unthrottled Implementation (from Task Description)
function startTrimUnthrottled(e, pos) {
    let startX = e.screenX;
    let startY = e.screenY;

    const onMouseMove = (ev) => {
        const deltaX = ev.screenX - startX;
        const deltaY = ev.screenY - startY;

        let trimUpdate = { x: 0, y: 0, width: 0, height: 0 };

        if (pos === 'w') {
            cropValues.left += deltaX;
            trimUpdate.x = deltaX;
            trimUpdate.width = -deltaX;
        } else if (pos === 'e') {
            cropValues.right -= deltaX;
            trimUpdate.width = deltaX;
        } else if (pos === 'n') {
            cropValues.top += deltaY;
            trimUpdate.y = deltaY;
            trimUpdate.height = -deltaY;
        } else if (pos === 's') {
            trimUpdate.height = deltaY;
        }

        ipcRenderer.send('trim-resize', trimUpdate);

        startX = ev.screenX;
        startY = ev.screenY;
    };

    document.addEventListener('mousemove', onMouseMove);
    return onMouseMove;
}

// 2. SetTimeout Implementation (Current Code in File)
function startTrimSetTimeout(e, pos) {
    let startX = e.screenX;
    let startY = e.screenY;

    let pendingTrimUpdate = { x: 0, y: 0, width: 0, height: 0 };
    let isThrottled = false;

    const flushTrimUpdate = () => {
        if (pendingTrimUpdate.x !== 0 || pendingTrimUpdate.y !== 0 || pendingTrimUpdate.width !== 0 || pendingTrimUpdate.height !== 0) {
            ipcRenderer.send('trim-resize', pendingTrimUpdate);
            pendingTrimUpdate = { x: 0, y: 0, width: 0, height: 0 };
        }
        isThrottled = false;
    };

    const onMouseMove = (ev) => {
        const deltaX = ev.screenX - startX;
        const deltaY = ev.screenY - startY;

        let currentDelta = { x: 0, y: 0, width: 0, height: 0 };

        if (pos === 'w') {
            cropValues.left += deltaX;
            currentDelta.x = deltaX;
            currentDelta.width = -deltaX;
        } else if (pos === 's') {
            currentDelta.height = deltaY;
        }
        // ... (other cases omitted for brevity as we just test 's' or 'w')

        pendingTrimUpdate.x += currentDelta.x;
        pendingTrimUpdate.y += currentDelta.y;
        pendingTrimUpdate.width += currentDelta.width;
        pendingTrimUpdate.height += currentDelta.height;

        if (!isThrottled) {
            isThrottled = true;
            setTimeout(flushTrimUpdate, 16);
        }

        startX = ev.screenX;
        startY = ev.screenY;
    };

    document.addEventListener('mousemove', onMouseMove);
    return onMouseMove;
}

// 3. RAF Implementation (Proposed)
function startTrimRAF(e, pos) {
    let startX = e.screenX;
    let startY = e.screenY;

    let pendingTrimUpdate = { x: 0, y: 0, width: 0, height: 0 };
    let isThrottled = false;

    const flushTrimUpdate = () => {
        if (pendingTrimUpdate.x !== 0 || pendingTrimUpdate.y !== 0 || pendingTrimUpdate.width !== 0 || pendingTrimUpdate.height !== 0) {
            ipcRenderer.send('trim-resize', pendingTrimUpdate);
            pendingTrimUpdate = { x: 0, y: 0, width: 0, height: 0 };
        }
        isThrottled = false;
    };

    const onMouseMove = (ev) => {
        const deltaX = ev.screenX - startX;
        const deltaY = ev.screenY - startY;

        let currentDelta = { x: 0, y: 0, width: 0, height: 0 };

        if (pos === 'w') {
            cropValues.left += deltaX;
            currentDelta.x = deltaX;
            currentDelta.width = -deltaX;
        } else if (pos === 's') {
            currentDelta.height = deltaY;
        }

        pendingTrimUpdate.x += currentDelta.x;
        pendingTrimUpdate.y += currentDelta.y;
        pendingTrimUpdate.width += currentDelta.width;
        pendingTrimUpdate.height += currentDelta.height;

        if (!isThrottled) {
            isThrottled = true;
            requestAnimationFrame(flushTrimUpdate);
        }

        startX = ev.screenX;
        startY = ev.screenY;
    };

    document.addEventListener('mousemove', onMouseMove);
    return onMouseMove;
}

async function runBenchmark() {
    console.log("Starting Benchmark...");

    // Test 1: Unthrottled
    ipcCalls.length = 0;
    eventListeners = {};
    cropValues = { top: 0, right: 0, bottom: 0, left: 0 };

    console.log("Testing Unthrottled Implementation...");
    startTrimUnthrottled({ screenX: 0, screenY: 0 }, 's');
    let moveHandler = eventListeners['mousemove'][0];

    // Simulate 60 moves over 100ms
    for (let i = 1; i <= 60; i++) {
        moveHandler({ screenX: 0, screenY: i });
        await new Promise(r => setTimeout(r, 1));
    }
    const unthrottledCount = ipcCalls.length;
    console.log(`Unthrottled IPC Calls: ${unthrottledCount}`);


    // Test 2: SetTimeout
    ipcCalls.length = 0;
    eventListeners = {};
    cropValues = { top: 0, right: 0, bottom: 0, left: 0 };

    console.log("Testing SetTimeout Implementation...");
    startTrimSetTimeout({ screenX: 0, screenY: 0 }, 's');
    moveHandler = eventListeners['mousemove'][0];

    for (let i = 1; i <= 60; i++) {
        moveHandler({ screenX: 0, screenY: i });
        await new Promise(r => setTimeout(r, 1));
    }
    // Wait for timeout to flush
    await new Promise(r => setTimeout(r, 50));

    const setTimeoutCount = ipcCalls.length;
    console.log(`SetTimeout IPC Calls: ${setTimeoutCount}`);


    // Test 3: RAF
    ipcCalls.length = 0;
    eventListeners = {};
    cropValues = { top: 0, right: 0, bottom: 0, left: 0 };

    console.log("Testing RAF Implementation...");
    startTrimRAF({ screenX: 0, screenY: 0 }, 's');
    moveHandler = eventListeners['mousemove'][0];

    for (let i = 1; i <= 60; i++) {
        moveHandler({ screenX: 0, screenY: i });
        await new Promise(r => setTimeout(r, 1));
    }
    // Wait for RAF to flush
    await new Promise(r => setTimeout(r, 50));

    const rafCount = ipcCalls.length;
    console.log(`RAF IPC Calls: ${rafCount}`);

    console.log("--- Results ---");
    console.log(`Unthrottled: ${unthrottledCount}`);
    console.log(`SetTimeout:  ${setTimeoutCount}`);
    console.log(`RAF:         ${rafCount}`);
}

runBenchmark();
