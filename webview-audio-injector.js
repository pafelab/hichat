const { ipcRenderer } = require('electron');

let currentVolume = 1.0;

function applyVolume(mediaElement) {
    if (!mediaElement) return;
    // Check if volume is significantly different to avoid unnecessary updates
    if (Math.abs(mediaElement.volume - currentVolume) > 0.01) {
        mediaElement.volume = currentVolume;
    }
}

ipcRenderer.on('set-volume', (event, volume) => {
    currentVolume = volume;
    document.querySelectorAll('video, audio').forEach(applyVolume);
});

// Enforce volume on new media elements
window.addEventListener('loadedmetadata', (e) => {
    if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') {
        applyVolume(e.target);
    }
}, true); // Capture phase to catch events before bubbling (though media events don't bubble, capture works on window)

// Enforce volume if the page tries to change it (Robustness)
window.addEventListener('volumechange', (e) => {
    if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') {
        applyVolume(e.target);
    }
}, true);

// Initial application once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('video, audio').forEach(applyVolume);
});
