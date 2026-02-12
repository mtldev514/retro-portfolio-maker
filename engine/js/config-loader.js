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

            if (this.source.mode === 'remote' && this.source.remote.enabled) {
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
            const [app, languages, categories, mediaTypes] = await Promise.all([
                fetch(`${configDir}/app.json`).then(r => r.json()),
                fetch(`${configDir}/languages.json`).then(r => r.json()),
                fetch(`${configDir}/categories.json`).then(r => r.json()),
                fetch(`${configDir}/media-types.json`).then(r => r.json())
            ]);

            return {
                app,
                languages,
                categories,
                mediaTypes,
                source: 'local',
                paths: { configDir, dataDir, langDir }
            };
        } catch (error) {
            console.error('❌ Failed to load local config:', error);
            throw error;
        }
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
            const [app, languages, categories, mediaTypes] = await Promise.all([
                this.fetchRemote(`${baseUrl}config/app.json`),
                this.fetchRemote(`${baseUrl}config/languages.json`),
                this.fetchRemote(`${baseUrl}config/categories.json`),
                this.fetchRemote(`${baseUrl}config/media-types.json`)
            ]);

            const data = {
                app,
                languages,
                categories,
                mediaTypes,
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
            this.source = config.source;
            this.paths = config.paths;
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
     * Get all content types
     */
    getAllContentTypes() {
        return this.categories?.contentTypes || this.categories?.categories || [];
    },

    /**
     * Get content type configuration by ID
     */
    getContentType(contentTypeId) {
        return this.getAllContentTypes().find(c => c.id === contentTypeId);
    },

    /**
     * Get category configuration by ID (legacy, returns content type)
     */
    getCategory(categoryId) {
        return this.getContentType(categoryId);
    },

    /**
     * Get all categories (legacy, returns content types)
     */
    getAllCategories() {
        return this.getAllContentTypes();
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
     * Get content types by media type
     */
    getContentTypesByMedia(mediaTypeId) {
        return this.getAllContentTypes().filter(ct => ct.mediaType === mediaTypeId);
    },

    /**
     * Get categories that support galleries (based on media type)
     */
    getGalleryCategories() {
        const galleryTypes = [];
        for (const ct of this.getAllContentTypes()) {
            const mediaType = this.getMediaType(ct.mediaType);
            if (mediaType && mediaType.supportsGallery) {
                galleryTypes.push(ct.id);
            }
        }
        return galleryTypes;
    },

    /**
     * Get data file path for a category
     */
    getCategoryDataFile(categoryId) {
        const category = this.getCategory(categoryId);
        if (!category) return `data/${categoryId}.json`;

        // If remote, return full URL, otherwise relative path
        const fileName = category.dataFile.split('/').pop();
        return ConfigLoader.getDataPath(fileName);
    },

    /**
     * Get optional fields for a category
     */
    getCategoryFields(categoryId) {
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
    }
};

// Export for use in other modules
window.AppConfig = AppConfig;
window.ConfigLoader = ConfigLoader;
