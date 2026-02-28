/**
 * Modern View Renderer
 * Schema-driven: reads display.json to decide how each category renders.
 * No hardcoded category names — new categories work out-of-the-box.
 */

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
    PAGE_SIZE: 24,
    visibleCount: 0,
    _loadMoreObserver: null,

    async loadCategoryConfig() {
        // Skip if already loaded (returning from detail view)
        if (Object.keys(this.categories).length > 0) return;

        if (!window.AppConfig || !window.AppConfig.loaded) {
            await window.AppConfig?.load();
        }

        const allCategories = window.AppConfig?.getAllCategories() || [];

        allCategories.forEach(cat => {
            this.categories[cat.id] = { mediaType: cat.mediaType };
            const displaySchema = window.AppConfig?.getDisplaySchema(cat.id);
            this.categoryIcons[cat.id] = displaySchema?.icon || cat.icon || '';
        });

        this.PAGE_SIZE = window.AppConfig?.getSetting('pagination.pageSize') || 24;
    },

    /** Resolve translatable field to current language */
    t(field) {
        if (!field) return '';
        if (typeof field === 'object' && !Array.isArray(field)) {
            const lang = (window.i18n && i18n.currentLang) || 'en';
            return field[lang] || field.en || '';
        }
        return field;
    },

    async init() {
        await this.loadCategoryConfig();

        // Skip re-fetch if data is already loaded (returning from detail view)
        if (this.allItems.length === 0) {
            // 1. Fetch media-type data (source of truth for item objects)
            const mediaTypes = window.AppConfig?.getAllMediaTypes() || [];
            const mediaData = {};

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
                    const items = mediaData[cat.mediaType] || [];
                    const itemMap = new Map(items.map(i => [i.id, i]));

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
        this.allItems.sort((a, b) => {
            const da = a.created || a.date || '';
            const db = b.created || b.date || '';
            return -1 * da.localeCompare(db); // desc
        });
    },

    renderGrid() {
        const app = document.getElementById('app');
        if (!app) return;

        const oldGrid = document.getElementById('gallery-container');
        if (oldGrid) oldGrid.remove();

        this.filteredItems = this.activeFilter === 'all'
            ? [...this.allItems]
            : this.allItems.filter(i => i._category === this.activeFilter);

        this.visibleCount = 0;

        const container = document.createElement('div');
        container.id = 'gallery-container';
        container.className = 'gallery-grid';
        app.appendChild(container);

        this.loadMoreItems();

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

        // Clean up entrance classes
        if (!(window.page && window.page.reducedMotion)) {
            const maxDelay = batch.length * 35 + 300;
            setTimeout(() => {
                container.querySelectorAll('.gallery-item.entering').forEach(item => {
                    item.classList.remove('entering');
                    item.style.removeProperty('--item-index');
                });
            }, maxDelay);
        }

        // "Load More" button if more items remain
        if (this.visibleCount < this.filteredItems.length) {
            const remaining = this.filteredItems.length - this.visibleCount;
            const btn = document.createElement('button');
            btn.id = 'load-more-btn';
            btn.className = 'load-more-btn';
            btn.textContent = `Show More (${remaining} remaining)`;
            btn.onclick = () => this.loadMoreItems();
            container.appendChild(btn);

            // Auto-load when scrolled into view
            if ('IntersectionObserver' in window) {
                this._loadMoreObserver = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        this._loadMoreObserver.unobserve(btn);
                        this.loadMoreItems();
                    }
                }, { rootMargin: '200px' });
                this._loadMoreObserver.observe(btn);
            }
        }
    },

    createGalleryItem(item) {
        const el = document.createElement('div');
        el.className = 'gallery-item';
        el.setAttribute('data-category', item._category);

        const schema = window.AppConfig?.getDisplaySchema(item._category);
        const card = schema?.card || {};
        const title = this.t(item.title);
        const itemId = item.id || title;

        // Visual area
        let visualHtml = '';
        if (card.visual === 'image' && item.url) {
            visualHtml = `<div class="gallery-item-visual"><img src="${item.url}" alt="${title}" loading="lazy"></div>`;
        } else if (card.visual === 'play-button') {
            visualHtml = `<div class="gallery-item-visual"><div class="gallery-item-play">&#9654;</div></div>`;
        } else if (card.visual === 'icon') {
            const icon = this.categoryIcons[item._category] || '';
            visualHtml = `<div class="gallery-item-visual"><div class="gallery-item-icon">${icon}</div></div>`;
        } else if (item.url) {
            visualHtml = `<div class="gallery-item-visual"><img src="${item.url}" alt="${title}" loading="lazy"></div>`;
        } else {
            const icon = this.categoryIcons[item._category] || '';
            visualHtml = `<div class="gallery-item-visual"><div class="gallery-item-icon">${icon}</div></div>`;
        }

        // Subtitle
        let subtitleHtml = '';
        if (card.subtitle) {
            const val = this.t(item[card.subtitle.field]);
            if (val) {
                const formatted = card.subtitle.format === 'parenthesized' ? `(${val})` : val;
                subtitleHtml = `<div class="gallery-item-subtitle">${formatted}</div>`;
            }
        }

        // Badges
        let badgesHtml = '';
        if (card.badges) {
            const badges = card.badges.map(b => {
                const val = item[b.field];
                return b.map?.[val] || '';
            }).filter(Boolean);
            if (badges.length) {
                badgesHtml = `<div class="gallery-item-badges">${badges.map(b => `<span class="gallery-item-badge">${b}</span>`).join('')}</div>`;
            }
        }

        el.innerHTML = visualHtml +
            `<div class="gallery-item-info">
                <div class="gallery-item-title">${title}</div>
                ${subtitleHtml}
                ${badgesHtml}
            </div>`;

        // Actions (card-level links like GitHub, Website)
        if (card.actions) {
            const evalCond = (cond) => !cond || item[cond.field] === cond.equals;
            for (const action of card.actions) {
                if (!evalCond(action.condition)) continue;
                if (!action.links) continue;
                const links = action.links
                    .filter(l => item[l.field])
                    .map(l => {
                        const t = (window.i18n && i18n.translations[l.labelKey]) || l.labelKey;
                        return `<a href="${item[l.field]}" target="_blank" onclick="event.stopPropagation()">${_svgIcons[l.icon] || ''} ${t}</a>`;
                    });
                if (links.length) {
                    el.innerHTML += `<div class="gallery-item-actions">${links.join('')}</div>`;
                }
            }
        }

        // Click → detail page
        el.addEventListener('click', (e) => {
            if (e.target.closest('a')) return; // don't intercept action links
            const detailUrl = `detail.html?id=${encodeURIComponent(itemId)}&from=${item._from}`;
            if (window.router) {
                router.navigate(detailUrl);
            } else {
                window.location.href = detailUrl;
            }
        });

        return el;
    },

    setupFilters() {
        const filterNav = document.getElementById('filter-nav');
        if (!filterNav) return;

        filterNav.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                if (filter === this.activeFilter) return;

                filterNav.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.activeFilter = filter;
                this.renderGrid();
            });
        });
    }
};

window.renderer = renderer;
