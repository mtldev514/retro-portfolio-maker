/**
 * Real visitor counter using counterapi.dev
 */
(function() {
    const el = document.querySelector('.visitor-counter');
    if (!el) return;

    fetch('https://api.counterapi.dev/v1/retro-portfolio/visits/up')
        .then(r => r.json())
        .then(data => {
            const count = data.count || 0;
            el.textContent = String(count).padStart(6, '0');
        })
        .catch(() => {
            el.textContent = '------';
        });
})();
