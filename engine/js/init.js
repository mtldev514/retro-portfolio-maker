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

    // Initialize theme selector dynamically
    initThemeSelector();

    // Initialize other modules
    if (typeof i18n !== 'undefined') {
        i18n.init();
    }

    if (typeof themes !== 'undefined') {
        themes.init();
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

    // Remove existing language options (everything between "Language" label and the next divider/label/end)
    const existingLangOptions = [];
    let sibling = langSection.nextElementSibling;
    while (sibling && !sibling.classList.contains('settings-divider') && !sibling.classList.contains('settings-section-label')) {
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

/**
 * Dynamically build theme selector from config
 */
function initThemeSelector() {
    // This will be implemented when we externalize themes.js
    // For now, themes are still in themes.js
}
