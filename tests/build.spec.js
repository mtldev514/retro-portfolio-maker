// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'test-portfolio', 'dist');

test.describe('Build output', () => {
  test('dist directory contains all required files', () => {
    const requiredFiles = [
      'index.html',
      'style.css',
      'admin.html',
      'config-source.json',
      'js/render.js',
      'js/init.js',
      'js/page.js',
      'js/effects.js',
      'js/router.js',
      'js/i18n.js',
      'js/config-loader.js',
      'config/app.json',
      'config/categories.json',
      'config/languages.json',
      'data/painting.json',
      'data/drawing.json',
      'data/photography.json',
      'data/sculpting.json',
      'data/music.json',
      'data/projects.json',
      'lang/en.json',
      'lang/fr.json',
      'lang/mx.json',
      'lang/ht.json',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(distDir, file);
      expect(fs.existsSync(filePath), `Missing: ${file}`).toBe(true);
    }
  });

  test('index.html contains correct filter buttons (Bug #6 regression)', () => {
    const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

    // Should have 7 filter buttons: "all" + 6 categories
    const filterBtnMatches = html.match(/class="filter-btn"/g) || [];
    // The "all" button has class="filter-btn active"
    const activeMatch = html.match(/class="filter-btn active"/g) || [];
    const totalButtons = filterBtnMatches.length + activeMatch.length;
    expect(totalButtons).toBe(7);

    // Verify each category has a filter button
    const categories = ['painting', 'drawing', 'photography', 'sculpting', 'music', 'projects'];
    for (const cat of categories) {
      expect(html).toContain(`data-filter="${cat}"`);
    }
    expect(html).toContain('data-filter="all"');
  });

  test('build-info.json records retro view', () => {
    const buildInfo = JSON.parse(fs.readFileSync(path.join(distDir, 'build-info.json'), 'utf-8'));
    expect(buildInfo).toHaveProperty('buildDate');
    expect(buildInfo).toHaveProperty('engine');
    expect(buildInfo).toHaveProperty('view', 'retro');
  });
});

test.describe('Alternative view build', () => {
  test.describe.configure({ mode: 'serial' });

  const mockViewDir = path.join(__dirname, '..', 'views', 'mock-view');
  const mockViewDistDir = path.join(__dirname, '..', 'test-portfolio', 'dist-mock-view');

  test.beforeAll(async () => {
    const testPortfolioDir = path.join(__dirname, '..', 'test-portfolio');
    const originalCwd = process.cwd();
    const appJsonPath = path.join(testPortfolioDir, 'config', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

    try {
      // Temporarily install mock-view as a built-in view
      const mockFixture = path.join(__dirname, '..', 'test-fixtures', 'mock-view');
      fs.cpSync(mockFixture, mockViewDir, { recursive: true });

      // Set view to mock-view (built-in name, not a path)
      appJson.view = 'mock-view';
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

      process.chdir(testPortfolioDir);
      const build = require('../scripts/build');
      await build({ output: 'dist-mock-view' });
    } finally {
      // Restore original app.json (remove view field)
      delete appJson.view;
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
      process.chdir(originalCwd);
    }
  });

  test.afterAll(() => {
    // Clean up mock view from views/ and dist
    if (fs.existsSync(mockViewDir)) {
      fs.rmSync(mockViewDir, { recursive: true });
    }
    if (fs.existsSync(mockViewDistDir)) {
      fs.rmSync(mockViewDistDir, { recursive: true });
    }
  });

  test('uses mock view index.html instead of retro default', () => {
    const html = fs.readFileSync(path.join(mockViewDistDir, 'index.html'), 'utf-8');
    expect(html).toContain('MOCK VIEW');
    expect(html).not.toContain('winamp');
  });

  test('core JS files are injected into dist/js/', () => {
    expect(fs.existsSync(path.join(mockViewDistDir, 'js', 'config-loader.js'))).toBe(true);
    expect(fs.existsSync(path.join(mockViewDistDir, 'js', 'i18n.js'))).toBe(true);
    expect(fs.existsSync(path.join(mockViewDistDir, 'js', 'page.js'))).toBe(true);
  });

  test('view-specific init.js comes from mock view, not engine', () => {
    const initJs = fs.readFileSync(path.join(mockViewDistDir, 'js', 'init.js'), 'utf-8');
    expect(initJs).toContain('MOCK VIEW LOADED');
  });

  test('user data files are copied on top of view', () => {
    expect(fs.existsSync(path.join(mockViewDistDir, 'config', 'app.json'))).toBe(true);
    expect(fs.existsSync(path.join(mockViewDistDir, 'data', 'painting.json'))).toBe(true);
    expect(fs.existsSync(path.join(mockViewDistDir, 'lang', 'en.json'))).toBe(true);
  });

  test('build-info records the mock-view name', () => {
    const buildInfo = JSON.parse(fs.readFileSync(path.join(mockViewDistDir, 'build-info.json'), 'utf-8'));
    expect(buildInfo.view).toBe('mock-view');
  });

  test('filter injection is skipped (mock view has no #filter-nav)', () => {
    const html = fs.readFileSync(path.join(mockViewDistDir, 'index.html'), 'utf-8');
    expect(html).toContain('<main id="app">');
  });
});
