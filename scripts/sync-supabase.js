/**
 * Sync to Supabase
 * Reads local JSON files and syncs all data to Supabase database.
 *
 * Run after git push via CI, or manually: `retro-portfolio sync-supabase`
 *
 * Environment variables:
 *   SUPABASE_URL        — Project URL (e.g. https://xxx.supabase.co)
 *   SUPABASE_SECRET_KEY — Secret key (full DB access, backend-only)
 *   SUPABASE_SERVICE_KEY — (legacy alias, still supported)
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// ─── Error diagnostics ──────────────────────────────────

/**
 * Mask a secret key for safe display: "sb_se...x4Q"
 */
function maskKey(key) {
  if (!key) return '(empty)';
  if (key.length <= 10) return '***';
  return `${key.slice(0, 5)}...${key.slice(-3)}`;
}

/**
 * Pattern-match a network/HTTP error and return an actionable hint.
 */
function diagnoseError(cause, statusCode) {
  const c = (cause || '').toLowerCase();

  if (c.includes('enotfound') || c.includes('getaddrinfo'))
    return 'Hint: DNS lookup failed — check SUPABASE_URL spelling';
  if (c.includes('econnrefused'))
    return 'Hint: Connection refused — is the Supabase project paused or inactive?';
  if (c.includes('etimedout') || c.includes('econnreset') || c.includes('socket hang up'))
    return 'Hint: Network timeout — check your internet connection or firewall';
  if (c.includes('certificate') || c.includes('ssl') || c.includes('tls'))
    return 'Hint: SSL/TLS error — URL must start with https://';
  if (c.includes('invalid url') || c.includes('err_invalid_url'))
    return 'Hint: Malformed URL — expected https://yourproject.supabase.co';

  if (statusCode === 401 || statusCode === 403)
    return 'Hint: Authentication failed — check SUPABASE_SECRET_KEY is correct and not expired';
  if (statusCode === 404)
    return 'Hint: Table not found — have you run the migration SQL on your Supabase project?';
  if (statusCode === 400)
    return 'Hint: Bad request — data may not match the table schema (run migration first)';

  return '';
}

// ─── Supabase REST client ────────────────────────────────

/**
 * Make an authenticated request to the Supabase REST (PostgREST) API.
 * Wraps fetch() with actionable error messages.
 */
async function supabaseRequest(restUrl, secretKey, endpoint, method, body) {
  const url = `${restUrl}/${endpoint}`;
  const headers = {
    'apikey': secretKey,
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  // ── Network-level errors (DNS, connection, timeout) ──
  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    const cause = err.cause?.message || err.message;
    const hint = diagnoseError(cause);
    throw new Error(
      `Network error: ${method} ${url}\n` +
      `   Cause: ${cause}\n` +
      (hint ? `   ${hint}` : '')
    );
  }

  // ── HTTP-level errors (4xx, 5xx) ──
  if (!res.ok) {
    const body = await res.text().catch(() => '(no response body)');
    const hint = diagnoseError(body, res.status);
    throw new Error(
      `Supabase ${method} /${endpoint} → ${res.status} ${res.statusText}\n` +
      `   Response: ${body.slice(0, 200)}\n` +
      (hint ? `   ${hint}` : '')
    );
  }

  return res;
}

// ─── Main sync function ─────────────────────────────────

