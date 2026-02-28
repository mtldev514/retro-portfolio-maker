/**
 * Modern View SPA Router
 * Two states: grid view (gallery) and detail view (single item)
 * Uses fade transitions instead of CRT blink.
 */
const router = {
    currentRoute: null,

    async init() {
        // Intercept internal link clicks
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

        await this.loadPage(window.location.pathname + window.location.search);
    },

    isDetailRoute(url) {
        return (typeof url === 'string' ? url : '').split('#')[0].includes('detail.html');
    },

    async navigate(url) {
        window.history.pushState({}, '', url);
        await this.loadPage(url);
    },

    /** Fade transition: fade out → swap content → fade in */
    async _transition(fn) {
        const app = document.getElementById('app');
        if (!app || (window.page && window.page.reducedMotion)) {
            await fn();
            return;
        }

        if (window.page) page.state = 'navigating';

        // Fade out
        app.classList.add('page-exit');
        await new Promise(r => setTimeout(r, 150));
        app.classList.remove('page-exit');

        // DOM swap
        await fn();

        // Fade in
        app.classList.add('page-enter');
        await new Promise(r => setTimeout(r, 200));
        app.classList.remove('page-enter');

        if (window.page) page.state = 'ready';
    },

    /** Save the nav-row (filter bar + radio pill) before detail view */
    _saveNavRow() {
        const navRow = document.querySelector('.nav-row');
        if (navRow) {
            this._savedNavRow = navRow;
            const filterNav = document.getElementById('filter-nav');
            if (filterNav) {
                this._savedFilterChildren = Array.from(filterNav.children);
                filterNav.innerHTML = '';
            }
        }
    },

    /** Restore the nav-row when returning to grid */
    _restoreNavRow() {
        if (!this._savedNavRow) return;

        const filterNav = document.getElementById('filter-nav') || this._savedNavRow.querySelector('#filter-nav');
        if (filterNav && this._savedFilterChildren) {
            filterNav.innerHTML = '';
            this._savedFilterChildren.forEach(child => filterNav.appendChild(child));
            this._savedFilterChildren = null;
        }
    },

    async loadPage(url) {
        const app = document.getElementById('app');

        if (this.isDetailRoute(url)) {
            this.currentRoute = 'detail';

            // Save full nav row, set up back button
            this._saveNavRow();

            const filterNav = document.getElementById('filter-nav');
            const backBtn = document.createElement('button');
            backBtn.className = 'filter-btn filter-btn-back';
            const t = (key, fallback) => (window.i18n && i18n.translations[key]) || fallback;
            backBtn.textContent = '\u2190 ' + t('detail_back', 'Back');
            backBtn.addEventListener('click', () => router.navigate('index.html'));
            if (filterNav) filterNav.appendChild(backBtn);

            try {
                const response = await fetch('pages/detail.html');
                if (!response.ok) throw new Error('Could not load detail page');
                const html = await response.text();

                await this._transition(() => {
                    app.innerHTML = html;
                    if (this._savedNavRow) app.prepend(this._savedNavRow);

                    // Re-execute inline scripts
                    app.querySelectorAll('script').forEach(oldScript => {
                        const newScript = document.createElement('script');
                        newScript.textContent = oldScript.textContent;
                        oldScript.replaceWith(newScript);
                    });

                    if (window.i18n) window.i18n.updateDOM();
                });
            } catch (error) {
                console.error('Detail load error:', error);
                const t = (key, fb) => (window.i18n && i18n.translations[key]) || fb;
                app.innerHTML = '';
                if (this._savedNavRow) app.prepend(this._savedNavRow);
                const msg = document.createElement('div');
                msg.innerHTML = `<p class="empty-message">${t('detail_error', 'Could not load item details.')}</p>
                    <p style="text-align:center"><a href="index.html" class="btn">${t('gallery_back', 'Back to Home')}</a></p>`;
                app.appendChild(msg);
            }
        } else {
            // Grid view
            this.currentRoute = 'grid';

            await this._transition(async () => {
                this._restoreNavRow();

                if (this._savedNavRow) {
                    app.innerHTML = '';
                    app.appendChild(this._savedNavRow);
                }

                if (window.renderer) {
                    await renderer.init();
                }
            });
        }

        window.scrollTo(0, 0);
    }
};

window.router = router;
