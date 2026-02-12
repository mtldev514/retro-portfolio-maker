/**
 * Sparkle Cursor Trail — Geocities-era glitter effect
 * Creates tiny stars that follow the mouse and fade away
 */
(function () {
    // Read sparkle colors from CSS variables (centralised in style.css :root)
    let colors = [];
    let enabled = false; // Default to disabled, controlled by effects.js

    function refreshColors() {
        const s = getComputedStyle(document.documentElement);
        colors = [
            s.getPropertyValue('--sparkle-1').trim() || '#ffd700',
            s.getPropertyValue('--sparkle-2').trim() || '#ff69b4',
            s.getPropertyValue('--sparkle-3').trim() || '#00ffff',
            s.getPropertyValue('--sparkle-4').trim() || '#ff00ff',
            s.getPropertyValue('--sparkle-5').trim() || '#fff',
            s.getPropertyValue('--sparkle-6').trim() || '#7fff00',
            s.getPropertyValue('--sparkle-7').trim() || '#ff4500',
        ];
    }
    refreshColors();

    const shapes = ['✦', '✧', '✶', '★', '·', '✸', '✹'];
    const pool = [];
    const POOL_SIZE = 50;
    let mouseX = 0, mouseY = 0;
    let ticking = false;

    // Pre-create reusable sparkle elements
    for (let i = 0; i < POOL_SIZE; i++) {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;pointer-events:none;z-index:99998;font-size:12px;transition:none;will-change:transform,opacity;';
        el.style.display = 'none';
        document.body.appendChild(el);
        pool.push({ el, active: false });
    }

    function spawnSparkle() {
        if (!enabled) return;

        // Find an inactive sparkle from the pool
        const sparkle = pool.find(s => !s.active);
        if (!sparkle) return;

        sparkle.active = true;
        const el = sparkle.el;

        // Random offsets so sparkles spread around cursor
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;
        const x = mouseX + offsetX;
        const y = mouseY + offsetY;

        // Random appearance
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const size = 8 + Math.random() * 14;
        const drift = (Math.random() - 0.5) * 40;

        el.textContent = shape;
        el.style.color = color;
        el.style.fontSize = size + 'px';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.opacity = '1';
        el.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
        el.style.display = 'block';

        const duration = 600 + Math.random() * 500;
        const start = performance.now();

        function animate(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);

            // Float up and drift sideways, shrink and fade
            const moveY = -30 * progress;
            const moveX = drift * progress;
            const scale = 1 - progress * 0.7;
            const rotation = progress * 180 * (drift > 0 ? 1 : -1);
            const opacity = 1 - progress;

            el.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale}) rotate(${rotation}deg)`;
            el.style.opacity = opacity;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                el.style.display = 'none';
                sparkle.active = false;
            }
        }

        requestAnimationFrame(animate);
    }

    // Throttled spawn on mousemove
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!ticking && enabled) {
            ticking = true;
            requestAnimationFrame(() => {
                // Spawn 2-3 sparkles per frame for a nice density
                const count = 2 + Math.floor(Math.random() * 2);
                for (let i = 0; i < count; i++) {
                    spawnSparkle();
                }
                ticking = false;
            });
        }
    });

    // Expose public API
    window.sparkle = {
        refreshColors,
        enable: () => { enabled = true; },
        disable: () => { enabled = false; }
    };

})();
