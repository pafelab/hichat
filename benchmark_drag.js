
// Mock Browser Environment
const window = {
    _rafQueue: [],
    requestAnimationFrame: (cb) => {
        window._rafQueue.push(cb);
        return window._rafQueue.length;
    },
    cancelAnimationFrame: (id) => {
        // Not used in this pattern
    }
};

const requestAnimationFrame = window.requestAnimationFrame;

// Tracking
let styleUpdates = 0;

const wrapper = {
    style: {
        _left: '0px',
        _top: '0px',
        set left(val) {
            this._left = val;
            styleUpdates++;
        },
        get left() { return this._left; },
        set top(val) {
            this._top = val;
            styleUpdates++;
        },
        get top() { return this._top; }
    },
    dataset: { id: 'source-1' }
};

const sources = [{ id: 'source-1', x: 0, y: 0 }];

// --- Baseline Implementation ---
function setupDragEventsBaseline(wrapper) {
    let startX = 0;
    let startY = 0;
    let startLeft = parseInt(wrapper.style.left || 0);
    let startTop = parseInt(wrapper.style.top || 0);

    return (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newX = startLeft + dx;
        const newY = startTop + dy;

        wrapper.style.left = `${newX}px`;
        wrapper.style.top = `${newY}px`;
    };
}

// --- Optimized Implementation ---
function setupDragEventsOptimized(wrapper) {
    let startX = 0;
    let startY = 0;
    let startLeft = parseInt(wrapper.style.left || 0);
    let startTop = parseInt(wrapper.style.top || 0);

    let isTicking = false;
    let lastEvent = null;

    return (ev) => {
        lastEvent = ev;
        if (!isTicking) {
            requestAnimationFrame(() => {
                const dx = lastEvent.clientX - startX;
                const dy = lastEvent.clientY - startY;

                const newX = startLeft + dx;
                const newY = startTop + dy;

                wrapper.style.left = `${newX}px`;
                wrapper.style.top = `${newY}px`;

                isTicking = false;
            });
            isTicking = true;
        }
    };
}

// --- Benchmark Runner ---

function runBenchmark() {
    console.log("Starting Benchmark...");

    // 1. Baseline
    styleUpdates = 0;
    const onMouseMoveBaseline = setupDragEventsBaseline(wrapper);

    // Simulate 1000 mouse events
    for (let i = 0; i < 1000; i++) {
        onMouseMoveBaseline({ clientX: i, clientY: i });
    }

    console.log(`Baseline: Processed 1000 events.`);
    console.log(`Baseline: Style updates = ${styleUpdates} (Expected ~2000)`);

    // 2. Optimized
    styleUpdates = 0;
    window._rafQueue = []; // Clear queue
    const onMouseMoveOptimized = setupDragEventsOptimized(wrapper);

    // Simulate 1000 mouse events, but only flush RAF every 16ms equivalent
    // Let's say we fire 10 events, then flush (simulating faster input than refresh)
    // 1000 events / 10 events per frame = 100 frames

    for (let i = 0; i < 1000; i++) {
        onMouseMoveOptimized({ clientX: i, clientY: i });

        // Every 10 events, we simulate a frame render
        if (i % 10 === 0) {
            // Process queue
            const queue = [...window._rafQueue];
            window._rafQueue = [];
            queue.forEach(cb => cb());
        }
    }

    // Process remaining
    const queue = [...window._rafQueue];
    window._rafQueue = [];
    queue.forEach(cb => cb());

    console.log(`Optimized: Processed 1000 events.`);
    console.log(`Optimized: Style updates = ${styleUpdates} (Expected ~200)`);
}

runBenchmark();
