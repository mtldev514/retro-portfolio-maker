/**
 * @mtldev514/retro-portfolio-maker
 * Main entry point for the package
 */

const path = require('path');

module.exports = {
  // Path to engine core files (admin panel, core JS, config defaults)
  enginePath: path.join(__dirname, 'engine'),

  // Path to built-in views directory
  viewsPath: path.join(__dirname, 'views'),

  // Core JS files available to all views (injected into dist/js/ by build)
  coreJsFiles: ['config-loader.js', 'i18n.js', 'page.js', 'audio-player.js'],

  // Package version
  version: require('./package.json').version,

  /**
   * Get path to engine directory
   */
  getEnginePath() {
    return this.enginePath;
  },

  /**
   * Get package version
   */
  getVersion() {
    return this.version;
  },

  /**
   * Get path to a specific engine file
   */
  getEngineFile(filePath) {
    return path.join(this.enginePath, filePath);
  }
};
