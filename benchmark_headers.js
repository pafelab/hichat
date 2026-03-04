const { performance } = require('perf_hooks');

const iterations = 1000000;

const details = {
    responseHeaders: {
        'Content-Type': ['text/html; charset=utf-8'],
        'X-Frame-Options': ['SAMEORIGIN'],
        'Content-Security-Policy': ["default-src 'self'"],
        'Cache-Control': ['max-age=3600'],
        'Strict-Transport-Security': ['max-age=31536000; includeSubDomains'],
        'Date': ['Tue, 24 Oct 2023 10:00:00 GMT'],
        'Server': ['nginx'],
        'Access-Control-Allow-Origin': ['*'],
        'X-XSS-Protection': ['1; mode=block'],
        'X-Content-Type-Options': ['nosniff']
    }
};

function testCurrent() {
    let dummy = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const responseHeaders = Object.assign({}, details.responseHeaders);
        const headersToDelete = [
            'x-frame-options',
            'content-security-policy',
            'frame-ancestors',
            'strict-transport-security'
        ];
        Object.keys(responseHeaders).forEach(header => {
            if (headersToDelete.includes(header.toLowerCase())) {
                delete responseHeaders[header];
                dummy++;
            }
        });
    }
    return { ms: performance.now() - start, dummy };
}

const HEADERS_TO_DELETE_ARR = [
    'x-frame-options',
    'content-security-policy',
    'frame-ancestors',
    'strict-transport-security'
];

function testOptimizedArr() {
    let dummy = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const responseHeaders = Object.assign({}, details.responseHeaders);
        Object.keys(responseHeaders).forEach(header => {
            if (HEADERS_TO_DELETE_ARR.includes(header.toLowerCase())) {
                delete responseHeaders[header];
                dummy++;
            }
        });
    }
    return { ms: performance.now() - start, dummy };
}

// Using a Set as recommended by performance optimization practices
const HEADERS_TO_DELETE_SET = new Set(HEADERS_TO_DELETE_ARR);

function testOptimizedSet() {
    let dummy = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const responseHeaders = Object.assign({}, details.responseHeaders);
        Object.keys(responseHeaders).forEach(header => {
            if (HEADERS_TO_DELETE_SET.has(header.toLowerCase())) {
                delete responseHeaders[header];
                dummy++;
            }
        });
    }
    return { ms: performance.now() - start, dummy };
}

// Warmup
testCurrent();
testOptimizedArr();
testOptimizedSet();

// Run actual benchmark
const currentMs = testCurrent().ms;
const optimizedArrMs = testOptimizedArr().ms;
const optimizedSetMs = testOptimizedSet().ms;

console.log('--- Benchmark Results ---');
console.log(`Current: ${currentMs.toFixed(2)} ms`);
console.log(`Optimized (Array Outside): ${optimizedArrMs.toFixed(2)} ms`);
console.log(`Improvement (Array Outside): ${((currentMs - optimizedArrMs) / currentMs * 100).toFixed(2)}%`);

console.log(`Optimized (Set Outside): ${optimizedSetMs.toFixed(2)} ms`);
console.log(`Improvement (Set Outside): ${((currentMs - optimizedSetMs) / currentMs * 100).toFixed(2)}%`);
