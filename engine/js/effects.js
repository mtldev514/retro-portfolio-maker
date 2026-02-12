/**
 * Party Mode Manager
 * Combines Glitter Text and Sparkles
 */

const effects = {
    partyModeEnabled: false,

    init() {
        // Load saved preferences
        this.partyModeEnabled = localStorage.getItem('party-mode-enabled') === 'true';

        if (this.partyModeEnabled) {
            this.enablePartyMode();
        }

        this.updateIndicators();
    },

    enablePartyMode() {
        document.body.classList.add('party-mode');

        // 1. Enable Glitter Text
        const title = document.getElementById('page-title');
        if (title && !title.classList.contains('glitter-text')) {
            title.classList.add('glitter-text');
        }
        document.querySelectorAll('.gallery-item h3').forEach(h3 => {
            if (!h3.classList.contains('glitter-text-alt')) {
                h3.classList.add('glitter-text-alt');
            }
        });

        // 2. Enable Sparkles
        if (window.sparkle && window.sparkle.enable) {
            window.sparkle.enable();
        }
    },

    disablePartyMode() {
        document.body.classList.remove('party-mode');

        // 1. Disable Glitter Text
        const title = document.getElementById('page-title');
        if (title) {
            title.classList.remove('glitter-text');
        }
        document.querySelectorAll('.gallery-item h3').forEach(h3 => {
            h3.classList.remove('glitter-text-alt');
        });

        // 2. Disable Sparkles
        if (window.sparkle && window.sparkle.disable) {
            window.sparkle.disable();
        }
    },

    updateIndicators() {
        const indicator = document.getElementById('party-mode-indicator');
        if (indicator) {
            indicator.textContent = this.partyModeEnabled ? '✨' : '○';
        }
    }
};

// Global toggle function
window.togglePartyMode = function () {
    effects.partyModeEnabled = !effects.partyModeEnabled;
    localStorage.setItem('party-mode-enabled', effects.partyModeEnabled);

    if (effects.partyModeEnabled) {
        effects.enablePartyMode();
    } else {
        effects.disablePartyMode();
    }
    effects.updateIndicators();
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => effects.init());
} else {
    effects.init();
}

// Re-apply glitter to new gallery items when they're rendered
const observer = new MutationObserver(() => {
    if (effects.partyModeEnabled) {
        document.querySelectorAll('.gallery-item h3:not(.glitter-text-alt)').forEach(h3 => {
            h3.classList.add('glitter-text-alt');
        });
    }
});

observer.observe(document.body, { childList: true, subtree: true });

window.effects = effects;
