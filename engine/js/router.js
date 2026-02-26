/**
 * SPA Router for Alex's Portfolio
 * Two states: grid view (unified gallery) and detail view (single item)
 */
const router = {
    currentRoute: null,

    async init() {
        // Intercept internal link clicks (only <a> elements, not <button>)
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.startsWith(window.location.origin) && !link.getAttribute('target')) {
                e.preventDefault();
                this.navigate(link.href);
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.loadPage(window.location.pathname + window.location.search);
        });

        // GitHub Pages SPA redirect
        const redirectPath = sessionStorage.getItem('spa-redirect');
        if (redirectPath) {
            sessionStorage.removeItem('spa-redirect');
            window.history.replaceState({}, '', redirectPath);
        }

        // Load initial page
        await this.loadPage(window.location.pathname + window.location.search);

    },

    isDetailRoute(url) {
        return (typeof url === 'string' ? url : '').split('#')[0].includes('detail.html');
    },

    async navigate(url) {
        window.history.pushState({}, '', url);
        await this.loadPage(url);
    },

    async loadPage(url) {
        const app = document.getElementById('app');

        if (this.isDetailRoute(url)) {
            // DETAIL VIEW: load detail.html fragment
            this.currentRoute = 'detail';

            // Save filter bar children, then swap in a Back button
            let filterNav = document.getElementById('filter-nav');
            if (filterNav) {
                this._savedFilterNav = filterNav;
                this._savedFilterChildren = Array.from(filterNav.children);
                filterNav.innerHTML = '';
            } else {
                // Direct URL access: create filter bar dynamically
                filterNav = document.createElement('div');
                filterNav.id = 'filter-nav';
                filterNav.className = 'filter-bar';
                this._savedFilterNav = filterNav;
                this._savedFilterChildren = null;
            }

            // Create full-width Back button
            const backBtn = document.createElement('button');
            backBtn.className = 'filter-btn filter-btn-back';
            const t = (key, fallback) => (window.i18n && i18n.translations[key]) || fallback;
            backBtn.textContent = '\u2B05 ' + t('detail_back', 'Back');
            backBtn.addEventListener('click', () => router.navigate('index.html'));
            filterNav.appendChild(backBtn);

            try {
                const response = await fetch('pages/detail.html');
                if (!response.ok) throw new Error('Could not load detail page');
                const html = await response.text();
                app.innerHTML = html;

                // Prepend filter bar (with Back button) above detail content
                app.prepend(this._savedFilterNav);

                // Re-execute inline scripts
                app.querySelectorAll('script').forEach(oldScript => {
                    const newScript = document.createElement('script');
                    newScript.textContent = oldScript.textContent;
                    oldScript.replaceWith(newScript);
                });

                if (window.i18n) window.i18n.updateDOM();
            } catch (error) {
                console.error('Detail load error:', error);
                const t = (key, fb) => (window.i18n && i18n.translations[key]) || fb;
                app.innerHTML = '';
                app.prepend(this._savedFilterNav);
                const msg = document.createElement('div');
                msg.innerHTML = `<p class="empty-message">${t('detail_error', 'Could not load item details.')}</p>
                    <p align="center"><a href="index.html" class="btn">${t('gallery_back', 'Back to Home')}</a></p>`;
                app.appendChild(msg);
            }
        } else {
            // GRID VIEW: render unified gallery
            this.currentRoute = 'grid';

            // Restore filter bar with original children
            if (this._savedFilterNav) {
                if (this._savedFilterChildren) {
                    this._savedFilterNav.innerHTML = '';
                    this._savedFilterChildren.forEach(child => this._savedFilterNav.appendChild(child));
                    this._savedFilterChildren = null;
                }
                app.innerHTML = '';
                app.appendChild(this._savedFilterNav);
            }

            if (window.renderer) {
                await renderer.init();
            }
        }

        window.scrollTo(0, 0);
    }
};

// router.init() is called by init.js — no auto-run needed
window.router = router;
