/**
 * Pastel View — Router
 * Overlay-based detail view with pushState navigation.
 */
const router = (() => {

    /** Resolve multilingual fields */
    function t(field) {
        if (!field) return '';
        if (typeof field === 'object' && !Array.isArray(field)) {
            const lang = (window.i18n && i18n.currentLang) || 'en';
            return field[lang] || field.en || Object.values(field)[0] || '';
        }
        return field;
    }

    /** Build detail view from item + display schema */
    function buildDetail(item) {
        const schema = AppConfig.getDisplaySchema?.(item._category);
        const detailSchema = schema?.detail;
        const dataDir = AppConfig.getSetting('paths.dataDir') || 'data';

        const wrap = document.createElement('div');

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'detail-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => hideDetail());
        wrap.appendChild(closeBtn);

        // Hero
        const heroType = detailSchema?.hero || 'image-gallery';
        if (heroType === 'image-gallery' && item.url) {
            const hero = document.createElement('div');
            hero.className = 'detail-hero';
            const img = document.createElement('img');
            img.src = item.url.startsWith('http') ? item.url : `${dataDir}/${item.url}`;
            img.alt = t(item.title) || '';
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', () => openLightbox(img.src));
            hero.appendChild(img);
            wrap.appendChild(hero);
        } else if (heroType === 'play-inline' && item.url) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = item.url.startsWith('http') ? item.url : `${dataDir}/${item.url}`;
            audio.style.width = '100%';
            audio.style.marginBottom = '1.5rem';
            wrap.appendChild(audio);
        }

        // Title
        const title = document.createElement('h2');
        title.className = 'detail-title';
        title.textContent = t(item.title) || '';
        wrap.appendChild(title);

        // Meta
        if (detailSchema?.meta?.length) {
            const meta = document.createElement('div');
            meta.className = 'detail-meta';
            detailSchema.meta.forEach(m => {
                const val = item[m.field];
                if (val) {
                    const span = document.createElement('span');
                    span.className = 'detail-meta-item';
                    span.textContent = `${m.icon || ''} ${t(val)}`.trim();
                    meta.appendChild(span);
                }
            });
            if (meta.children.length) wrap.appendChild(meta);
        }

        // Sections
        if (detailSchema?.sections?.length) {
            detailSchema.sections.forEach(sec => {
                const val = item[sec.field];
                if (!val) return;

                const section = document.createElement('div');
                section.className = 'detail-section';

                if (sec.labelKey) {
                    const label = document.createElement('div');
                    label.className = 'detail-section-label';
                    label.setAttribute('data-i18n', sec.labelKey);
                    label.textContent = (i18n.translations?.[sec.labelKey]) || sec.labelKey;
                    section.appendChild(label);
                }

                const content = document.createElement('div');
                content.className = 'detail-section-content';
                content.textContent = t(val);
                section.appendChild(content);

                wrap.appendChild(section);
            });
        }

        // Action links
        const cardSchema = schema?.card;
        if (cardSchema?.actions?.length) {
            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'detail-actions';

            cardSchema.actions.forEach(action => {
                // Check condition
                if (action.condition) {
                    const fieldVal = item[action.condition.field];
                    if (action.condition.equals && fieldVal !== action.condition.equals) return;
                }

                (action.links || []).forEach(link => {
                    const url = item[link.field];
                    if (!url) return;

                    const a = document.createElement('a');
                    a.className = 'detail-action-link';
                    a.href = url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = (i18n.translations?.[link.labelKey]) || link.labelKey || link.field;
                    actionsWrap.appendChild(a);
                });
            });

            if (actionsWrap.children.length) wrap.appendChild(actionsWrap);
        }

        return wrap;
    }

    /** Lightbox */
    function openLightbox(src) {
        const lb = document.createElement('div');
        lb.className = 'detail-lightbox';
        const img = document.createElement('img');
        img.src = src;
        lb.appendChild(img);
        lb.addEventListener('click', () => lb.remove());
        document.body.appendChild(lb);
    }

    /** Show detail overlay */
    function showDetail(item) {
        const overlay = document.getElementById('detail-overlay');
        const container = document.getElementById('detail-content');
        if (!overlay || !container) return;

        container.innerHTML = '';
        container.appendChild(buildDetail(item));

        overlay.hidden = false;
        // Trigger transition
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });

        // Push state
        history.pushState({ detail: item.id }, '', `#/item/${item.id}`);
        page.state = 'navigating';

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /** Hide detail overlay */
    function hideDetail() {
        const overlay = document.getElementById('detail-overlay');
        if (!overlay) return;

        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.hidden = true;
            document.getElementById('detail-content').innerHTML = '';
        }, 300);

        document.body.style.overflow = '';
        page.state = 'ready';

        if (location.hash.startsWith('#/item/')) {
            history.pushState(null, '', location.pathname);
        }
    }

    return {
        init() {
            // Handle back/forward
            window.addEventListener('popstate', () => {
                if (location.hash.startsWith('#/item/')) {
                    // Could re-open detail if we had item cache, for now just close
                } else {
                    hideDetail();
                }
            });

            // Escape key closes detail
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') hideDetail();
            });

            // Click outside detail content closes it
            const overlay = document.getElementById('detail-overlay');
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) hideDetail();
                });
            }
        },

        showDetail,
        hideDetail
    };
})();
