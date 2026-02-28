/**
 * Modern View Initializer
 * Orchestrates module initialization in the correct order.
 * Depends on core modules: AppConfig (config-loader.js), i18n (i18n.js), page (page.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load configuration first (everything else depends on it)
    const configLoaded = await AppConfig.load();
    if (!configLoaded) {
        console.error('Failed to load configuration. Using defaults.');
    }

    // 2. Build dynamic language selector from config
    initLanguageSelector();

    // 3. Load translations (needs AppConfig for lang paths)
    if (typeof i18n !== 'undefined') {
        await i18n.init();
    }

    // 4. Init theme toggle (dark/light, respects system preference)
    initThemeToggle();

    // 5. Set up router and load initial page (renders gallery)
    if (typeof router !== 'undefined') {
        await router.init();
    }

    // 6. Init radio widget (non-blocking — loads audio playlist)
    if (typeof radio !== 'undefined') {
        radio.init();
    }

    // 7. Init ambient visualizer (non-blocking — reacts to radio audio)
    if (typeof ambientViz !== 'undefined') {
        ambientViz.init();
    }

    // 8. Dismiss loading screen and begin page lifecycle
    page.dismissLoadingScreen();
});

/**
 * Build language selector dropdown from config
 */
function initLanguageSelector() {
    const dropdown = document.querySelector('.settings-dropdown');
    if (!dropdown) return;

    const langs = AppConfig.languages && AppConfig.languages.supportedLanguages;
    if (!langs || langs.length === 0) return;

    dropdown.innerHTML = '';
    langs.forEach(lang => {
        const option = document.createElement('div');
        option.className = 'settings-option';
        option.onclick = () => {
            i18n.changeLang(lang.code);
            document.getElementById('settings-switcher')?.classList.remove('open');
        };
        option.innerHTML = `<span class="lang-flag">${lang.flag}</span> ${lang.name}`;
        dropdown.appendChild(option);
    });
}

/**
 * Dark/light theme toggle with system preference detection
 */
function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    const icon = btn.querySelector('.theme-icon');
    const stored = localStorage.getItem('modern-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');

    applyTheme(theme);

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('modern-theme', next);
    });

    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        if (icon) icon.textContent = t === 'dark' ? '☀' : '☽';
    }
}
