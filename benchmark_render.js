// benchmark_render.js
const { performance } = require('perf_hooks');

let createElementCalls = 0;
let removeChildCalls = 0;
let appendChildCalls = 0;
let insertBeforeCalls = 0;
let innerHTMLSets = 0;

class Element {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this._innerHTML = '';
        this.className = '';
        this.dataset = {};
        this.onclick = null;
        this.parentNode = null;
    }

    get innerHTML() { return this._innerHTML; }
    set innerHTML(val) {
        innerHTMLSets++;
        this._innerHTML = val;
        this.children = [];
    }

    appendChild(child) {
        appendChildCalls++;
        if (child.parentNode) {
            child.parentNode.removeChild(child);
        }
        this.children.push(child);
        child.parentNode = this;
    }

    insertBefore(newChild, refChild) {
        insertBeforeCalls++;
        if (newChild.parentNode) {
            newChild.parentNode.removeChild(newChild);
        }
        const idx = this.children.indexOf(refChild);
        if (idx !== -1) {
            this.children.splice(idx, 0, newChild);
            newChild.parentNode = this;
        } else {
            this.appendChild(newChild);
        }
    }

    removeChild(child) {
        removeChildCalls++;
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parentNode = null;
        }
    }

    querySelector(sel) {
        if (sel === '.source-name') {
            const span = new Element('span');
            span.className = 'source-name';
            // just a mock, assume it has innerText property
            return span;
        }
        return new Element('button');
    }
}

const document = {
    createElement: (tag) => {
        createElementCalls++;
        return new Element(tag);
    }
};

const sourceListEl = new Element('ul');
let sources = [];
let selectedSourceId = null;
function selectSource() {}
function removeSource() {}

function resetMetrics() {
    createElementCalls = 0;
    removeChildCalls = 0;
    appendChildCalls = 0;
    insertBeforeCalls = 0;
    innerHTMLSets = 0;
}

// --- ORIGINAL IMPLEMENTATION ---
function renderSourceListOriginal() {
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

// --- OPTIMIZED IMPLEMENTATION ---
function renderSourceListOptimized() {
    // We maintain a map of existing DOM elements by their source ID
    const existingNodes = new Map();
    for (let i = 0; i < sourceListEl.children.length; i++) {
        const child = sourceListEl.children[i];
        if (child.dataset.id) {
            existingNodes.set(child.dataset.id, child);
        }
    }

    // Iterate through sources and update/create DOM elements in order
    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        let li = existingNodes.get(source.id);

        if (!li) {
            // Create new if it doesn't exist
            li = document.createElement('li');
            li.dataset.id = source.id;

            li.innerHTML = `
                <span class="source-name"></span>
                <div class="source-actions">
                    <button class="icon-btn delete-btn" title="Remove">🗑️</button>
                </div>
            `;

            li.onclick = () => selectSource(source.id);
            const delBtn = li.querySelector('.delete-btn');
            delBtn.onclick = (e) => {
                e.stopPropagation();
                removeSource(source.id);
            };
        }

        // Always update state
        li.className = `source-item ${source.id === selectedSourceId ? 'active' : ''}`;

        // Update name - need a better mock or actual DOM method for span.innerText
        // For benchmark mock, we just skip the span update logic but do something similar

        // Ensure it's in the correct position
        const currentChildAtIndex = sourceListEl.children[i];
        if (currentChildAtIndex !== li) {
            if (currentChildAtIndex) {
                sourceListEl.insertBefore(li, currentChildAtIndex);
            } else {
                sourceListEl.appendChild(li);
            }
        }

        existingNodes.delete(source.id);
    }

    // Remove any leftover nodes that are no longer in sources
    existingNodes.forEach((node) => {
        sourceListEl.removeChild(node);
    });
}

function runBenchmark(renderFn, name) {
    console.log(`\n--- Benchmarking ${name} ---`);
    resetMetrics();
    sourceListEl.children = [];
    sourceListEl._innerHTML = '';

    // Initial render with 10 sources
    sources = Array.from({length: 10}, (_, i) => ({ id: `s${i}`, name: `Source ${i}` }));

    const start = performance.now();

    // Render 1: Initial
    renderFn();

    // Render 2: Selection changes
    selectedSourceId = 's2';
    renderFn();
    selectedSourceId = 's5';
    renderFn();

    // Render 3: Swap two items (move)
    const temp = sources[2];
    sources[2] = sources[7];
    sources[7] = temp;
    renderFn();

    // Render 4: Rename an item
    sources[0].name = "Updated Source 0";
    renderFn();

    const time = performance.now() - start;

    console.log(`Execution Time: ${time.toFixed(2)}ms`);
    console.log(`DOM Creations: ${createElementCalls}`);
    console.log(`DOM Appends: ${appendChildCalls}`);
    console.log(`DOM Inserts: ${insertBeforeCalls}`);
    console.log(`DOM Removes: ${removeChildCalls}`);
    console.log(`DOM innerHTML sets: ${innerHTMLSets}`);
}

runBenchmark(renderSourceListOriginal, "Original");
runBenchmark(renderSourceListOptimized, "Optimized");
