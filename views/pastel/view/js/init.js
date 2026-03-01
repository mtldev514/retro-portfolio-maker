/**
 * Pastel View — Init
 * Boot sequence: config → i18n → UI → render → dismiss loading
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Load config (everything depends on it)
        await AppConfig.load();

        // 2. Build language selector
        initLanguageSelector();

        // 3. Load translations
        await i18n.init();

        // 4. Set up view UI
        initFilterButtons();
        initAudioToggle();
        initLangToggleInteraction();

        // 5. Render gallery
        await renderer.init();

        // 6. Init router (SPA detail views)
        if (typeof router !== 'undefined') {
            router.init();
        }

        // 7. Dismiss loading screen — MUST be last
        page.dismissLoadingScreen();

    } catch (err) {
        console.error('[pastel] init failed:', err);
        // Still dismiss loading screen so user isn't stuck
        if (typeof page !== 'undefined') {
            page.dismissLoadingScreen();
        }
    }
});


/* ---- Language selector ---- */

function initLanguageSelector() {
    const dropdown = document.querySelector('.lang-dropdown');
    const flagEl = document.querySelector('.lang-current-flag');
    const codeEl = document.querySelector('.lang-current-code');
    if (!dropdown) return;

    const langs = AppConfig.languages?.supportedLanguages || [];
    if (langs.length <= 1) {
        const selector = document.querySelector('.lang-selector');
        if (selector) selector.hidden = true;
        return;
    }

    langs.forEach(lang => {
        const option = document.createElement('div');
        option.className = 'settings-option';
        option.innerHTML = `<span class="lang-flag">${lang.flag || ''}</span> ${lang.name}`;
        option.addEventListener('click', async () => {
            await i18n.changeLang(lang.code);
            updateLangDisplay(lang);
            dropdown.hidden = true;
            // Re-render gallery with new language
            if (typeof renderer !== 'undefined') {
                renderer.reRender();
            }
        });
        dropdown.appendChild(option);
    });

    // Set initial display
    const current = langs.find(l => l.code === (i18n.currentLang || 'en')) || langs[0];
    if (current) updateLangDisplay(current);

    function updateLangDisplay(lang) {
        if (flagEl) flagEl.textContent = lang.flag || '';
        if (codeEl) codeEl.textContent = lang.code;
    }
}

function initLangToggleInteraction() {
    const toggle = document.querySelector('.lang-toggle');
    const dropdown = document.querySelector('.lang-dropdown');
    if (!toggle || !dropdown) return;

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.hidden = !dropdown.hidden;
    });

    document.addEventListener('click', () => {
        dropdown.hidden = true;
    });
}


/* ---- Filter buttons ---- */

function initFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            if (typeof renderer !== 'undefined') {
                renderer.filter(filter);
            }
        });
    });
}


/* ---- Audio toggle ---- */

function initAudioToggle() {
    const toggle = document.querySelector('.audio-toggle');
    const trackName = document.querySelector('.audio-track-name');
    if (!toggle || typeof audioPlayer === 'undefined') return;

    audioPlayer.onPlaylistLoaded = (playlist) => {
        if (playlist && playlist.length > 0) {
            toggle.hidden = false;
        }
    };

    audioPlayer.onTrackChange = (track) => {
        if (trackName && track) {
            trackName.textContent = track.shortName || track.name || '';
        }
    };

    audioPlayer.onPlayStateChange = (isPlaying) => {
        toggle.classList.toggle('playing', isPlaying);
    };

    toggle.addEventListener('click', () => {
        audioPlayer.togglePlayPause();
    });

    // Initialize audio player
    audioPlayer.init().catch(err => {
        console.warn('[pastel] audio init skipped:', err.message);
    });
}
