/**
 * Configuration Loader
 * Loads all configuration files and makes them available globally
 */

const AppConfig = {
    app: null,
    languages: null,
    categories: null,
    mediaTypes: null,
    loaded: false,

    /**
     * Load all configuration files
     */
    async load() {
        try {
            const [appData, languagesData, categoriesData, mediaTypesData] = await Promise.all([
                fetch('config/app.json').then(r => r.json()),
                fetch('config/languages.json').then(r => r.json()),
                fetch('config/categories.json').then(r => r.json()),
                fetch('config/media-types.json').then(r => r.json())
            ]);

            this.app = appData;
            this.languages = languagesData;
            this.categories = categoriesData;
            this.mediaTypes = mediaTypesData;
            this.loaded = true;

            console.log('✅ Configuration loaded successfully');
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
        return category?.dataFile || `data/${categoryId}.json`;
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
