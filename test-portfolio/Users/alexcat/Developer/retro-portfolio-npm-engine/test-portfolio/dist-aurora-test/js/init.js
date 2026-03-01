/* ═══════════════════════════════════════════════════════════
   AURORA VIEW — init.js
   Boot sequence: config → i18n → UI → render → page ready
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // ── 1. Config ──
        await AppConfig.load();

        // ── 2. Language selector ──
        initLanguageSelector();

        // ── 3. Translations ──
        await i18n.init();

        // ── 4. UI setup ──
        initTheme();
        initHeader();
        initCursorGlow();
        initLightbox();

        // ── 5. Gallery ──
        await renderer.init();

        // ── 6. Audio ──
        initAudio();

        // ── 7. Ready ──
        page.dismissLoadingScreen();

    } catch (err) {
        console.error('[Aurora] Init failed:', err);
        page.dismissLoadingScreen();
    }
});

/* ── Theme Toggle ──────────────────────────────────────── */

function initTheme() {
    const saved = localStorage.getItem('aurora-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.addEventListener('click', () => {
            const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            localStorage.setItem('aurora-theme', next);
        });
    }
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const sun = document.querySelector('.icon-sun');
    const moon = document.querySelector('.icon-moon');
    if (sun && moon) {
        sun.style.display = theme === 'dark' ? 'none' : 'block';
        moon.style.display = theme === 'dark' ? 'block' : 'none';
    }
}

/* ── Header Hide on Scroll ─────────────────────────────── */

function initHeader() {
    const header = document.querySelector('.site-header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        if (y > 100 && y > lastScroll) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        lastScroll = y;
    }, { passive: true });
}

/* ── Cursor Glow ───────────────────────────────────────── */

function initCursorGlow() {
    const glow = document.querySelector('.cursor-glow');
    if (!glow || window.matchMedia('(pointer: coarse)').matches) return;

    let x = 0, y = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', e => {
        x = e.clientX;
        y = e.clientY;
    }, { passive: true });

    function tick() {
        cx += (x - cx) * 0.08;
        cy += (y - cy) * 0.08;
        glow.style.transform = `translate(${cx - 250}px, ${cy - 250}px)`;
        requestAnimationFrame(tick);
    }
    tick();
}

/* ── Language Selector ─────────────────────────────────── */

function initLanguageSelector() {
    const toggle = document.getElementById('lang-toggle');
    const dropdown = document.getElementById('lang-dropdown');
    const flagEl = document.getElementById('lang-current-flag');
    if (!toggle || !dropdown) return;

    const langs = AppConfig.languages?.supportedLanguages || [];

    langs.forEach(lang => {
        const opt = document.createElement('div');
        opt.className = 'settings-option';
        opt.innerHTML = `<span class="lang-flag">${lang.flag}</span> ${lang.name}`;
        opt.addEventListener('click', () => {
            i18n.changeLang(lang.code);
            if (flagEl) flagEl.textContent = lang.flag;
            dropdown.classList.remove('open');
            // Re-render gallery with new language
            if (renderer && renderer.rerender) renderer.rerender();
        });
        dropdown.appendChild(opt);
    });

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => dropdown.classList.remove('open'));
}

/* ── Audio Wiring ──────────────────────────────────────── */

function initAudio() {
    if (typeof audioPlayer === 'undefined') return;

    const np = document.getElementById('now-playing');
    const trackEl = document.getElementById('np-track');
    const playBtn = document.getElementById('np-play');
    const prevBtn = document.getElementById('np-prev');
    const nextBtn = document.getElementById('np-next');
    const vizEl = document.getElementById('np-visualizer');
    const progressBar = document.getElementById('np-progress-bar');
    const toggleBtn = document.getElementById('audio-toggle');
    const playIcon = playBtn?.querySelector('.play-icon');
    const pauseIcon = playBtn?.querySelector('.pause-icon');

    audioPlayer.onPlaylistLoaded = (playlist) => {
        if (playlist && playlist.length > 0 && np) {
            np.classList.add('visible');
        }
    };

    audioPlayer.onTrackChange = (track) => {
        if (trackEl) trackEl.textContent = track?.shortName || track?.name || '—';
    };

    audioPlayer.onPlayStateChange = (playing) => {
        if (playIcon) playIcon.style.display = playing ? 'none' : 'block';
        if (pauseIcon) pauseIcon.style.display = playing ? 'block' : 'none';
        if (vizEl) vizEl.classList.toggle('playing', playing);
    };

    audioPlayer.onTimeUpdate = (current, duration) => {
        if (progressBar && duration > 0) {
            progressBar.style.width = ((current / duration) * 100) + '%';
        }
    };

    if (playBtn)  playBtn.addEventListener('click', () => audioPlayer.togglePlayPause());
    if (prevBtn)  prevBtn.addEventListener('click', () => audioPlayer.prev());
    if (nextBtn)  nextBtn.addEventListener('click', () => audioPlayer.next());
    if (toggleBtn) toggleBtn.addEventListener('click', () => audioPlayer.togglePlayPause());

    audioPlayer.init().catch(err => console.warn('[Aurora] Audio init:', err));
}

/* ── Lightbox ──────────────────────────────────────────── */

function initLightbox() {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const closeBtn = lb?.querySelector('.lightbox-close');
    if (!lb) return;

    window.openLightbox = (src, alt) => {
        if (img) { img.src = src; img.alt = alt || ''; }
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    const close = () => {
        lb.classList.remove('open');
        document.body.style.overflow = '';
    };

    lb.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}
