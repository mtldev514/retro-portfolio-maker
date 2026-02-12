/**
 * Party Mode Manager
 * Combines Glitter Text, Sparkles, and Floating GIFs
 */

const effects = {
    partyModeEnabled: false,
    gifElements: [],

    // 🎨 Add your sparkle/particle GIF URLs here!
    partyGifs: [
        'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnIzdm5ka3VsaWN0MThldGlkNDh0OGk2YnBkZGE4N3pzZmIyMXZjNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/wCzQ2B5MUGC6FxJ7Kl/giphy.gif',
        'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHB0enZqM3U1aTVrbHVveTVrb2hlaTM3OTU3MGhqY3RjYzN5bjZ2OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/hWM5xcVje9cQscDLbP/giphy.gif',
        'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXpqdm9oaTc2MmplN2x6dDBqZ2ozczRzeTJ6cHd0emx3aDN6bmxlayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/igJG6snZqV8uEE7wQv/giphy.gif',
        // Add more GIF URLs here as you find them!
    ],

    init() {
        // Load saved preferences
        this.partyModeEnabled = localStorage.getItem('party-mode-enabled') === 'true';

        if (this.partyModeEnabled) {
            this.enablePartyMode();
        }

        this.updateIndicators();
        this.injectAdminButton();
    },

    injectAdminButton() {
        // Only show admin button on localhost
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' ||
                           hostname === '127.0.0.1' ||
                           hostname === '::1' ||
                           hostname === '' ||
                           hostname.startsWith('192.168.') ||
                           hostname.startsWith('10.') ||
                           hostname.endsWith('.local');

        if (!isLocalhost) return;

        // Find the settings dropdown
        const settingsDropdown = document.querySelector('.settings-dropdown');
        if (!settingsDropdown) return;

        // Create admin button section
        const adminSection = document.createElement('div');
        adminSection.innerHTML = `
            <div class="settings-divider"></div>
            <div class="settings-section-label">Development</div>
            <a href="admin.html" class="settings-option admin-link" style="text-decoration: none; color: inherit;">
                <span class="admin-icon">🛠️</span> Admin Panel
            </a>
        `;

        // Append to the end of settings dropdown
        settingsDropdown.appendChild(adminSection);
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

        // 3. Enable Floating GIFs
        this.createFloatingGifs();
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

        // 3. Remove Floating GIFs
        this.removeFloatingGifs();
    },

    createFloatingGifs() {
        // Clear any existing GIFs first
        this.removeFloatingGifs();

        if (this.partyGifs.length === 0) return;

        // Create 8-12 floating GIF elements for nice coverage
        const gifCount = Math.min(12, Math.max(8, this.partyGifs.length * 3));

        for (let i = 0; i < gifCount; i++) {
            // Pick a random GIF from the array
            const randomGif = this.partyGifs[Math.floor(Math.random() * this.partyGifs.length)];

            const gif = document.createElement('img');
            gif.src = randomGif;
            gif.className = 'party-gif';

            // Random positioning
            gif.style.left = Math.random() * 100 + '%';
            gif.style.top = Math.random() * 100 + '%';

            // Random size (20-60px for variety)
            const size = 20 + Math.random() * 40;
            gif.style.width = size + 'px';
            gif.style.height = 'auto';

            // Random animation delay for staggered effect
            gif.style.animationDelay = (Math.random() * 5) + 's';

            // Random animation duration (10-20s)
            gif.style.animationDuration = (10 + Math.random() * 10) + 's';

            document.body.appendChild(gif);
            this.gifElements.push(gif);
        }
    },

    removeFloatingGifs() {
        this.gifElements.forEach(gif => {
            if (gif.parentNode) {
                gif.parentNode.removeChild(gif);
            }
        });
        this.gifElements = [];
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
