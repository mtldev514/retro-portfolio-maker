/* ═══════════════════════════════════════════════════════════
   AURORA VIEW — render.js
   Gallery rendering, filtering, pagination
   ═══════════════════════════════════════════════════════════ */

const renderer = (() => {

    let allItems = [];
    let activeFilter = 'all';
    let currentPage = 0;
    let pageSize = 24;

    /* ── Multilingual field resolver ───────────────────── */

    function t(field) {
        if (!field) return '';
        if (typeof field === 'object' && !Array.isArray(field)) {
            const lang = (window.i18n && i18n.currentLang) || 'en';
            return field[lang] || field.en || Object.values(field)[0] || '';
        }
        return field;
    }

    /* ── Init ──────────────────────────────────────────── */

    async function init() {
        pageSize = AppConfig.getSetting('pagination.pageSize') || 24;
        allItems = await loadAllItems();
        renderGallery();
        wireFilters();
        wirePagination();
    }

    /* ── Load all items from all categories ────────────── */

    async function loadAllItems() {
        const categories = AppConfig.getAllCategories() || [];
        const mediaTypes = AppConfig.getAllMediaTypes() || [];
        const items = [];

        // Build mediaType item map
        const mtItemMap = {};
        for (const mt of mediaTypes) {
            try {
                const mtItems = await AppConfig.fetchMediaTypeItems(mt.id);
                mtItemMap[mt.id] = mtItems || [];
            } catch { mtItemMap[mt.id] = []; }
        }

        // Resolve category refs → tagged items
        for (const cat of categories) {
            try {
                const refs = await AppConfig.fetchCategoryRefs(cat.id);
                const pool = mtItemMap[cat.mediaType] || [];
                const poolMap = {};
                pool.forEach(item => { poolMap[item.id] = item; });

                (refs || []).forEach(uuid => {
                    const item = poolMap[uuid];
                    if (item && !items.find(i => i.id === item.id)) {
                        items.push({ ...item, _category: cat.id, _mediaType: cat.mediaType });
                    }
                });
            } catch {}
        }

        return items;
    }

    /* ── Render ────────────────────────────────────────── */

    function renderGallery() {
        const grid = document.getElementById('gallery-grid');
        if (!grid) return;

        const filtered = activeFilter === 'all'
            ? allItems
            : allItems.filter(i => i._category === activeFilter);

        const pageItems = filtered.slice(0, (currentPage + 1) * pageSize);

        grid.innerHTML = '';

        pageItems.forEach((item, idx) => {
            const card = createCard(item, idx);
            grid.appendChild(card);
        });

        // Load more visibility
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = pageItems.length < filtered.length ? '' : 'none';
        }

        // Update i18n on new DOM
        if (window.i18n && i18n.updateDOM) i18n.updateDOM();
    }

    /* ── Card Builder ──────────────────────────────────── */

    function createCard(item, index) {
        const el = document.createElement('div');
        el.className = 'gallery-item';
        el.dataset.category = item._category || '';
        el.style.animationDelay = `${Math.min(index * 0.06, 0.6)}s`;

        const schema = AppConfig.getDisplaySchema?.(item._category) || {};
        const cardSchema = schema.card || {};
        const visualType = cardSchema.visual || 'image';

        // ── Visual ──
        const visual = document.createElement('div');
        visual.className = 'gallery-item-visual';

        if (visualType === 'image' && item.url) {
            const img = document.createElement('img');
            img.src = item.url;
            img.alt = t(item.title) || '';
            img.loading = 'lazy';
            img.onerror = () => { img.style.display = 'none'; };
            visual.appendChild(img);
        } else if (visualType === 'play-button') {
            const overlay = document.createElement('div');
            overlay.className = 'play-overlay';
            overlay.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
            visual.appendChild(overlay);

            // If there's a thumbnail, show it
            if (item.thumbnail || item.url) {
                const img = document.createElement('img');
                img.src = item.thumbnail || item.url;
                img.alt = t(item.title) || '';
                img.loading = 'lazy';
                visual.insertBefore(img, overlay);
            }
        } else {
            // Icon fallback
            const cat = AppConfig.getCategory?.(item._category);
            const iconEl = document.createElement('div');
            iconEl.className = 'icon-visual';
            iconEl.textContent = cat?.icon || '◆';
            visual.appendChild(iconEl);
        }

        el.appendChild(visual);

        // ── Info ──
        const info = document.createElement('div');
        info.className = 'gallery-item-info';

        const title = document.createElement('div');
        title.className = 'gallery-item-title';
        title.textContent = t(item.title) || 'Untitled';
        info.appendChild(title);

        // Subtitle from schema
        if (cardSchema.subtitle && item[cardSchema.subtitle.field]) {
            const sub = document.createElement('div');
            sub.className = 'gallery-item-subtitle';
            const val = t(item[cardSchema.subtitle.field]);
            sub.textContent = cardSchema.subtitle.format === 'parenthesized' ? `(${val})` : val;
            info.appendChild(sub);
        }

        // Badges from schema
        if (cardSchema.badges) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'gallery-item-badges';
            cardSchema.badges.forEach(b => {
                const raw = item[b.field];
                if (raw && b.map && b.map[raw]) {
                    const badge = document.createElement('span');
                    badge.className = 'gallery-item-badge';
                    badge.textContent = b.map[raw];
                    badgeContainer.appendChild(badge);
                }
            });
            if (badgeContainer.children.length) info.appendChild(badgeContainer);
        }

        el.appendChild(info);

        // ── Click → Detail ──
        el.addEventListener('click', () => openDetail(item));

        return el;
    }

    /* ── Detail View ───────────────────────────────────── */

    function openDetail(item) {
        const overlay = document.getElementById('detail-overlay');
        const content = document.getElementById('detail-content');
        if (!overlay || !content) return;

        const schema = AppConfig.getDisplaySchema?.(item._category) || {};
        const detailSchema = schema.detail || {};

        let html = '<article class="detail-page">';

        // Hero
        const heroType = detailSchema.hero || 'image-gallery';
        html += '<div class="detail-hero">';
        if (heroType === 'image-gallery' && item.url) {
            html += `<img src="${item.url}" alt="${t(item.title)}" onclick="openLightbox('${item.url}', '${t(item.title).replace(/'/g, "\\'")}')">`;
        } else if (heroType === 'play-inline' && item.url) {
            html += `<audio controls src="${item.url}" style="width:100%;margin:20px 0;"></audio>`;
        }
        html += '</div>';

        // Title & meta
        html += '<div class="detail-meta-bar">';
        html += `<h1 class="detail-title">${t(item.title) || 'Untitled'}</h1>`;

        if (detailSchema.meta && detailSchema.meta.length) {
            html += '<div class="detail-meta">';
            detailSchema.meta.forEach(m => {
                const val = t(item[m.field]);
                if (val) {
                    html += `<span class="detail-meta-item">${m.icon || ''} ${val}</span>`;
                }
            });
            html += '</div>';
        }
        html += '</div>';

        // Sections
        if (detailSchema.sections) {
            html += '<div class="detail-body">';
            detailSchema.sections.forEach(s => {
                const val = t(item[s.field]);
                if (val) {
                    html += `<h3 data-i18n="${s.labelKey || ''}">${s.labelKey || s.field}</h3>`;
                    html += `<p>${val}</p>`;
                }
            });
            html += '</div>';
        }

        // Actions
        if (schema.card?.actions) {
            html += '<div class="detail-actions">';
            schema.card.actions.forEach(action => {
                const conditionMet = !action.condition || item[action.condition.field] === action.condition.equals;
                if (conditionMet && action.links) {
                    action.links.forEach(link => {
                        const url = item[link.field];
                        if (url) {
                            html += `<a class="detail-action-link" href="${url}" target="_blank" rel="noopener">
                                ${link.icon ? `<span>${link.icon}</span>` : ''}
                                <span data-i18n="${link.labelKey || ''}">${link.labelKey || link.field}</span>
                            </a>`;
                        }
                    });
                }
            });
            html += '</div>';
        }

        html += '</article>';

        content.innerHTML = html;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        if (window.i18n && i18n.updateDOM) i18n.updateDOM();

        // Close handler
        const closeBtn = document.getElementById('detail-close');
        const closeDetail = () => {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        };
        if (closeBtn) closeBtn.onclick = closeDetail;
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { closeDetail(); document.removeEventListener('keydown', esc); }
        });
    }

    /* ── Filters ───────────────────────────────────────── */

    function wireFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.filter || 'all';
                currentPage = 0;
                renderGallery();
                // Smooth scroll to gallery
                document.getElementById('filters-section')?.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    /* ── Pagination ────────────────────────────────────── */

    function wirePagination() {
        const btn = document.getElementById('load-more');
        if (btn) {
            btn.addEventListener('click', () => {
                currentPage++;
                renderGallery();
            });
        }

        // Optional: IntersectionObserver auto-load
        const sentinel = document.getElementById('gallery-sentinel');
        if (sentinel && 'IntersectionObserver' in window) {
            const obs = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting) {
                    const filtered = activeFilter === 'all'
                        ? allItems
                        : allItems.filter(i => i._category === activeFilter);
                    if ((currentPage + 1) * pageSize < filtered.length) {
                        currentPage++;
                        renderGallery();
                    }
                }
            }, { rootMargin: '200px' });
            obs.observe(sentinel);
        }
    }

    /* ── Public rerender (for language changes) ────────── */

    function rerender() {
        renderGallery();
    }

    return { init, rerender };

})();
