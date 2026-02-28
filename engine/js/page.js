/**
 * Page lifecycle state machine (core — available to all views)
 *   loading → revealing → ready ←→ navigating
 * Reduced-motion or back_forward navigation skips straight to ready.
 */
const page = {
    state: 'loading',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    _readyQueue: [],

    /** Register a callback that fires when state reaches 'ready'. */
    onReady(fn) {
        if (this.state === 'ready') {
            Promise.resolve().then(fn);
        } else {
            this._readyQueue.push(fn);
        }
    },

    _enterReady() {
        if (this.state === 'ready') return;
        this.state = 'ready';
        document.documentElement.classList.add('skip-reveal');
        this._readyQueue.forEach(fn => fn());
        this._readyQueue = [];
    },

    _enterRevealing() {
        this.state = 'revealing';
        document.body.classList.add('loaded');

        if (this.reducedMotion) {
            this._enterReady();
            return;
        }

        // Wait for last animated element (#filter-nav) to finish
        const filterNav = document.getElementById('filter-nav');
        if (filterNav) {
            filterNav.addEventListener('animationend', () => this._enterReady(), { once: true });
        }
        // Ultimate fallback — 6s covers the full CSS cascade
        setTimeout(() => this._enterReady(), 6000);
    },

    /** Fade out loading screen, then begin reveal (or skip to ready). */
    dismissLoadingScreen() {
        const navType = performance.getEntriesByType('navigation')[0]?.type;
        const skipReveal = this.reducedMotion || navType === 'back_forward';

        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            let settled = false;
            const onDone = () => {
                if (settled) return;
                settled = true;
                loadingScreen.remove();
                if (skipReveal) {
                    document.body.classList.add('loaded');
                    this._enterReady();
                } else {
                    this._enterRevealing();
                }
            };
            loadingScreen.classList.add('fade-out');
            loadingScreen.addEventListener('transitionend', onDone, { once: true });
            setTimeout(onDone, 600); // safety fallback (1.5× the 400ms CSS transition)
        } else {
            document.body.classList.add('loaded');
            if (skipReveal) {
                this._enterReady();
            } else {
                this._enterRevealing();
            }
        }
    }
};
window.page = page;
