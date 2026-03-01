/**
 * Configuration Loader for Admin API
 * Port of Python config_loader.py — loads all config JSON files
 * and provides utility methods for the admin backend.
 */

const fs = require('fs-extra');
const path = require('path');

class ConfigLoader {
  constructor(contentRoot) {
    this.contentRoot = contentRoot ? path.resolve(contentRoot) : process.cwd();
    this.configDir = path.join(this.contentRoot, 'config');
    this.dataDir = path.join(this.contentRoot, 'data');
    this.langDir = path.join(this.contentRoot, 'lang');

    this.appConfig = null;
    this.languagesConfig = null;
    this.categoriesConfig = null;
    this.mediaTypesConfig = null;
    this.displayConfig = null;
    this.adminSchemaConfig = null;
  }

  /**
   * Override directory paths (called by admin API with env vars)
   */
  setDirs({ configDir, dataDir, langDir }) {
    if (configDir) this.configDir = path.resolve(configDir);
    if (dataDir) this.dataDir = path.resolve(dataDir);
    if (langDir) this.langDir = path.resolve(langDir);
  }

  /**
   * Load all configuration files from disk
   */
  loadAll() {
    try {
      // Ensure directories exist
      for (const dir of [this.configDir, this.dataDir, this.langDir]) {
        fs.ensureDirSync(dir);
      }

      this.appConfig = fs.readJsonSync(path.join(this.configDir, 'app.json'));
      this.languagesConfig = fs.readJsonSync(path.join(this.configDir, 'languages.json'));
      this.categoriesConfig = fs.readJsonSync(path.join(this.configDir, 'categories.json'));
      this.mediaTypesConfig = fs.readJsonSync(path.join(this.configDir, 'media-types.json'));
      try { this.displayConfig = fs.readJsonSync(path.join(this.configDir, 'display.json')); } catch { /* optional */ }
      try { this.adminSchemaConfig = fs.readJsonSync(path.join(this.configDir, 'admin-schema.json')); } catch { /* optional */ }

      console.log(`\u2705 Configuration loaded from ${this.contentRoot}`);
      return true;
    } catch (e) {
      console.error(`\u274C Failed to load configuration: ${e.message}`);
      return false;
    }
  }

  getPort() {
    return (this.appConfig && this.appConfig.api && this.appConfig.api.port) || 5001;
  }

  getHost() {
    return (this.appConfig && this.appConfig.api && this.appConfig.api.host) || '127.0.0.1';
  }

  /**
   * Get list of supported language codes (e.g. ['en', 'fr'])
   */
  getLanguageCodes() {
    const langs = this.languagesConfig && this.languagesConfig.supportedLanguages;
    if (!Array.isArray(langs)) return ['en'];
    return langs.map(l => l.code);
  }

  getDefaultLanguage() {
    return (this.languagesConfig && this.languagesConfig.defaultLanguage) || 'en';
  }

  /**
   * Get all category definitions
   */
  getCategories() {
    if (!this.categoriesConfig) return [];
    return this.categoriesConfig.categories || [];
  }

  getCategory(id) {
    return this.getCategories().find(ct => ct.id === id) || null;
  }

  /**
   * Get absolute path to a category's reference file.
   * In the normalized model, category files contain UUID arrays.
   * e.g. "painting" → "/path/to/data/painting.json"
   */
  getCategoryRefFile(categoryId) {
    return path.join(this.dataDir, `${categoryId}.json`);
  }

  /**
   * Get absolute data file path for a media type.
   * e.g. "image" → "/path/to/data/image.json"
   */
  getMediaTypeDataFile(mediaTypeId) {
    const mt = this.getMediaType(mediaTypeId);
    if (mt && mt.dataFile) {
      const filename = mt.dataFile.replace(/^data\//, '');
      return path.join(this.dataDir, filename);
    }
    return path.join(this.dataDir, `${mediaTypeId}.json`);
  }

  /**
   * Get the media type for a given category.
   * e.g. "painting" → { id: "image", name: "Image", ... }
   */
  getMediaTypeForCategory(categoryId) {
    const ct = this.getCategory(categoryId);
    if (!ct) return null;
    return this.getMediaType(ct.mediaType);
  }

  /**
   * Get all categories that share the same media type.
   * e.g. "image" → [{id: "painting"}, {id: "drawing"}, ...]
   */
  getCategoriesForMediaType(mediaTypeId) {
    return this.getCategories().filter(ct => ct.mediaType === mediaTypeId);
  }

  /**
   * Get mapping of category ID → absolute reference file path.
   */
  getCategoryMap() {
    const map = {};
    for (const ct of this.getCategories()) {
      map[ct.id] = this.getCategoryRefFile(ct.id);
    }
    return map;
  }

  /**
   * Get mapping of media type ID → absolute data file path.
   */
  getMediaTypeMap() {
    const map = {};
    for (const mt of this.getMediaTypes()) {
      map[mt.id] = this.getMediaTypeDataFile(mt.id);
    }
    return map;
  }

  /**
   * Get all media type definitions
   */
  getMediaTypes() {
    if (!this.mediaTypesConfig) return [];
    return this.mediaTypesConfig.mediaTypes || [];
  }

  getMediaType(id) {
    return this.getMediaTypes().find(mt => mt.id === id) || null;
  }

  /**
   * Get GitHub configuration from app.json
   */
  getGithubConfig() {
    return (this.appConfig && this.appConfig.github) || {};
  }

  /**
   * Get full GitHub repo path (e.g. "username/repoName")
   */
  getGithubRepo() {
    const gh = this.getGithubConfig();
    if (gh.username && gh.repoName) return `${gh.username}/${gh.repoName}`;
    return gh.repo || 'yourusername/retro-portfolio';
  }

  /**
   * Create a multilingual object with all supported languages
   * e.g. createMultilingualObject("Hello") → { en: "Hello", fr: "Hello" }
   */
  createMultilingualObject(value) {
    const obj = {};
    for (const code of this.getLanguageCodes()) {
      obj[code] = value;
    }
    return obj;
  }

  /**
   * Get display schema for a category from display.json
   */
  getDisplaySchema(categoryId) {
    return this.displayConfig?.categories?.[categoryId] || null;
  }

  /**
   * Get admin form schema for a category from admin-schema.json
   */
  getAdminSchema(categoryId) {
    return this.adminSchemaConfig?.categories?.[categoryId] || null;
  }

  /**
   * Get app setting by dot-notation path (e.g. 'api.port')
   */
  getSetting(dotPath) {
    const parts = dotPath.split('.');
    let value = this.appConfig;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    return value;
  }
}

// Singleton instance (matches Python's global `config = ConfigLoader()`)
const config = new ConfigLoader();

module.exports = { ConfigLoader, config };
