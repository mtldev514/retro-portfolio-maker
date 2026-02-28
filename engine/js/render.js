/**
 * Unified Render Engine
 * Schema-driven: reads display.json to decide how each category renders.
 * No hardcoded category names — new categories work out-of-the-box.
 */

// SVG icon registry — maps icon names used in display.json to SVG markup
const _svgIcons = {
    'github': '<svg class="icon" viewBox="0 0 24 24"><path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0012 .3z"/></svg>',
    'external-link': '<svg class="icon" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>'
};

const renderer = {
    categories: {},
    categoryIcons: {},

    allItems: [],
    filteredItems: [],
    activeFilter: 'all',
    sortOrder: 'desc',
    PAGE_SIZE: 24,
    visibleCount: 0,
    _loadMoreObserver: null,

    // Load category configuration dynamically
    async loadCategoryConfig() {
        if (!window.AppConfig || !window.AppConfig.loaded) {
            await window.AppConfig?.load();
        }

        const allCategories = window.AppConfig?.getAllCategories() || [];

        this.categories = {};
        this.categoryIcons = {};

        allCategories.forEach(cat => {
            this.categories[cat.id] = {
                mediaType: cat.mediaType
            };
            // Display schema icons take precedence, fall back to categories.json
            const displaySchema = window.AppConfig?.getDisplaySchema(cat.id);
            this.categoryIcons[cat.id] = displaySchema?.icon || cat.icon || '';
        });

        // Update PAGE_SIZE from config
        this.PAGE_SIZE = window.AppConfig?.getSetting('pagination.pageSize') || 24;
    },

    t(field) {
        if (!field) return '';
        if (typeof field === 'object' && !Array.isArray(field)) {
            const lang = (window.i18n && i18n.currentLang) || 'en';
            return field[lang] || field.en || '';
        }
        return field;
    },

    async init() {
        // Load category configuration first
        await this.loadCategoryConfig();

        // Skip re-fetch if data is already loaded (returning from detail view)
        if (this.allItems.length === 0) {
            // ─── Normalized data loading ─────────────────────
            // Uses AppConfig fetch helpers — works with both local files and Supabase.
            // 1. Fetch media-type data (source of truth for item objects)
            const mediaTypes = window.AppConfig?.getAllMediaTypes() || [];
            const mediaData = {}; // { image: [...items], audio: [...items] }

            await Promise.all(mediaTypes.map(async (mt) => {
                try {
                    mediaData[mt.id] = await window.AppConfig.fetchMediaTypeItems(mt.id);
                } catch {
                    mediaData[mt.id] = [];
                }
            }));

            // 2. Fetch category refs → resolve UUIDs → tagged items
            const allCategories = window.AppConfig?.getAllCategories() || [];

            await Promise.all(allCategories.map(async (cat) => {
                try {
                    const refs = await window.AppConfig.fetchCategoryRefs(cat.id);

                    // Build UUID → item lookup for this media type
                    const items = mediaData[cat.mediaType] || [];
                    const itemMap = new Map(items.map(i => [i.id, i]));

                    // Resolve in ref order, tag with category
                    const resolved = refs
                        .map(uuid => itemMap.get(uuid))
                        .filter(Boolean)
                        .map(item => ({ ...item, _category: cat.id, _from: cat.id }));

                    this.allItems.push(...resolved);
                } catch {
                    // Empty or missing category — skip
                }
            }));

            this.sortItems();
        }

        this.renderGrid();
        this.setupFilters();
        if (window.i18n) window.i18n.updateDOM();
    },

    sortItems() {
        const dir = this.sortOrder === 'desc' ? -1 : 1;
        this.allItems.sort((a, b) => {
            const da = a.created || a.date || '';
            const db = b.created || b.date || '';
            return dir * da.localeCompare(db);
        });
    },

    renderGrid() {
        const app = document.getElementById('app');
        if (!app) return;

        // Remove old grid but keep the filter bar
        const oldGrid = document.getElementById('gallery-container');
        if (oldGrid) oldGrid.remove();

        // Build filtered list
        this.filteredItems = this.activeFilter === 'all'
            ? [...this.allItems]
            : this.allItems.filter(i => i._category === this.activeFilter);

        this.visibleCount = 0;

        const container = document.createElement('div');
        container.id = 'gallery-container';
        container.className = 'gallery-grid';
        app.appendChild(container);

        this.loadMoreItems();

        // Empty message
        if (this.filteredItems.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.id = 'empty-filter-msg';
            emptyMsg.className = 'empty-message';
            emptyMsg.textContent = (window.i18n && i18n.translations.filter_empty) || 'Nothing here yet.';
            container.appendChild(emptyMsg);
        }
    },

    loadMoreItems() {
        const container = document.getElementById('gallery-container');
        if (!container) return;

        const batch = this.filteredItems.slice(this.visibleCount, this.visibleCount + this.PAGE_SIZE);
        const frag = document.createDocumentFragment();
        batch.forEach(item => frag.appendChild(this.createGalleryItem(item)));

        // Remove old load-more button before appending
        const oldBtn = document.getElementById('load-more-btn');
        if (oldBtn) {
            if (this._loadMoreObserver) this._loadMoreObserver.unobserve(oldBtn);
            oldBtn.remove();
        }

        // Staggered entrance animation
        if (!(window.page && window.page.reducedMotion)) {
            let index = 0;
            frag.querySelectorAll('.gallery-item').forEach(item => {
                item.classList.add('entering');
                item.style.setProperty('--item-index', index++);
            });
        }

        container.appendChild(frag);
        this.visibleCount += batch.length;

        // Clean up entrance animation classes
        if (!(window.page && window.page.reducedMotion)) {
            const itemCount = batch.length;
            const maxDelay = itemCount * 35 + 120;
            setTimeout(() => {
                container.querySelectorAll('.gallery-item.entering').forEach(item => {
                    item.classList.remove('entering');
                    item.style.removeProperty('--item-index');
                });
            }, maxDelay);
        }

        // Add "Load More" if more items remain
        if (this.visibleCount < this.filteredItems.length) {
            const remaining = this.filteredItems.length - this.visibleCount;
            const btn = document.createElement('button');
            btn.id = 'load-more-btn';
            btn.className = 'load-more-btn';
            btn.textContent = `Show More (${remaining} remaining)`;
            btn.onclick = () => this.loadMoreItems();
            container.appendChild(btn);

            // Auto-load on scroll into view
            if (!this._loadMoreObserver) {
                this._loadMoreObserver = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) this.loadMoreItems();
                }, { rootMargin: '200px' });
            }
            this._loadMoreObserver.observe(btn);
        }
    },

    // ─── Schema-driven sub-renderers ─────────────────────────

    _evalCondition(condition, item) {
        if (!condition) return true;
        return item[condition.field] === condition.equals;
    },

    _renderCardVisual(visualType, item, schema) {
        const icon = schema?.icon || this.categoryIcons[item._category] || '';
        switch (visualType) {
            case 'image': {
                if (!item.url) return `<div class="card-icon">${icon}</div>`;
                const pileCount = (item.gallery && item.gallery.length) ? item.gallery.length + 1 : 0;
                const pileBadge = pileCount > 1 ? `<span class="pile-badge">📷 ${pileCount}</span>` : '';
                return `<div class="gallery-img-wrap"><img src="${item.url}" alt="${this.t(item.title)}" loading="lazy">${pileBadge}</div>`;
            }
            case 'play-button': {
                if (item.url) {
                    const playLabel = (window.i18n && i18n.translations.music_play_me) || 'Play Me';
                    return `<button class="music-card-play" data-track-url="${item.url.replace(/"/g, '&quot;')}" title="${playLabel}">&#9654;</button>`;
                }
                return `<div class="card-icon">${icon || '&#127925;'}</div>`;
            }
            case 'icon':
            default:
                return `<div class="card-icon">${icon}</div>`;
        }
    },

    _renderCardSubtitle(subtitleSchema, item) {
        if (!subtitleSchema) return '';
        const value = this.t(item[subtitleSchema.field]);
        if (!value) return '';
        const text = subtitleSchema.format === 'parenthesized' ? `(${value})` : value;
        return `<p align="center" class="gallery-subtitle">${text}</p>`;
    },

    _renderBadges(badges, item) {
        if (!badges || badges.length === 0) return '';
        return badges
            .filter(b => item[b.field])
            .map(b => b.map?.[item[b.field]] || '')
            .join(' ');
    },

    _renderCardActions(actions, item) {
        if (!actions || actions.length === 0) return '';
        const parts = [];
        for (const action of actions) {
            if (!this._evalCondition(action.condition, item)) continue;
            if (!action.links) continue;
            // Find first matching link, or fallback link
            const link = action.links.find(l => item[l.field]) ||
                         action.links.find(l => l.fallback && item[l.field]);
            if (!link || !item[link.field]) continue;
            const label = (window.i18n && i18n.translations[link.labelKey]) || link.labelKey;
            const svg = _svgIcons[link.icon] || '';
            parts.push(`<div class="card-actions">
                <a href="${item[link.field]}" target="_blank" class="card-action-btn" onclick="event.stopPropagation()">
                    ${svg} ${label}
                </a>
            </div>`);
        }
        return parts.join('');
    },

    _renderPileLabel(item) {
        const pileCount = (item.gallery && item.gallery.length) ? item.gallery.length + 1 : 0;
        if (pileCount <= 1) return '';
        return `<p align="center" class="gallery-subtitle pile-label">📷 ${pileCount} photos</p>`;
    },

    // ─── Main gallery item builder ────────────────────────────

    createGalleryItem(item) {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.setAttribute('data-category', item._category);

        const title = this.t(item.title);
        const dateStr = item.created || item.date || 'N/A';
        const dateLabel = item.created ? 'gallery_created_on' : 'gallery_added_on';
        const dateFallback = item.created ? 'Created:' : 'Added:';
        const itemId = item.id || (typeof item.title === 'string' ? item.title : (item.title && item.title.en) || '');
        const from = item._from || 'gallery';
        const detailHref = `detail.html?id=${encodeURIComponent(itemId)}&from=${from}`;

        // Load display schema for this category
        const schema = window.AppConfig?.getDisplaySchema(item._category);
        const card = schema?.card || {};
        const visualType = card.visual || 'icon';

        const visualHtml = this._renderCardVisual(visualType, item, schema);
        const subtitleHtml = this._renderCardSubtitle(card.subtitle, item);
        const badgeHtml = this._renderBadges(card.badges, item);
        const pileHtml = this._renderPileLabel(item);
        const actionsHtml = this._renderCardActions(card.actions, item);

        div.innerHTML = `
            <a href="${detailHref}" class="gallery-link">
                ${visualHtml}
                <h3 align="center">${title} ${badgeHtml}</h3>
                ${subtitleHtml}
                ${pileHtml}
                <p align="center" class="item-date">
                    <span data-i18n="${dateLabel}">${dateFallback}</span> ${dateStr}
                </p>
            </a>
            ${actionsHtml}
        `;

        // Wire up play button behavior for audio visual type
        if (visualType === 'play-button') {
            const playBtn = div.querySelector('.music-card-play');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const url = playBtn.dataset.trackUrl;
                    if (window.media && media.playlist) {
                        const idx = media.playlist.findIndex(p => p.src === url);
                        if (idx >= 0) media.switchTrack(idx);
                    }
                });
            }
        }

        return div;
    },

    setupFilters() {
        const nav = document.getElementById('filter-nav');
        if (!nav || nav._filtersSetUp) return;
        nav._filtersSetUp = true;

        nav.addEventListener('click', (e) => {
            // Filter buttons
            const btn = e.target.closest('.filter-btn:not(.filter-btn-back)');
            if (btn) {
                // End page-load reveal immediately so new grid doesn't replay it
                if (window.page && window.page.state !== 'ready') page._enterReady();

                nav.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeFilter = btn.dataset.filter;

                // Animate exit, then re-render with entrance animation
                const grid = document.getElementById('gallery-container');
                if (grid && !(window.page && window.page.reducedMotion)) {
                    grid.querySelectorAll('.gallery-item').forEach(item => item.classList.add('exiting'));
                    setTimeout(() => {
                        this.renderGrid();
                        if (window.i18n) window.i18n.updateDOM();
                    }, 80);
                } else {
                    this.renderGrid();
                    if (window.i18n) window.i18n.updateDOM();
                }
                return;
            }
        });
    }
};

window.renderer = renderer;
