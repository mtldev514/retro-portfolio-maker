/**
 * Application Initializer — sole entry point
 * Orchestrates all module initialization in the correct order.
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

    // 10. Dismiss loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', () => loadingScreen.remove());
    }

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
    // Find the "Language" section label (not "Effects" or "Theme")
    const allLabels = document.querySelectorAll('.settings-dropdown .settings-section-label');
    let langSection = null;
    for (const label of allLabels) {
        if (label.textContent.trim() === 'Language') {
            langSection = label;
            break;
        }
    }

    if (!langSection) {
        return; // No language section found
    }

    // Remove only existing language options (settings-option elements after the "Language" label)
    const existingLangOptions = [];
    let sibling = langSection.nextElementSibling;
    while (sibling && sibling.classList.contains('settings-option')) {
        existingLangOptions.push(sibling);
        sibling = sibling.nextElementSibling;
    }
    existingLangOptions.forEach(el => el.remove());

    // Add new language options from config (in correct order)
    if (AppConfig.languages && AppConfig.languages.supportedLanguages) {
        // Insert before the element that follows the language section (or at the end)
        const insertBefore = langSection.nextElementSibling;
        AppConfig.languages.supportedLanguages.forEach(lang => {
            const option = document.createElement('div');
            option.className = 'settings-option';
            option.onclick = () => i18n.changeLang(lang.code);
            option.innerHTML = `<span class="lang-flag">${lang.flag}</span> ${lang.name}`;

            langSection.parentNode.insertBefore(option, insertBefore);
        });
    }
}
