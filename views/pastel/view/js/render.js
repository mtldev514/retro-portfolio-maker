/**
 * Pastel View — Renderer
 * Loads all items via AppConfig, builds gallery cards with magazine layout.
 */

// SVG icon registry — maps icon names to SVG markup
const _svgIcons = {
    'github': '<svg class="icon" viewBox="0 0 24 24"><path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0012 .3z"/></svg>',
    'external-link': '<svg class="icon" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>'
};

const renderer = (() => {
    let allItems = [];
    let currentFilter = 'all';
    let displayedCount = 0;
    let pageSize = 24;

    /** Resolve multilingual fields */
    function t(field) {
        if (!field) return '';
        if (typeof field === 'object' && !Array.isArray(field)) {
            const lang = (window.i18n && i18n.currentLang) || 'en';
            return field[lang] || field.en || Object.values(field)[0] || '';
        }
        return field;
    }

    /** Load all items from all media types, tagged by category */
    async function loadItems() {
        const categories = AppConfig.getAllCategories() || [];
        const mediaTypes = AppConfig.getAllMediaTypes() || [];
        const items = [];

        // Fetch all media type items into a map by ID
        const itemMap = new Map();
        for (const mt of mediaTypes) {
            const mtItems = await AppConfig.fetchMediaTypeItems(mt.id);
            if (mtItems) {
                mtItems.forEach(item => {
                    item._mediaType = mt.id;
                    itemMap.set(item.id, item);
                });
            }
        }

        // Resolve categories → items with ordering
        for (const cat of categories) {
            const refs = await AppConfig.fetchCategoryRefs(cat.id);
            if (refs) {
                refs.forEach(refId => {
                    const item = itemMap.get(refId);
                    if (item && !items.find(i => i.id === item.id && i._category === cat.id)) {
                        items.push({ ...item, _category: cat.id });
                    }
                });
            }
        }

        return items;
    }

    /** Check if action condition is met */
    function _evalCondition(condition, item) {
        if (!condition) return true;
        return item[condition.field] === condition.equals;
    }

    /** Render action links (external URLs, GitHub, etc.) */
    function _renderCardActions(cardSchema, item) {
        if (!cardSchema?.actions || cardSchema.actions.length === 0) return null;

        const actions = document.createElement('div');
        actions.className = 'gallery-item-actions';
        let hasActions = false;

        for (const action of cardSchema.actions) {
            if (!_evalCondition(action.condition, item)) continue;
            if (!action.links) continue;

            // Find first matching link, or fallback link
            const link = action.links.find(l => item[l.field]) ||
                         action.links.find(l => l.fallback && item[l.field]);
            if (!link || !item[link.field]) continue;

            const label = (window.i18n && i18n.translations?.[link.labelKey]) || link.labelKey;
            const svg = _svgIcons[link.icon] || '';

            const actionBtn = document.createElement('a');
            actionBtn.href = item[link.field];
            actionBtn.target = '_blank';
            actionBtn.className = 'gallery-item-action-btn';
            actionBtn.innerHTML = `${svg} ${label}`;
            actionBtn.addEventListener('click', (e) => e.stopPropagation());

            actions.appendChild(actionBtn);
            hasActions = true;
        }

        return hasActions ? actions : null;
    }

    /** Build a single gallery card */
    function buildCard(item, index) {
        const card = document.createElement('div');
        card.className = 'gallery-item';
        card.dataset.category = item._category || '';
        card.dataset.itemId = item.id;
        card.style.setProperty('--delay', `${index * 50}ms`);

        // Get display schema for this category
        const schema = AppConfig.getDisplaySchema?.(item._category);
        const cardSchema = schema?.card;
        const visualType = cardSchema?.visual || 'image';

        // Visual
        const visualWrap = document.createElement('div');
        visualWrap.className = 'gallery-item-visual';

        if (visualType === 'image' && item.url) {
            const img = document.createElement('img');
            const dataDir = AppConfig.getSetting('paths.dataDir') || 'data';
            img.src = item.url.startsWith('http') ? item.url : `${dataDir}/${item.url}`;
            img.alt = t(item.title) || '';
            img.loading = 'lazy';
            visualWrap.appendChild(img);
        } else if (visualType === 'play-button') {
            const play = document.createElement('div');
            play.className = 'gallery-item-play';
            play.textContent = '▶';
            visualWrap.appendChild(play);
        } else {
            const icon = document.createElement('div');
            icon.className = 'gallery-item-icon';
            const cat = AppConfig.getCategory?.(item._category);
            icon.textContent = cat?.icon || '◆';
            visualWrap.appendChild(icon);
        }

        card.appendChild(visualWrap);

        // Info
        const info = document.createElement('div');
        info.className = 'gallery-item-info';

        const title = document.createElement('div');
        title.className = 'gallery-item-title';
        title.textContent = t(item.title) || '';
        info.appendChild(title);

        // Subtitle from schema
        if (cardSchema?.subtitle?.field && item[cardSchema.subtitle.field]) {
            const sub = document.createElement('div');
            sub.className = 'gallery-item-subtitle';
            const val = t(item[cardSchema.subtitle.field]);
            if (cardSchema.subtitle.format === 'parenthesized') {
                sub.textContent = `(${val})`;
            } else {
                sub.textContent = val;
            }
            info.appendChild(sub);
        }

        // Badges from schema
        if (cardSchema?.badges) {
            cardSchema.badges.forEach(badgeDef => {
                const val = item[badgeDef.field];
                if (val && badgeDef.map?.[val]) {
                    const badge = document.createElement('span');
                    badge.className = 'gallery-item-badge';
                    badge.textContent = badgeDef.map[val];
                    info.appendChild(badge);
                }
            });
        }

        card.appendChild(info);

        // Click → detail
        card.addEventListener('click', () => {
            if (typeof router !== 'undefined') {
                router.showDetail(item);
            }
        });

        // Render action links (external URLs, etc.) if any
        const actions = _renderCardActions(cardSchema, item);
        if (actions) {
            card.appendChild(actions);
        }

        return card;
    }

    /** Render or re-render the grid */
    function renderGrid(items, append = false) {
        const grid = document.getElementById('gallery-grid');
        if (!grid) return;

        if (!append) {
            grid.innerHTML = '';
            displayedCount = 0;
        }

        const filtered = currentFilter === 'all'
            ? items
            : items.filter(i => i._category === currentFilter);

        const batch = filtered.slice(displayedCount, displayedCount + pageSize);
        batch.forEach((item, i) => {
            grid.appendChild(buildCard(item, displayedCount + i));
        });

        displayedCount += batch.length;

        // Load more button
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            loadMoreBtn.hidden = displayedCount >= filtered.length;
        }
    }

    return {
        async init() {
            pageSize = AppConfig.getSetting('pagination.pageSize') || 24;
            allItems = await loadItems();
            renderGrid(allItems);

            // Load more
            const loadMoreBtn = document.getElementById('load-more');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', () => {
                    renderGrid(allItems, true);
                });
            }
        },

        filter(category) {
            currentFilter = category;
            displayedCount = 0;
            renderGrid(allItems);
        },

        reRender() {
            displayedCount = 0;
            renderGrid(allItems);
        }
    };
})();
