#!/usr/bin/env node

/**
 * migrate-data-format.js — Convert per-category data files to normalized format
 *
 * Normalized model:
 *   - Media-type files (data/image.json) → all items for that media type, with UUIDs
 *   - Category files (data/painting.json) → ordered arrays of UUIDs
 *
 * Usage:
 *   node scripts/migrate-data-format.js [--project-dir /path/to/project]
 *
 * What it does:
 *   1. Reads categories.json → groups categories by mediaType
 *   2. For each category, loads items and assigns UUID ids
 *   3. Merges items into per-media-type files (image.json, audio.json, etc.)
 *   4. Replaces category files with ordered UUID arrays
 *   5. Backs up originals to data/.backup-<timestamp>/
 *   6. Updates media-types.json with dataFile fields
 *   7. Removes dataFile from categories.json
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

async function migrate(projectDir) {
  const configDir = path.join(projectDir, 'config');
  const dataDir = path.join(projectDir, 'data');

  console.log(`\n📦 Migrating data format in: ${projectDir}`);
  console.log(`   Config: ${configDir}`);
  console.log(`   Data:   ${dataDir}\n`);

  // ─── Load configs ────────────────────────────────────

  const categoriesPath = path.join(configDir, 'categories.json');
  const mediaTypesPath = path.join(configDir, 'media-types.json');

  if (!(await fs.pathExists(categoriesPath))) {
    console.error('❌ categories.json not found');
    process.exit(1);
  }
  if (!(await fs.pathExists(mediaTypesPath))) {
    console.error('❌ media-types.json not found');
    process.exit(1);
  }

  const categoriesConfig = await fs.readJson(categoriesPath);
  const mediaTypesConfig = await fs.readJson(mediaTypesPath);

  const categories = categoriesConfig.contentTypes || categoriesConfig.categories || [];
  const mediaTypes = mediaTypesConfig.mediaTypes || [];

  // ─── Check if already migrated ───────────────────────

  const alreadyMigrated = mediaTypes.some(mt => mt.dataFile);
  if (alreadyMigrated) {
    // Check if category files are already UUID arrays
    const firstCat = categories[0];
    if (firstCat) {
      const catFilePath = path.join(dataDir, `${firstCat.id}.json`);
      if (await fs.pathExists(catFilePath)) {
        const catData = await fs.readJson(catFilePath);
        if (Array.isArray(catData) && catData.length > 0 && typeof catData[0] === 'string') {
          console.log('✅ Data already in normalized format. Nothing to do.');
          return;
        }
      }
    }
  }

  // ─── Backup originals ───────────────────────────────

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(dataDir, `.backup-${timestamp}`);
  await fs.ensureDir(backupDir);

  const existingFiles = await fs.readdir(dataDir);
  for (const file of existingFiles) {
    if (file.endsWith('.json') && !file.startsWith('.')) {
      await fs.copy(
        path.join(dataDir, file),
        path.join(backupDir, file)
      );
    }
  }
  console.log(`💾 Backed up ${existingFiles.filter(f => f.endsWith('.json')).length} files to ${backupDir}\n`);

  // ─── Group categories by media type ──────────────────

  const mediaTypeGroups = {}; // { image: [painting, drawing, ...], audio: [music], ... }
  for (const cat of categories) {
    const mt = cat.mediaType;
    if (!mediaTypeGroups[mt]) mediaTypeGroups[mt] = [];
    mediaTypeGroups[mt].push(cat);
  }

  // ─── Process each media type group ───────────────────

  const mediaTypeFiles = {}; // { image: [...items], audio: [...items] }
  const categoryRefs = {};   // { painting: ["uuid1", "uuid2"], ... }

  for (const [mediaType, cats] of Object.entries(mediaTypeGroups)) {
    mediaTypeFiles[mediaType] = [];

    for (const cat of cats) {
      const catFilePath = path.join(dataDir, `${cat.id}.json`);
      categoryRefs[cat.id] = [];

      if (!(await fs.pathExists(catFilePath))) {
        console.log(`   ⚠️  ${cat.id}.json not found, creating empty category`);
        continue;
      }

      let items;
      try {
        const content = (await fs.readFile(catFilePath, 'utf-8')).trim();
        items = content ? JSON.parse(content) : [];
        if (!Array.isArray(items)) items = items.items || [];
      } catch {
        console.log(`   ⚠️  ${cat.id}.json is invalid JSON, skipping`);
        continue;
      }

      console.log(`   📂 ${cat.id}: ${items.length} items → ${mediaType}.json`);

      for (const item of items) {
        // Generate new UUID, preserve old id as legacyId
        const uuid = crypto.randomUUID();
        const migratedItem = {
          id: uuid,
          legacyId: item.id || null,
          ...item,
          id: uuid, // ensure uuid wins over spread
        };

        mediaTypeFiles[mediaType].push(migratedItem);
        categoryRefs[cat.id].push(uuid);
      }
    }
  }

  // ─── Write media-type data files ─────────────────────
  // Ensure ALL configured media types get a data file (even empty ones)
  // This prevents 404s when the frontend fetches them

  console.log('');
  for (const mt of mediaTypes) {
    if (!mediaTypeFiles[mt.id]) {
      mediaTypeFiles[mt.id] = [];
    }
  }
  for (const [mediaType, items] of Object.entries(mediaTypeFiles)) {
    const filePath = path.join(dataDir, `${mediaType}.json`);
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf-8');
    console.log(`   ✅ ${mediaType}.json: ${items.length} items`);
  }

  // ─── Write category reference files ──────────────────

  console.log('');
  for (const [catId, refs] of Object.entries(categoryRefs)) {
    const filePath = path.join(dataDir, `${catId}.json`);
    await fs.writeFile(filePath, JSON.stringify(refs, null, 2), 'utf-8');
    console.log(`   🏷️  ${catId}.json: ${refs.length} refs`);
  }

  // ─── Update media-types.json with dataFile fields ────

  let mtChanged = false;
  for (const mt of mediaTypes) {
    if (!mt.dataFile) {
      mt.dataFile = `data/${mt.id}.json`;
      mtChanged = true;
    }
  }
  if (mtChanged) {
    await fs.writeFile(mediaTypesPath, JSON.stringify(mediaTypesConfig, null, 2), 'utf-8');
    console.log('\n   📝 Updated media-types.json with dataFile fields');
  }

  // ─── Remove dataFile from categories.json ────────────

  let catChanged = false;
  for (const cat of categories) {
    if (cat.dataFile) {
      delete cat.dataFile;
      catChanged = true;
    }
  }
  if (catChanged) {
    await fs.writeFile(categoriesPath, JSON.stringify(categoriesConfig, null, 2), 'utf-8');
    console.log('   📝 Removed dataFile from categories.json');
  }

  // ─── Summary ─────────────────────────────────────────

  const totalItems = Object.values(mediaTypeFiles).reduce((sum, items) => sum + items.length, 0);
  const totalCats = Object.keys(categoryRefs).length;
  const totalMTs = Object.keys(mediaTypeFiles).length;

  console.log(`\n🎉 Migration complete!`);
  console.log(`   ${totalItems} items across ${totalMTs} media types`);
  console.log(`   ${totalCats} category reference files`);
  console.log(`   Backups saved to: ${backupDir}\n`);
}

// ─── CLI ────────────────────────────────────────────────

const args = process.argv.slice(2);
let projectDir = process.cwd();

const dirIndex = args.indexOf('--project-dir');
if (dirIndex !== -1 && args[dirIndex + 1]) {
  projectDir = path.resolve(args[dirIndex + 1]);
}

migrate(projectDir).catch(e => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});
