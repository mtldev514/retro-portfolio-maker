/**
 * Global setup: builds the test portfolio before Playwright tests run.
 * Called by `npm run test:build` and also by playwright.config.js globalSetup.
 */
const path = require('path');
const fs = require('fs-extra');

async function globalSetup() {
  const testPortfolioDir = path.join(__dirname, '..', 'test-portfolio');
  const originalCwd = process.cwd();

  try {
    // The build script uses process.cwd() for user files
    // and __dirname for engine files, so this works correctly
    process.chdir(testPortfolioDir);

    const build = require('../scripts/build');
    await build({ output: 'dist' });

    // Copy config-source.json into dist (like the real portfolio's postbuild)
    const configSrc = path.join(testPortfolioDir, 'config-source.json');
    const configDst = path.join(testPortfolioDir, 'dist', 'config-source.json');
    if (fs.existsSync(configSrc)) {
      await fs.copy(configSrc, configDst);
    }

    console.log('Test portfolio built successfully.');
  } finally {
    process.chdir(originalCwd);
  }
}

// Support both direct execution (npm run test:build) and Playwright globalSetup
if (require.main === module) {
  globalSetup().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}

module.exports = globalSetup;
