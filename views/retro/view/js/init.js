/**
 * Retro View Initializer
 * Orchestrates the retro view's module initialization in the correct order.
 * Depends on core modules: AppConfig (config-loader.js), i18n (i18n.js), page (page.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing application...');

    // 1. Load configuration first (everything else depends on it)
    const configLoaded = await AppConfig.load();
    if (!configLoaded) {
        console.error('Failed to load configuration. Using defaults.');
    }

    // 2. Flash-free theme restore (synchronous — applies cached CSS vars)
    if (typeof themes !== 'undefined') {
        themes.init();
    }

    // 3. Apply configurable marquee text from app.json
    applyMarqueeText();

    // 4. Build dynamic language selector from config
    initLanguageSelector();

    // 5. Load translations (needs AppConfig for lang paths)
    if (typeof i18n !== 'undefined') {
        await i18n.init();
    }

    // 6. Fetch theme definitions + build dynamic switcher (needs DOM)
    if (typeof themes !== 'undefined' && themes.loadThemeDefinitions) {
        await themes.loadThemeDefinitions();
    }

    // 7. Set up router (event listeners) and load initial page
    if (typeof router !== 'undefined') {
        await router.init();
    }

    // 8. Init media controller (needs DOM populated by router)
    if (window.media) {
        await media.init();
    }

    // 9. Init ambient music visualizer (needs media + DOM ready)
    if (window.ambientViz) {
        ambientViz.init();
    }

    // 10. Dismiss loading screen and begin page lifecycle
    page.dismissLoadingScreen();

    // 11. Init effects after reveal completes (avoids glitter on invisible DOM)
    page.onReady(() => { if (window.effects) effects.init(); });

    console.log('✅ Application initialized');
});

/**
 * Apply marquee text from app.json config (if set).
 * Priority: app.json "marquee" field > translation file > HTML default.
 */
function applyMarqueeText() {
    const marqueeText = AppConfig.getSetting('marquee');
    if (marqueeText) {
        const marqueeEl = document.querySelector('.marquee-container .marquee-text');
        if (marqueeEl) {
            marqueeEl.textContent = marqueeText;
        }
    }
}

/**
 * Dynamically build language selector from config
 */
function initLanguageSelector() {
    const dropdown = document.querySelector('.settings-dropdown');
    if (!dropdown) return;

    const langs = AppConfig.languages && AppConfig.languages.supportedLanguages;
    if (!langs || langs.length === 0) return;

    // Replace hardcoded language options with config-driven ones
    dropdown.innerHTML = '';
    langs.forEach(lang => {
        const option = document.createElement('div');
        option.className = 'settings-option';
        option.onclick = () => i18n.changeLang(lang.code);
        option.innerHTML = `<span class="lang-flag">${lang.flag}</span> ${lang.name}`;
        dropdown.appendChild(option);
    });
}
