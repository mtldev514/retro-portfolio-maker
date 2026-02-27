#!/usr/bin/env node

/**
 * validate.js — Validate portfolio data and config files
 *
 * Checks:
 *   - Config files exist and are valid JSON
 *   - Normalized data integrity:
 *     • Every UUID in category ref files exists in the corresponding media-type file
 *     • No orphaned items (in media-type file but unreferenced by any category)
 *     • No duplicate UUIDs across media-type files
 *     • Category ref file UUIDs match the right media type
 *   - Media-type data files exist for all configured media types
 *
 * Usage:
 *   node scripts/validate.js [--project-dir /path/to/project]
 *   npx portfolio validate
 */

const fs = require('fs-extra');
const path = require('path');

let errors = [];
let warnings = [];

function error(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

async function validate(projectDir) {
  const configDir = path.join(projectDir, 'config');
  const dataDir = path.join(projectDir, 'data');

  console.log(`\n🔍 Validating portfolio: ${projectDir}\n`);

  // ─── Check required directories ────────────────────

  for (const dir of ['config', 'data', 'lang']) {
    if (!(await fs.pathExists(path.join(projectDir, dir)))) {
      error(`Missing required directory: ${dir}/`);
    }
  }

  // ─── Check required config files ───────────────────

  const requiredConfigs = ['app.json', 'languages.json', 'categories.json', 'media-types.json'];
  for (const file of requiredConfigs) {
    const filePath = path.join(configDir, file);
    if (!(await fs.pathExists(filePath))) {
      error(`Missing config file: config/${file}`);
    } else {
      try {
        await fs.readJson(filePath);
      } catch (e) {
        error(`Invalid JSON in config/${file}: ${e.message}`);
      }
    }
  }

  if (errors.length > 0) {
    // Can't continue without basic config files
    printResults();
    return;
  }

  // ─── Load configs ──────────────────────────────────

  const categoriesConfig = await fs.readJson(path.join(configDir, 'categories.json'));
  const mediaTypesConfig = await fs.readJson(path.join(configDir, 'media-types.json'));

  const categories = categoriesConfig.contentTypes || categoriesConfig.categories || [];
  const mediaTypes = mediaTypesConfig.mediaTypes || [];

  if (categories.length === 0) {
    warn('No categories defined in categories.json');
  }
  if (mediaTypes.length === 0) {
    warn('No media types defined in media-types.json');
  }

  // ─── Check media types have dataFile ───────────────

  for (const mt of mediaTypes) {
    if (!mt.dataFile) {
      error(`Media type '${mt.id}' is missing 'dataFile' field — run migration first`);
    }
  }

  // ─── Check categories reference valid media types ──

  const mediaTypeIds = new Set(mediaTypes.map(mt => mt.id));
  for (const cat of categories) {
    if (!cat.mediaType) {
      error(`Category '${cat.id}' is missing 'mediaType' field`);
    } else if (!mediaTypeIds.has(cat.mediaType)) {
      error(`Category '${cat.id}' references unknown media type '${cat.mediaType}'`);
    }
  }

  // ─── Load media-type data files ────────────────────

  const allItemsById = new Map(); // uuid → { item, mediaType }
  const mediaTypeItems = {};       // mediaType → [items]

  for (const mt of mediaTypes) {
    const filePath = path.join(projectDir, mt.dataFile || `data/${mt.id}.json`);

    if (!(await fs.pathExists(filePath))) {
      error(`Missing media-type data file: ${mt.dataFile || `data/${mt.id}.json`}`);
      mediaTypeItems[mt.id] = [];
      continue;
    }

    let items;
    try {
      items = await fs.readJson(filePath);
    } catch (e) {
      error(`Invalid JSON in ${mt.dataFile}: ${e.message}`);
      mediaTypeItems[mt.id] = [];
      continue;
    }

    if (!Array.isArray(items)) {
      error(`${mt.dataFile} should be an array but got ${typeof items}`);
      mediaTypeItems[mt.id] = [];
      continue;
    }

    mediaTypeItems[mt.id] = items;

    // Check each item
    for (const item of items) {
      if (!item.id) {
        error(`Item in ${mt.dataFile} is missing 'id' field: ${JSON.stringify(item).slice(0, 80)}`);
        continue;
      }

      // Check for duplicate UUIDs
      if (allItemsById.has(item.id)) {
        const existing = allItemsById.get(item.id);
        error(`Duplicate UUID '${item.id}' found in ${mt.id}.json (already in ${existing.mediaType}.json)`);
      } else {
        allItemsById.set(item.id, { item, mediaType: mt.id });
      }
    }

    console.log(`   📦 ${mt.id}.json: ${items.length} items`);
  }

  // ─── Load category ref files and validate ──────────

  const referencedIds = new Set();

  console.log('');
  for (const cat of categories) {
    const filePath = path.join(dataDir, `${cat.id}.json`);

    if (!(await fs.pathExists(filePath))) {
      error(`Missing category ref file: data/${cat.id}.json`);
      continue;
    }

    let refs;
    try {
      refs = await fs.readJson(filePath);
    } catch (e) {
      error(`Invalid JSON in data/${cat.id}.json: ${e.message}`);
      continue;
    }

    if (!Array.isArray(refs)) {
      error(`data/${cat.id}.json should be a UUID array but got ${typeof refs}`);
      continue;
    }

    // Check if refs are UUIDs (strings) not objects
    const nonStrings = refs.filter(r => typeof r !== 'string');
    if (nonStrings.length > 0) {
      error(`data/${cat.id}.json contains non-string entries — may still be in old format (needs migration)`);
      continue;
    }

    // Validate each UUID reference
    const seenInCat = new Set();
    for (const uuid of refs) {
      // Check for duplicates within same category
      if (seenInCat.has(uuid)) {
        warn(`Duplicate UUID '${uuid}' in data/${cat.id}.json`);
      }
      seenInCat.add(uuid);
      referencedIds.add(uuid);

      // Check UUID exists in a media-type file
      if (!allItemsById.has(uuid)) {
        error(`Category '${cat.id}' references UUID '${uuid}' which doesn't exist in any media-type file`);
        continue;
      }

      // Check UUID belongs to the correct media type
      const entry = allItemsById.get(uuid);
      if (entry.mediaType !== cat.mediaType) {
        error(`Category '${cat.id}' (mediaType: ${cat.mediaType}) references UUID '${uuid}' which belongs to ${entry.mediaType}.json`);
      }
    }

    console.log(`   🏷️  ${cat.id}: ${refs.length} refs → ${cat.mediaType}`);
  }

  // ─── Check for orphaned items ──────────────────────

  for (const [uuid, entry] of allItemsById) {
    if (!referencedIds.has(uuid)) {
      warn(`Orphaned item '${uuid}' in ${entry.mediaType}.json is not referenced by any category`);
    }
  }

  // ─── Print results ─────────────────────────────────

  printResults();
}

function printResults() {
  console.log('');

  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} warning(s):`);
    for (const w of warnings) {
      console.log(`   ⚠️  ${w}`);
    }
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`❌ ${errors.length} error(s):`);
    for (const e of errors) {
      console.log(`   ❌ ${e}`);
    }
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ All checks passed!\n');
  }
}

// ─── CLI ────────────────────────────────────────────────

const args = process.argv.slice(2);
let projectDir = process.cwd();

const dirIndex = args.indexOf('--project-dir');
if (dirIndex !== -1 && args[dirIndex + 1]) {
  projectDir = path.resolve(args[dirIndex + 1]);
}

validate(projectDir).catch(e => {
  console.error('❌ Validation failed:', e.message);
  process.exit(1);
});
