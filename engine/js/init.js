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
    const langSection = document.querySelector('.settings-dropdown .settings-section-label');
    if (!langSection || langSection.textContent !== 'Language') {
        return; // Not on a page with language selector
    }

    // Find the language options container
    const settingsDropdown = langSection.parentElement;
    const langDividerIndex = Array.from(settingsDropdown.children).indexOf(langSection) - 1;

    // Remove existing language options
    const existingLangOptions = [];
    let sibling = langSection.nextElementSibling;
    while (sibling && !sibling.classList.contains('settings-divider') && !sibling.classList.contains('settings-section-label')) {
        existingLangOptions.push(sibling);
        sibling = sibling.nextElementSibling;
    }
    existingLangOptions.forEach(el => el.remove());

    // Add new language options from config
    if (AppConfig.languages && AppConfig.languages.supportedLanguages) {
        AppConfig.languages.supportedLanguages.forEach(lang => {
            const option = document.createElement('div');
            option.className = 'settings-option';
            option.onclick = () => i18n.changeLang(lang.code);
            option.innerHTML = `<span class="lang-flag">${lang.flag}</span> ${lang.name}`;

            // Insert after language label
            langSection.parentNode.insertBefore(option, langSection.nextSibling);
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
