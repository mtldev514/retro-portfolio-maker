/**
 * Theme Switcher — loads definitions from config/themes.json
 *
 * Flash-free strategy:
 *   1. init() is SYNCHRONOUS — restores cached colors from localStorage immediately
 *   2. loadThemeDefinitions() is ASYNC — fetches themes.json, validates, re-applies
 *   3. buildThemeSwitcher() dynamically populates theme options in settings dropdown
 */
const themes = {
    currentTheme: localStorage.getItem('selectedTheme') || 'ciment',
    definitions: {},
    _loaded: false,

    /**
     * Synchronous init — apply cached theme colors instantly to prevent flash.
     * Called at script load time (before DOMContentLoaded).
     */
    init() {
        // Restore cached colors immediately (no fetch, no flash)
        const cached = localStorage.getItem('themeColors');
        if (cached) {
            try {
                const colors = JSON.parse(cached);
                const root = document.documentElement;
                Object.entries(colors).forEach(([prop, value]) => {
                    root.style.setProperty(prop, value);
                });
            } catch (e) {
                // Bad cache — will be fixed when definitions load
            }
        }
    },

    /**
     * Async: fetch theme definitions from config/themes.json
     * Called from init.js after DOM is ready.
     */
    async loadThemeDefinitions() {
        try {
            const res = await fetch('config/themes.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (!data.themes || typeof data.themes !== 'object') {
                console.warn('themes.json: missing "themes" object');
                return;
            }

            this.definitions = data.themes;
            this._loaded = true;

            // Use default theme from config if no user preference
            if (!localStorage.getItem('selectedTheme') && data.defaultTheme) {
                this.currentTheme = data.defaultTheme;
            }

            // Re-apply current theme with full definitions (ensures correctness)
            this.applyTheme(this.currentTheme);

            // Build dynamic theme switcher in settings dropdown
            this.buildThemeSwitcher();

        } catch (e) {
            console.warn('Could not load themes.json:', e.message);
        }
    },

    /**
     * Apply a theme by ID — sets CSS variables on :root
     */
    applyTheme(themeId) {
        const theme = this.definitions[themeId];
        if (!theme) return;

        const root = document.documentElement;

        // Determine the "base" theme (first in definitions or jr16)
        const baseId = Object.keys(this.definitions)[0] || 'jr16';

        if (themeId === baseId) {
            // Base theme is the CSS default — remove overrides so :root values take effect
            Object.keys(theme.colors).forEach(prop => {
                root.style.removeProperty(prop);
            });
        } else {
            // Clear any previous theme overrides first
            const baseTheme = this.definitions[baseId];
            if (baseTheme) {
                Object.keys(baseTheme.colors).forEach(prop => root.style.removeProperty(prop));
            }
            // Apply new theme
            Object.entries(theme.colors).forEach(([prop, value]) => {
                root.style.setProperty(prop, value);
            });
        }

        this.currentTheme = themeId;
        localStorage.setItem('selectedTheme', themeId);

        // Cache colors for flash-free restore on next page load
        localStorage.setItem('themeColors', JSON.stringify(theme.colors));

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

        // Update sparkle colors for the new theme
        if (window.sparkle) sparkle.refreshColors();

        // Toggle petal rain
        this.togglePetals(themeId);
    },

    changeTheme(themeId) {
        this.applyTheme(themeId);
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

        // Insert new theme options before the divider
        const divider = sibling; // This is the divider after themes
        Object.entries(this.definitions).forEach(([id, theme]) => {
            const opt = document.createElement('div');
            opt.className = 'settings-option';
            opt.onclick = () => themes.changeTheme(id);
            opt.innerHTML = `<span class="theme-icon">${theme.emoji || ''}</span> ${theme.name || id}`;
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
