const i18n = {
    currentLang: localStorage.getItem('selectedLang') || (window.AppConfig?.getDefaultLanguage() || 'en'),
    translations: {},

    async init() {
        // Wait for config to load if not already loaded
        if (window.AppConfig && !window.AppConfig.loaded) {
            await window.AppConfig.load();
        }
        await this.loadTranslations(this.currentLang);
        this.updateDOM();
        this.updateSwitcherUI();
    },

    async loadTranslations(lang) {
        try {
            // Use AppConfig helper (supports local files + Supabase)
            if (window.AppConfig?.fetchTranslation) {
                this.translations = await window.AppConfig.fetchTranslation(lang);
            } else {
                // Fallback: direct file fetch
                const langDir = window.AppConfig?.getSetting('paths.langDir') || 'lang';
                const response = await fetch(`${langDir}/${lang}.json`);
                this.translations = response.ok ? await response.json() : {};
            }
            this.currentLang = lang;
            localStorage.setItem('selectedLang', lang);
        } catch (error) {
            console.error('i18n Error:', error);
            // Fallback to default language
            const defaultLang = window.AppConfig?.getDefaultLanguage() || 'en';
            if (lang !== defaultLang) await this.loadTranslations(defaultLang);
        }
    },

    updateDOM() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = this.translations[key];
                } else {
                    el.textContent = this.translations[key];
                }
            }
        });
    },

    updateSwitcherUI() {
        const flag = document.getElementById('lang-btn-flag');
        if (!flag) return;
        const langs = window.AppConfig?.languages?.supportedLanguages || [];
        const current = langs.find(l => l.code === this.currentLang);
        if (current) flag.textContent = current.flag;
    },

    async changeLang(lang) {
        await this.loadTranslations(lang);
        this.updateSwitcherUI();
        // Rebuild media playlist names for new language
        if (window.media && media.rawTracks.length > 0) {
            media.buildPlaylist();
            media.updateTrackDisplay();
            media.populateTrackSelector();
        }
        // Re-load current page to re-render everything in the new language
        if (window.router && router.currentRoute) {
            await router.loadPage(window.location.pathname + window.location.search);
        } else {
            this.updateDOM();
        }
    }
};

// i18n.init() is called by the router during boot — no auto-run needed
window.i18n = i18n;
