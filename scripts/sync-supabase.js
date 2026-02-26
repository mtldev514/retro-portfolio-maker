/**
 * Sync to Supabase
 * Reads local JSON files and syncs all data to Supabase database.
 *
 * Run after git push via CI, or manually: `retro-portfolio sync-supabase`
 *
 * Environment variables:
 *   SUPABASE_URL         — Project URL (e.g. https://xxx.supabase.co)
 *   SUPABASE_SERVICE_KEY — Service role key (NOT anon — needs write access)
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Make an authenticated request to the Supabase REST (PostgREST) API.
 */
async function supabaseRequest(restUrl, serviceKey, endpoint, method, body) {
  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${restUrl}/${endpoint}`, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} /${endpoint} failed: ${res.status} — ${err}`);
  }
  return res;
}

/**
 * Main sync function — reads local files and pushes to Supabase.
 */
async function syncSupabase(options = {}) {
  const cwd = options.cwd || process.cwd();

  // Load .env from project directory
  const envPath = path.join(cwd, '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(chalk.red('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY.'));
    console.log(chalk.gray('\nSet these in your .env file or CI secrets:'));
    console.log(chalk.gray('  SUPABASE_URL=https://yourproject.supabase.co'));
    console.log(chalk.gray('  SUPABASE_SERVICE_KEY=eyJ...\n'));
    throw new Error('Missing Supabase credentials');
  }

  const restUrl = `${supabaseUrl}/rest/v1`;

  console.log(chalk.blue('📤 Syncing local data to Supabase...\n'));
  console.log(chalk.gray(`   URL: ${supabaseUrl}`));
  console.log(chalk.gray(`   Project: ${cwd}\n`));

  const configDir = path.join(cwd, 'config');
  const dataDir = path.join(cwd, 'data');
  const langDir = path.join(cwd, 'lang');
  const now = new Date().toISOString();

  // ─── 1. Config files → config table ─────────────────────
  console.log(chalk.cyan('📋 Syncing config files...'));

  const configFiles = ['app.json', 'categories.json', 'languages.json', 'media-types.json'];
  const configRows = [];

  for (const file of configFiles) {
    const filePath = path.join(configDir, file);
    if (await fs.pathExists(filePath)) {
      const key = file.replace('.json', '');
      const value = await fs.readJson(filePath);
      configRows.push({ key, value, updated_at: now });
    }
  }

  // ─── 2. Media-type data files → items table ──────────────
  console.log(chalk.cyan('📦 Syncing items...'));

  const categoriesConfig = await fs.readJson(path.join(configDir, 'categories.json'));
  const mediaTypesConfig = await fs.readJson(path.join(configDir, 'media-types.json'));

  const contentTypes = categoriesConfig.contentTypes || categoriesConfig.categories || [];
  const mediaTypes = mediaTypesConfig.mediaTypes || [];

  const allItems = [];

  for (const mt of mediaTypes) {
    const dataFile = mt.dataFile ? mt.dataFile.replace('data/', '') : `${mt.id}.json`;
    const filePath = path.join(dataDir, dataFile);

    if (!(await fs.pathExists(filePath))) continue;

    const items = await fs.readJson(filePath);
    console.log(chalk.gray(`   ${mt.id}: ${items.length} items`));

    for (const item of items) {
      allItems.push({
        id: item.id,
        media_type: mt.id,
        title: item.title || {},
        url: item.url || null,
        date: item.date || null,
        medium: item.medium || null,
        genre: item.genre || null,
        description: item.description || null,
        gallery: item.gallery || [],
        gallery_metadata: item.gallery_metadata || null,
        visibility: item.visibility || 'visible',
        website: item.website || null,
        project_url: item.project_url || null,
        legacy_id: item.legacy_id || null,
        updated_at: now
      });
    }
  }

  // ─── 3. Category ref files → category_refs table ─────────
  console.log(chalk.cyan('🏷️  Syncing category refs...'));

  const categoryRefRows = [];

  for (const ct of contentTypes) {
    const filePath = path.join(dataDir, `${ct.id}.json`);
    if (!(await fs.pathExists(filePath))) continue;

    const refs = await fs.readJson(filePath);
    console.log(chalk.gray(`   ${ct.id}: ${refs.length} refs`));

    categoryRefRows.push({
      category_id: ct.id,
      refs,
      updated_at: now
    });
  }

  // ─── 4. Translation files → translations table ───────────
  console.log(chalk.cyan('🌐 Syncing translations...'));

  const translationRows = [];

  if (await fs.pathExists(langDir)) {
    const langFiles = (await fs.readdir(langDir)).filter(f => f.endsWith('.json'));

    for (const file of langFiles) {
      const langCode = file.replace('.json', '');
      const data = await fs.readJson(path.join(langDir, file));
      console.log(chalk.gray(`   ${langCode}: ${Object.keys(data).length} keys`));

      translationRows.push({
        lang_code: langCode,
        data,
        updated_at: now
      });
    }
  }

  // ─── 5. Push to Supabase (delete → insert per table) ─────
  console.log(chalk.cyan('\n🚀 Pushing to Supabase...'));

  const tables = [
    { name: 'config',        pk: 'key',         data: configRows },
    { name: 'items',         pk: 'id',          data: allItems },
    { name: 'category_refs', pk: 'category_id', data: categoryRefRows },
    { name: 'translations',  pk: 'lang_code',   data: translationRows }
  ];

  for (const table of tables) {
    if (table.data.length === 0) {
      console.log(chalk.yellow(`   ⚠ ${table.name}: no data, skipping`));
      continue;
    }

    // Delete all existing rows (pk=not.is.null matches everything)
    await supabaseRequest(restUrl, serviceKey,
      `${table.name}?${table.pk}=not.is.null`, 'DELETE');

    // Insert all rows
    await supabaseRequest(restUrl, serviceKey,
      table.name, 'POST', table.data);

    console.log(chalk.green(`   ✓ ${table.name}: ${table.data.length} rows`));
  }

  console.log(chalk.green('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green('✨ Supabase sync complete!'));
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

module.exports = syncSupabase;
