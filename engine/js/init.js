/**
 * Application Initializer
 * Loads configuration and initializes all modules
 */

(async function() {
    console.log('🚀 Initializing application...');

    // Load configuration first
    const configLoaded = await AppConfig.load();
    if (!configLoaded) {
        console.error('Failed to load configuration. Using defaults.');
    }

    // Initialize language selector dynamically
    initLanguageSelector();

    // Initialize other modules
    if (typeof i18n !== 'undefined') {
        i18n.init();
    }

    if (typeof themes !== 'undefined') {
        // Synchronous init restores cached colors (flash-free)
        themes.init();
        // Async load fetches themes.json and builds dynamic switcher
        await themes.loadThemeDefinitions();
    }

    console.log('✅ Application initialized');
})();

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

