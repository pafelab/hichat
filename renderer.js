function setStatus(msg, isError = false) {
    const statusEl = document.getElementById('status');
    statusEl.innerText = msg;
    if (isError) {
        statusEl.classList.add('error');
    } else {
        statusEl.classList.remove('error');
    }
}

document.getElementById('launch').addEventListener('click', () => {
    const url = document.getElementById('url').value;
    const css = document.getElementById('css').value;
    const x = parseInt(document.getElementById('x').value) || 0;
    const y = parseInt(document.getElementById('y').value) || 0;
    const width = parseInt(document.getElementById('width').value) || 400;
    const height = parseInt(document.getElementById('height').value) || 600;
    const zoom = parseFloat(document.getElementById('zoom').value) || 1.0;
    const menuShortcut = document.getElementById('menu-shortcut').value || 'Shift+F1';
    const hideFromObs = document.getElementById('hide-from-obs').checked;

    // Streamlabs inputs
    const slUrl = document.getElementById('sl-url').value;
    const slWidth = parseInt(document.getElementById('sl-width').value) || 600;
    const slHeight = parseInt(document.getElementById('sl-height').value) || 400;
    const slZoom = parseFloat(document.getElementById('sl-zoom').value) || 1.0;
    const slCss = document.getElementById('sl-css').value;

    if (!url && !slUrl) {
        setStatus('กรุณาใส่ลิ้งก์อย่างน้อยหนึ่งช่อง (Please enter at least one URL)', true);
        return;
    }

    const launchBtn = document.getElementById('launch');
    const originalText = launchBtn.innerText;

    launchBtn.disabled = true;
    launchBtn.innerText = 'Launching...';

    window.api.send('launch-overlay', { 
        url, css, x, y, width, height, zoom, menuShortcut, hideFromObs,
        slUrl, slWidth, slHeight, slZoom, slCss
    });

    setStatus('Overlay launched!');

    setTimeout(() => {
        launchBtn.disabled = false;
        launchBtn.innerText = originalText;
    }, 2000);
});

document.getElementById('zoom').addEventListener('input', (e) => {
    document.getElementById('zoom-val').innerText = e.target.value;
});

document.getElementById('sl-zoom').addEventListener('input', (e) => {
    document.getElementById('sl-zoom-val').innerText = e.target.value;
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
    if (settings.menuShortcut) document.getElementById('menu-shortcut').value = settings.menuShortcut;
    if (settings.hideFromObs) document.getElementById('hide-from-obs').checked = settings.hideFromObs;
    // Streamlabs Load
    if (settings.slUrl) document.getElementById('sl-url').value = settings.slUrl;
    if (settings.slWidth) document.getElementById('sl-width').value = settings.slWidth;
    if (settings.slHeight) document.getElementById('sl-height').value = settings.slHeight;
    if (settings.slZoom) {
        document.getElementById('sl-zoom').value = settings.slZoom;
        document.getElementById('sl-zoom-val').innerText = settings.slZoom;
    }
    if (settings.slCss) document.getElementById('sl-css').value = settings.slCss;
});
