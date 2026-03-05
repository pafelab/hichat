const { performance } = require('perf_hooks');

const document = {
    createElement: (tag) => {
        return {
            tagName: tag,
            children: [],
            appendChild: function(child) { this.children.push(child); },
            querySelector: function(sel) {
                if (sel === 'webview') {
                    return this.children.find(c => c.tagName === 'webview');
                }
                return null;
            }
        };
    }
};

const wrapper = document.createElement('div');
const webview = document.createElement('webview');
webview.setZoomFactor = () => {};
wrapper.appendChild(webview);

const iterations = 1000000;

function runOriginal() {
    for (let i = 0; i < iterations; i++) {
        const wv = wrapper.querySelector('webview');
        if (wv && typeof wv.setZoomFactor === 'function') {
            wv.setZoomFactor(1.5);
        }
    }
}

function runOptimized() {
    for (let i = 0; i < iterations; i++) {
        if (webview && typeof webview.setZoomFactor === 'function') {
            webview.setZoomFactor(1.5);
        }
    }
}

const start1 = performance.now();
runOriginal();
const end1 = performance.now();

const start2 = performance.now();
runOptimized();
const end2 = performance.now();

console.log(`Original: ${(end1 - start1).toFixed(2)}ms`);
console.log(`Optimized: ${(end2 - start2).toFixed(2)}ms`);
