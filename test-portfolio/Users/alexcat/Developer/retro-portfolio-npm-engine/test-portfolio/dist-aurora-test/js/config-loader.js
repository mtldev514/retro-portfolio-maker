/**
 * Advanced Configuration Loader
 * Supports loading from local directories OR remote GitHub repository
 */

const ConfigLoader = {
    source: null,
    cache: {},

    /**
     * Initialize and load configuration source
     */
    async init() {
        try {
            // Check for override version from global config or query params
            const urlParams = new URLSearchParams(window.location.search);
            const overrideMode = urlParams.get('mode') || window.RETRO_CONFIG?.mode;
            const overrideData = urlParams.get('dataDir') || window.RETRO_CONFIG?.dataDir;

            // Load config-source.json to determine where to load from
            let response;
            try {
                response = await fetch('config-source.json');
            } catch (e) {
                console.warn('⚠️ No config-source.json found, using defaults');
            }

            this.source = response ? await response.json() : {
                mode: overrideMode || 'local',
                local: { configDir: 'config', dataDir: overrideData || 'data', langDir: 'lang' }
            };

            if (overrideMode) this.source.mode = overrideMode;
            if (overrideData) {
                if (!this.source.local) this.source.local = {};
                this.source.local.dataDir = overrideData;
            }

            console.log(`📦 Config mode: ${this.source.mode}`);

            if (this.source.mode === 'supabase') {
                console.log('🗄️ Loading from Supabase');
                return this.loadSupabase();
            } else if (this.source.mode === 'remote' && this.source.remote.enabled) {
                console.log(`🌐 Loading from remote: ${this.source.remote.repo}`);
                return this.loadRemote();
            } else if (this.source.mode === 'hybrid') {
                console.log('🔄 Trying remote, fallback to local');
                try {
                    return await this.loadRemote();
                } catch (error) {
                    console.warn('⚠️ Remote failed, using local:', error.message);
                    return this.loadLocal();
                }
            } else {
                console.log('💾 Loading from local directories');
                return this.loadLocal();
            }
        } catch (error) {
            console.error('❌ Error loading config-source.json:', error);
            console.log('🔄 Falling back to local mode');
            return this.loadLocal();
        }
    },

    /**
     * Load configuration from local directories
     */
    async loadLocal() {
        const configDir = this.source?.local?.configDir || 'config';
        const dataDir = this.source?.local?.dataDir || 'data';
        const langDir = this.source?.local?.langDir || 'lang';

        try {
            const [app, languages, categories, mediaTypes, display, adminSchema] = await Promise.all([
                fetch(`${configDir}/app.json`).then(r => r.json()),
                fetch(`${configDir}/languages.json`).then(r => r.json()),
                fetch(`${configDir}/categories.json`).then(r => r.json()),
                fetch(`${configDir}/media-types.json`).then(r => r.json()),
                fetch(`${configDir}/display.json`).then(r => r.json()).catch(() => null),
                fetch(`${configDir}/admin-schema.json`).then(r => r.json()).catch(() => null)
            ]);

            return {
                app,
                languages,
                categories,
                mediaTypes,
                display,
                adminSchema,
                source: 'local',
                paths: { configDir, dataDir, langDir }
            };
        } catch (error) {
            console.error('❌ Failed to load local config:', error);
            throw error;
        }
    },

    /**
     * Load configuration from Supabase database.
     * Fetches all config rows from the `config` table via PostgREST.
     */
    async loadSupabase() {
        const sb = this.source?.supabase;
        // Support both new (publishableKey) and legacy (anonKey) field names
        const apiKey = sb?.publishableKey || sb?.anonKey;
        if (!sb?.url || !apiKey) {
            const missing = !sb?.url ? 'url' : 'publishableKey';
            throw new Error(
                `Supabase config requires '${missing}' in config-source.json\n` +
                `  Expected format: { "supabase": { "url": "https://xxx.supabase.co", "publishableKey": "sb_publishable_..." } }`
            );
        }
        // Normalize: store the resolved key back so getSupabaseHeaders() can use it
        sb._resolvedKey = apiKey;

        try {
            const res = await fetch(`${sb.url}/rest/v1/config?select=key,value`, {
                headers: {
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!res.ok) throw new Error(`Supabase config fetch failed: ${res.status}`);

            const rows = await res.json();
            const configMap = {};
            rows.forEach(row => { configMap[row.key] = row.value; });

            return {
                app: configMap.app || {},
                languages: configMap.languages || {},
                categories: configMap.categories || {},
                mediaTypes: configMap['media-types'] || {},
                display: configMap.display || null,
                adminSchema: configMap['admin-schema'] || null,
                source: 'supabase',
                supabase: sb,
                paths: { configDir: 'config', dataDir: 'data', langDir: 'lang' }
            };
        } catch (error) {
            console.error('❌ Supabase config load failed:', error);
            throw error;
        }
    },

    /**
     * Get Supabase REST headers (for use by AppConfig fetch helpers)
     */
    getSupabaseHeaders() {
        const sb = this.source?.supabase;
        if (!sb) return null;
        const key = sb._resolvedKey || sb.publishableKey || sb.anonKey;
        return {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        };
    },

    /**
     * Load configuration from remote GitHub repository
     */
    async loadRemote() {
        if (!this.source?.remote?.enabled) {
            throw new Error('Remote config not enabled');
        }

        const baseUrl = this.source.remote.baseUrl;

        // Check cache first
        if (this.source.cache?.enabled && this.isCacheValid()) {
            console.log('💨 Using cached remote config');
            return this.cache.data;
        }

        try {
            const [app, languages, categories, mediaTypes, display, adminSchema] = await Promise.all([
                this.fetchRemote(`${baseUrl}config/app.json`),
                this.fetchRemote(`${baseUrl}config/languages.json`),
                this.fetchRemote(`${baseUrl}config/categories.json`),
                this.fetchRemote(`${baseUrl}config/media-types.json`),
                this.fetchRemote(`${baseUrl}config/display.json`).catch(() => null),
                this.fetchRemote(`${baseUrl}config/admin-schema.json`).catch(() => null)
            ]);

            const data = {
                app,
                languages,
                categories,
                mediaTypes,
                display,
                adminSchema,
                source: 'remote',
                paths: {
                    configDir: baseUrl + 'config',
                    dataDir: baseUrl + 'data',
                    langDir: baseUrl + 'lang'
                }
            };

            // Cache the result
            if (this.source.cache?.enabled) {
                this.cache = {
                    data,
                    timestamp: Date.now(),
                    duration: this.source.cache.duration * 1000
                };
            }

            return data;
        } catch (error) {
            console.error('❌ Failed to load remote config:', error);
            throw error;
        }
    },

    /**
     * Fetch from remote with error handling
     */
    async fetchRemote(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${url}`);
        }
        return response.json();
    },

    /**
     * Check if cache is still valid
     */
    isCacheValid() {
        if (!this.cache.timestamp) return false;
        const age = Date.now() - this.cache.timestamp;
        return age < this.cache.duration;
    },

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = {};
    },

    /**
     * Get data file path (adjusts for local vs remote)
     */
    getDataPath(filename) {
        if (!this.cache.data) return `data/${filename}`;
        return `${this.cache.data.paths.dataDir}/${filename}`;
    },

    /**
     * Get language file path
     */
    getLangPath(langCode) {
        if (!this.cache.data) return `lang/${langCode}.json`;
        return `${this.cache.data.paths.langDir}/${langCode}.json`;
    },

    /**
     * Get engine asset path
     */
    getEnginePath(path) {
        const baseUrl = window.RETRO_ENGINE_URL || '';
        return baseUrl + path.replace(/^\//, '');
    }
};

// Enhanced AppConfig that uses ConfigLoader
const AppConfig = {
    app: null,
    languages: null,
    categories: null,
    mediaTypes: null,
    display: null,
    adminSchema: null,
    loaded: false,
    source: 'local',
    paths: null,

    /**
     * Load all configuration files
     */
    async load() {
        try {
            const config = await ConfigLoader.init();

            this.app = config.app;
            this.languages = config.languages;
            this.categories = config.categories;
            this.mediaTypes = config.mediaTypes;
            this.display = config.display;
            this.adminSchema = config.adminSchema;
            this.source = config.source;
            this.paths = config.paths;
            this.supabaseConfig = config.supabase || null;
            this.loaded = true;

            console.log(`✅ Configuration loaded from ${config.source}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to load configuration:', error);
            return false;
        }
    },

    /**
     * Get API base URL
     */
    getApiUrl() {
        return this.app?.api?.baseUrl || 'http://127.0.0.1:5001';
    },

    /**
     * Get supported language codes
     */
    getLanguageCodes() {
        return this.languages?.supportedLanguages.map(l => l.code) || ['en'];
    },

    /**
     * Get default language
     */
    getDefaultLanguage() {
        return this.languages?.defaultLanguage || 'en';
    },

    /**
     * Get all categories
     */
    getAllCategories() {
        return this.categories?.categories || [];
    },

    /**
     * Get category configuration by ID
     */
    getCategory(categoryId) {
        return this.getAllCategories().find(c => c.id === categoryId);
    },

    /**
     * Get all media types
     */
    getAllMediaTypes() {
        return this.mediaTypes?.mediaTypes || [];
    },

    /**
     * Get media type configuration by ID
     */
    getMediaType(mediaTypeId) {
        return this.getAllMediaTypes().find(m => m.id === mediaTypeId);
    },

    /**
     * Get categories by media type
     */
    getCategoriesByMediaType(mediaTypeId) {
        return this.getAllCategories().filter(ct => ct.mediaType === mediaTypeId);
    },

    /**
     * Get categories that support galleries (based on display schema or media type config)
     */
    getGalleryCategories() {
        const galleryTypes = [];
        for (const cat of this.getAllCategories()) {
            const displayMt = this.display?.mediaTypes?.[cat.mediaType];
            const configMt = this.getMediaType(cat.mediaType);
            // Display schema takes precedence, then fall back to media-types.json
            const supportsGallery = displayMt?.supportsGallery ?? configMt?.supportsGallery ?? false;
            if (supportsGallery) galleryTypes.push(cat.id);
        }
        return galleryTypes;
    },

    /**
     * Get display schema for a category.
     * Falls back to auto-generated defaults based on mediaType.
     */
    getDisplaySchema(categoryId) {
        // Check display.json first
        const schema = this.display?.categories?.[categoryId];
        if (schema) return schema;

        // Fall back to legacy: icon from categories.json
        const cat = this.getCategory(categoryId);
        const legacyIcon = cat?.icon || '';

        // Auto-generate a reasonable default from mediaType
        const mtId = cat?.mediaType;
        const visualMap = { image: 'image', audio: 'play-button', video: 'icon', text: 'icon', link: 'icon' };
        const heroMap = { image: 'image-gallery', audio: 'play-inline', video: 'none', text: 'none', link: 'none' };

        return {
            icon: legacyIcon,
            card: {
                visual: visualMap[mtId] || 'icon',
                subtitle: null,
                badges: [],
                actions: []
            },
            detail: {
                hero: heroMap[mtId] || 'none',
                meta: [
                    { field: 'created', icon: '📅', labelKey: 'gallery_created_on' },
                    { field: 'date', icon: '📁', labelKey: 'gallery_added_on' }
                ],
                sections: [
                    { field: 'description', renderer: 'text-block', labelKey: 'detail_description' }
                ]
            }
        };
    },

    /**
     * Get display schema for a media type
     */
    getMediaTypeDisplay(mediaTypeId) {
        return this.display?.mediaTypes?.[mediaTypeId] || null;
    },

    /**
     * Get the reference file path for a category (UUID array).
     * e.g. "painting" → "data/painting.json"
     */
    getCategoryRefFile(categoryId) {
        return ConfigLoader.getDataPath(`${categoryId}.json`);
    },

    /**
     * Get the data file path for a media type (item data).
     * e.g. "image" → "data/image.json"
     */
    getMediaTypeDataFile(mediaTypeId) {
        const mt = this.getMediaType(mediaTypeId);
        if (mt && mt.dataFile) {
            const fileName = mt.dataFile.split('/').pop();
            return ConfigLoader.getDataPath(fileName);
        }
        return ConfigLoader.getDataPath(`${mediaTypeId}.json`);
    },

    /**
     * Get the media type for a given category.
     * e.g. "painting" → { id: "image", ... }
     */
    getMediaTypeForCategory(categoryId) {
        const ct = this.getCategory(categoryId);
        if (!ct) return null;
        return this.getMediaType(ct.mediaType);
    },

    /**
     * Get all categories that share the same media type.
     * e.g. "image" → [{id: "painting"}, {id: "drawing"}, ...]
     */
    getCategoriesForMediaType(mediaTypeId) {
        return this.getAllCategories().filter(ct => ct.mediaType === mediaTypeId);
    },

    /**
     * Get optional fields for a category.
     * Prefers admin-schema.json, falls back to categories.json fields.
     */
    getCategoryFields(categoryId) {
        // Admin schema takes precedence
        const adminFields = this.adminSchema?.categories?.[categoryId];
        if (adminFields) return adminFields.optional || [];
        // Fall back to legacy fields in categories.json
        const category = this.getCategory(categoryId);
        return category?.fields?.optional || [];
    },

    /**
     * Check if a field exists for a category
     */
    categoryHasField(categoryId, fieldName) {
        const fields = this.getCategoryFields(categoryId);
        return fields.some(f => f.name === fieldName);
    },

    /**
     * Create multilingual object with all supported languages
     */
    createMultilingualObject(value) {
        const obj = {};
        this.getLanguageCodes().forEach(code => {
            obj[code] = value;
        });
        return obj;
    },

    /**
     * Get app setting
     */
    getSetting(path) {
        const parts = path.split('.');
        let value = this.app;
        for (const part of parts) {
            value = value?.[part];
            if (value === undefined) return null;
        }
        return value;
    },

    // ─── Supabase-aware data fetchers ────────────────────────
    // These helpers let render.js and i18n.js load data without
    // caring whether the source is local files or Supabase.

    /**
     * Fetch all items for a media type.
     * Local: fetch data/{mediaType}.json
     * Supabase: GET /rest/v1/items?media_type=eq.{mediaType}
     * @returns {Array} items
     */
    async fetchMediaTypeItems(mediaTypeId) {
        if (this.source === 'supabase' && this.supabaseConfig) {
            const sb = this.supabaseConfig;
            const res = await fetch(
                `${sb.url}/rest/v1/items?media_type=eq.${encodeURIComponent(mediaTypeId)}&select=*`,
                { headers: ConfigLoader.getSupabaseHeaders() }
            );
            return res.ok ? res.json() : [];
        }
        // Default: local file
        const filePath = this.getMediaTypeDataFile(mediaTypeId);
        const res = await fetch(filePath);
        return res.ok ? res.json() : [];
    },

    /**
     * Fetch category reference array (ordered UUIDs).
     * Local: fetch data/{category}.json → plain array
     * Supabase: GET /rest/v1/category_refs?category_id=eq.{cat} → [{refs:[...]}]
     * @returns {Array<string>} UUID array
     */
    async fetchCategoryRefs(categoryId) {
        if (this.source === 'supabase' && this.supabaseConfig) {
            const sb = this.supabaseConfig;
            const res = await fetch(
                `${sb.url}/rest/v1/category_refs?category_id=eq.${encodeURIComponent(categoryId)}&select=refs`,
                { headers: ConfigLoader.getSupabaseHeaders() }
            );
            if (!res.ok) return [];
            const rows = await res.json();
            return rows.length > 0 ? rows[0].refs : [];
        }
        // Default: local file
        const refPath = this.getCategoryRefFile(categoryId);
        const res = await fetch(refPath);
        return res.ok ? res.json() : [];
    },

    /**
     * Fetch translations for a language.
     * Local: fetch lang/{code}.json → plain object
     * Supabase: GET /rest/v1/translations?lang_code=eq.{code} → [{data:{...}}]
     * @returns {object} translation key-value pairs
     */
    async fetchTranslation(langCode) {
        if (this.source === 'supabase' && this.supabaseConfig) {
            const sb = this.supabaseConfig;
            const res = await fetch(
                `${sb.url}/rest/v1/translations?lang_code=eq.${encodeURIComponent(langCode)}&select=data`,
                { headers: ConfigLoader.getSupabaseHeaders() }
            );
            if (!res.ok) return {};
            const rows = await res.json();
            return rows.length > 0 ? rows[0].data : {};
        }
        // Default: local file
        const langPath = ConfigLoader.getLangPath(langCode);
        const res = await fetch(langPath);
        return res.ok ? res.json() : {};
    }
};

// Export for use in other modules
window.AppConfig = AppConfig;
window.ConfigLoader = ConfigLoader;
