/**
 * Pastel View — Renderer
 * Loads all items via AppConfig, builds gallery cards with magazine layout.
 */
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
