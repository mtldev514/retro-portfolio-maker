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

  test('build-info.json exists with correct metadata', () => {
    const buildInfo = JSON.parse(fs.readFileSync(path.join(distDir, 'build-info.json'), 'utf-8'));
    expect(buildInfo).toHaveProperty('buildDate');
    expect(buildInfo).toHaveProperty('engine');
  });
});
