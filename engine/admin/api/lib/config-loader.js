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
   * Get all content type definitions (categories)
   */
  getContentTypes() {
    if (!this.categoriesConfig) return [];
    return this.categoriesConfig.contentTypes || this.categoriesConfig.categories || [];
  }

  getContentType(id) {
    return this.getContentTypes().find(ct => ct.id === id) || null;
  }

  /**
   * Get absolute data file path for a category
   */
  getCategoryDataFile(categoryId) {
    const ct = this.getContentType(categoryId);
    let filename = `${categoryId}.json`;
    if (ct && ct.dataFile) {
      filename = ct.dataFile.replace('data/', '');
    }
    return path.join(this.dataDir, filename);
  }

  /**
   * Get mapping of category ID → absolute data file path
   */
  getCategoryMap() {
    const map = {};
    for (const ct of this.getContentTypes()) {
      map[ct.id] = this.getCategoryDataFile(ct.id);
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
