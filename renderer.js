document.getElementById('launch').addEventListener('click', () => {
    const url = document.getElementById('url').value;
    const css = document.getElementById('css').value;
    const x = parseInt(document.getElementById('x').value) || 0;
    const y = parseInt(document.getElementById('y').value) || 0;
    const width = parseInt(document.getElementById('width').value) || 400;
    const height = parseInt(document.getElementById('height').value) || 600;
    const zoom = parseFloat(document.getElementById('zoom').value) || 1.0;

    // Streamlabs inputs
    const slUrl = document.getElementById('sl-url').value;
    const slWidth = parseInt(document.getElementById('sl-width').value) || 600;
    const slHeight = parseInt(document.getElementById('sl-height').value) || 400;

    if (!url && !slUrl) {
        alert('กรุณาใส่ลิ้งก์อย่างน้อยหนึ่งช่อง (Please enter at least one URL)');
        return;
    }

    window.api.send('launch-overlay', { 
        url, css, x, y, width, height, zoom,
        slUrl, slWidth, slHeight
    });
    document.getElementById('status').innerText = 'Overlay launched!';
});

document.getElementById('zoom').addEventListener('input', (e) => {
    document.getElementById('zoom-val').innerText = e.target.value;
});

// Load settings
window.api.on('load-settings', (settings) => {
    if (settings.url) document.getElementById('url').value = settings.url;
    if (settings.css) document.getElementById('css').value = settings.css;
    if (settings.x) document.getElementById('x').value = settings.x;
    if (settings.y) document.getElementById('y').value = settings.y;
    if (settings.width) document.getElementById('width').value = settings.width;
    if (settings.height) document.getElementById('height').value = settings.height;
    if (settings.zoom) {
        document.getElementById('zoom').value = settings.zoom;
        document.getElementById('zoom-val').innerText = settings.zoom;
    }
    // Streamlabs Load
    if (settings.slUrl) document.getElementById('sl-url').value = settings.slUrl;
    if (settings.slWidth) document.getElementById('sl-width').value = settings.slWidth;
    if (settings.slHeight) document.getElementById('sl-height').value = settings.slHeight;
});
