/**
 * @mtldev514/retro-portfolio-engine
 * Main entry point for the package
 */

const path = require('path');

module.exports = {
  // Path to engine files
  enginePath: path.join(__dirname, 'engine'),

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
