/* ═══════════════════════════════════════════════════════════
   AURORA VIEW — router.js
   Minimal hash-based SPA router
   Routes: #/ (gallery) | #/detail/:id (item detail)
   ═══════════════════════════════════════════════════════════ */

const router = (() => {

    function init() {
        window.addEventListener('hashchange', handleRoute);
        // Initial route is handled by init.js flow (gallery renders by default)
    }

    function handleRoute() {
        const hash = location.hash || '#/';

        if (hash.startsWith('#/detail/')) {
            // Detail routes could be handled here if needed
            // Currently detail is overlay-based, not hash-routed
        } else {
            // Gallery route — close any open detail
            const overlay = document.getElementById('detail-overlay');
            if (overlay) overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    function navigateTo(path) {
        location.hash = path;
    }

    return { init, navigateTo };

})();
