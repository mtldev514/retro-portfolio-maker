/**
 * Theme Switcher — loads CSS theme files from styles/ directory
 *
 * Flash-free strategy:
 *   1. init() is SYNCHRONOUS — injects cached CSS from localStorage as <style>
 *   2. loadThemeDefinitions() is ASYNC — fetches styles/styles.json, loads theme CSS file
 *   3. buildThemeSwitcher() dynamically populates theme options in settings dropdown
 */
const themes = {
    currentTheme: localStorage.getItem('selectedTheme') || 'mineral',
    definitions: {},
    definitionsArray: [],
    allowUserSwitch: true,
    _loaded: false,

    /**
     * Synchronous init — inject cached theme CSS instantly to prevent flash.
     * Called from init.js before DOMContentLoaded layout.
     */
    init() {
        const cachedCSS = localStorage.getItem('themeCSS');
        if (cachedCSS) {
            const style = document.createElement('style');
            style.id = 'theme-cache';
            style.textContent = cachedCSS;
            document.head.appendChild(style);
        }
    },

    /**
     * Async: fetch theme definitions from styles/styles.json
     * Called from init.js after DOM is ready.
     */
    async loadThemeDefinitions() {
        try {
            const res = await fetch('styles/styles.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (!data.themes || !Array.isArray(data.themes)) {
                console.warn('styles.json: missing "themes" array');
                return;
            }

            // Store as array (preserves order) and lookup map
            this.definitionsArray = data.themes;
            this.definitions = {};
            data.themes.forEach(t => { this.definitions[t.id] = t; });
            this._loaded = true;
            this.allowUserSwitch = data.allowUserSwitch !== false;

            // Use default theme from config if no user preference
            if (!localStorage.getItem('selectedTheme') && data.defaultTheme) {
                this.currentTheme = data.defaultTheme;
            }

            // Load the active theme CSS file
            await this.applyTheme(this.currentTheme);

            // Build dynamic theme switcher in settings dropdown
            this.buildThemeSwitcher();

        } catch (e) {
            console.warn('Could not load styles.json:', e.message);
            // Fallback: try old config/themes.json format
            await this._loadLegacyThemes();
        }
    },

    /**
     * Backward compatibility: load old config/themes.json format
     * Uses setProperty() loops like the previous system
     */
    async _loadLegacyThemes() {
        try {
            const res = await fetch('config/themes.json');
            if (!res.ok) return;
            const data = await res.json();

            if (!data.themes || typeof data.themes !== 'object') return;

            // Convert object format to array format
            this.definitionsArray = Object.entries(data.themes).map(([id, t]) => ({
                id, name: t.name, emoji: t.emoji, _legacyColors: t.colors
            }));
            this.definitions = {};
            this.definitionsArray.forEach(t => { this.definitions[t.id] = t; });
            this._loaded = true;

            if (!localStorage.getItem('selectedTheme') && data.defaultTheme) {
                this.currentTheme = data.defaultTheme;
            }

            // Apply using legacy setProperty method
            this._applyLegacyTheme(this.currentTheme);
            this.buildThemeSwitcher();
            console.info('Using legacy config/themes.json — run "npx retro-portfolio sync" to upgrade to CSS themes.');
        } catch (e) {
            // No themes available at all
        }
    },

    _applyLegacyTheme(themeId) {
        const theme = this.definitions[themeId];
        if (!theme || !theme._legacyColors) return;
        const root = document.documentElement;
        // Clear previous overrides
        Object.keys(theme._legacyColors).forEach(prop => root.style.removeProperty(prop));
        // Apply colors
        Object.entries(theme._legacyColors).forEach(([prop, value]) => {
            root.style.setProperty(prop, value);
        });
        this.currentTheme = themeId;
        localStorage.setItem('selectedTheme', themeId);
        this._refreshEffects();
    },

    /**
     * Apply a theme by loading its CSS file
     */
    async applyTheme(themeId) {
        const theme = this.definitions[themeId];
        if (!theme) return;

        // Legacy themes use setProperty
        if (theme._legacyColors) {
            this._applyLegacyTheme(themeId);
            return;
        }

        const cssUrl = `styles/${theme.file}`;

        try {
            // Fetch CSS text for caching
            const res = await fetch(cssUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const cssText = await res.text();

            // Remove old theme <link> if present
            const oldLink = document.getElementById('theme-stylesheet');
            if (oldLink) oldLink.remove();

            // Remove cache <style> if present
            const cacheStyle = document.getElementById('theme-cache');
            if (cacheStyle) cacheStyle.remove();

            // Create new <link> for the theme
            const link = document.createElement('link');
            link.id = 'theme-stylesheet';
            link.rel = 'stylesheet';
            link.href = cssUrl;
            document.head.appendChild(link);

            // Cache CSS text for flash-free next load
            this.currentTheme = themeId;
            localStorage.setItem('selectedTheme', themeId);
            localStorage.setItem('themeCSS', cssText);

            // Remove old localStorage keys from the JSON-based system
            localStorage.removeItem('themeColors');

            // Wait for stylesheet to load before refreshing effects
            await new Promise((resolve) => {
                link.onload = resolve;
                link.onerror = resolve;
            });

            this._refreshEffects();

        } catch (e) {
            console.warn(`Could not load theme CSS ${cssUrl}:`, e.message);
        }
    },

    /**
     * Refresh visual effects after theme change
     */
    _refreshEffects() {
        // Force h1 chrome gradient to re-render with new --mirror-* values
        const h1 = document.querySelector('h1');
        if (h1) {
            const cs = getComputedStyle(document.documentElement);
            const shine = cs.getPropertyValue('--mirror-shine').trim();
            const light = cs.getPropertyValue('--mirror-light').trim();
            const mid   = cs.getPropertyValue('--mirror-mid').trim();
            h1.style.background = `linear-gradient(135deg, ${shine} 0%, ${light} 25%, ${mid} 50%, ${light} 75%, ${shine} 100%)`;
            h1.style.webkitBackgroundClip = 'text';
            h1.style.backgroundClip = 'text';
        }

        // Update sparkle colors
        if (window.sparkle) sparkle.refreshColors();

        // Force wave color refresh (CSS variables changed, trigger repaint)
        const waveEl = document.getElementById('ambient-waves');
        if (waveEl) waveEl.offsetHeight; // eslint-disable-line no-unused-expressions

        // Toggle petal rain
        this.togglePetals();
    },

    async changeTheme(themeId) {
        await this.applyTheme(themeId);
        this.updateSwitcherUI();
    },

    /**
     * Build theme options dynamically in the settings dropdown
     */
    buildThemeSwitcher() {
        const dropdown = document.querySelector('.settings-dropdown');
        if (!dropdown) return;

        // Find the "Theme" section label
        const labels = dropdown.querySelectorAll('.settings-section-label');
        let themeLabel = null;
        labels.forEach(l => {
            if (l.textContent.trim() === 'Theme') themeLabel = l;
        });
        if (!themeLabel) return;

        // Remove existing theme options (everything between Theme label and next divider)
        let sibling = themeLabel.nextElementSibling;
        while (sibling && !sibling.classList.contains('settings-divider') && !sibling.classList.contains('settings-section-label')) {
            const next = sibling.nextElementSibling;
            sibling.remove();
            sibling = next;
        }

        // If theme switching is disabled, hide the entire Theme section
        if (!this.allowUserSwitch) {
            themeLabel.style.display = 'none';
            if (sibling && sibling.classList.contains('settings-divider')) {
                sibling.style.display = 'none';
            }
            return;
        }

        // Insert new theme options before the divider (respects array order)
        const divider = sibling;
        this.definitionsArray.forEach(theme => {
            const opt = document.createElement('div');
            opt.className = 'settings-option';
            opt.onclick = () => themes.changeTheme(theme.id);
            opt.innerHTML = `<span class="theme-icon">${theme.emoji || ''}</span> ${theme.name || theme.id}`;
            dropdown.insertBefore(opt, divider);
        });
    },

    updateSwitcherUI() {
        // No static UI to update — theme switcher is dynamic
    },

    togglePetals() {
        const existing = document.getElementById('petal-rain');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = 'petal-rain';
        const count = 60;
        for (let i = 0; i < count; i++) {
            const petal = document.createElement('span');
            petal.className = 'petal';
            const size = 6 + Math.floor(Math.random() * 6);
            petal.style.width = size + 'px';
            petal.style.height = (size * 1.4) + 'px';
            petal.style.left = Math.random() * 100 + '%';
            petal.style.animationDuration = (8 + Math.random() * 12) + 's';
            petal.style.animationDelay = -(Math.random() * 20) + 's';
            petal.style.opacity = 0.2 + Math.random() * 0.2;
            container.appendChild(petal);
        }
        document.body.appendChild(container);
    }
};

window.themes = themes;