async function syncSupabase(options = {}) {
  const cwd = options.cwd || process.cwd();

  // Load .env from project directory
  const envPath = path.join(cwd, '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }

  // Resolve Supabase URL: .env takes priority, fall back to config-source.json
  let supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    const csPath = path.join(cwd, 'config-source.json');
    if (fs.existsSync(csPath)) {
      try {
        const cs = fs.readJsonSync(csPath);
        supabaseUrl = cs?.supabase?.url;
      } catch (e) { /* ignore parse errors */ }
    }
  }

  // Support both new (SECRET_KEY) and legacy (SERVICE_KEY) env var names
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !secretKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL (set in .env or config-source.json → supabase.url)');
    if (!secretKey) missing.push('SUPABASE_SECRET_KEY (set in .env)');

    console.error(chalk.red(`\n✗ Missing Supabase credentials:\n`));
    missing.forEach(m => console.log(chalk.red(`   • ${m}`)));
    console.log(chalk.gray('\nSetup options:'));
    console.log(chalk.gray('  Option A — URL in config-source.json (recommended, avoids duplication):'));
    console.log(chalk.gray('    { "supabase": { "url": "https://xxx.supabase.co", "publishableKey": "sb_publishable_..." } }'));
    console.log(chalk.gray('  Option B — URL in .env:'));
    console.log(chalk.gray('    SUPABASE_URL=https://yourproject.supabase.co'));
    console.log(chalk.gray('\n  Secret key always in .env:'));
    console.log(chalk.gray('    SUPABASE_SECRET_KEY=sb_secret_...'));
    console.log(chalk.gray('\n  Get keys from: Supabase Dashboard → Project Settings → API\n'));
    throw new Error(`Missing: ${missing.map(m => m.split(' (')[0]).join(', ')}`);
  }

  const restUrl = `${supabaseUrl}/rest/v1`;

  console.log(chalk.blue('📤 Syncing local data to Supabase...\n'));
  console.log(chalk.gray(`   URL: ${supabaseUrl}`));
  console.log(chalk.gray(`   Key: ${maskKey(secretKey)}`));
  console.log(chalk.gray(`   Project: ${cwd}\n`));

  // ─── Connectivity pre-check ───────────────────────────
  console.log(chalk.cyan('🔌 Checking Supabase connectivity...'));

  try {
    const healthRes = await fetch(restUrl, {
      method: 'HEAD',
      headers: {
        'apikey': secretKey,
        'Authorization': `Bearer ${secretKey}`
      }
    });

    if (healthRes.status === 401 || healthRes.status === 403) {
      console.error(chalk.red(`\n✗ Authentication failed (${healthRes.status})`));
      console.log(chalk.gray(`   Key used: ${maskKey(secretKey)}`));
      console.log(chalk.gray('   Check that SUPABASE_SECRET_KEY is correct and not expired.'));
      console.log(chalk.gray('   Get it from: Dashboard → Project Settings → API → Secret key\n'));
      throw new Error('Supabase authentication failed');
    }

    if (!healthRes.ok && healthRes.status !== 200) {
      console.log(chalk.yellow(`   ⚠ Health check returned ${healthRes.status} (may still work)`));
    } else {
      console.log(chalk.green('   ✓ Connected'));
    }
  } catch (err) {
    if (err.message === 'Supabase authentication failed') throw err;

    const cause = err.cause?.message || err.message;
    const hint = diagnoseError(cause);
    console.error(chalk.red(`\n✗ Cannot reach Supabase at ${supabaseUrl}`));
    console.error(chalk.red(`   ${cause}`));
    if (hint) console.log(chalk.yellow(`   ${hint}`));
    console.log('');
    throw new Error(`Cannot reach Supabase: ${cause}`);
  }

  // ─── Read local data ──────────────────────────────────

  const configDir = path.join(cwd, 'config');
  const dataDir = path.join(cwd, 'data');
  const langDir = path.join(cwd, 'lang');
  const now = new Date().toISOString();

  // ─── 1. Config files → config table ───────────────────
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

  // ─── 2. Media-type data files → items table ───────────
  console.log(chalk.cyan('📦 Syncing items...'));

  const categoriesConfig = await fs.readJson(path.join(configDir, 'categories.json'));
  const mediaTypesConfig = await fs.readJson(path.join(configDir, 'media-types.json'));

  const categories = categoriesConfig.categories || [];
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

  // ─── 3. Category ref files → category_refs table ──────
  console.log(chalk.cyan('🏷️  Syncing category refs...'));

  const categoryRefRows = [];

  for (const ct of categories) {
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

  // ─── 4. Translation files → translations table ────────
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

  // ─── 5. Push to Supabase (delete → insert per table) ──
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
    await supabaseRequest(restUrl, secretKey,
      `${table.name}?${table.pk}=not.is.null`, 'DELETE');

    // Insert all rows
    await supabaseRequest(restUrl, secretKey,
      table.name, 'POST', table.data);

    console.log(chalk.green(`   ✓ ${table.name}: ${table.data.length} rows`));
  }

  console.log(chalk.green('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green('✨ Supabase sync complete!'));
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

module.exports = syncSupabase;
