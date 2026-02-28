/**
 * SupabaseStore — Supabase implementation of the DataStore interface
 *
 * Same 13-method interface as JsonFileStore, backed by Supabase DB tables:
 *   - items:          media-type items with UUID ids
 *   - category_refs:  ordered UUID arrays per category
 *
 * Column mapping:
 *   JS camelCase property  ↔  DB snake_case column
 *   e.g. galleryMetadata   →  gallery_metadata
 *        project_url       ←  projectUrl
 *
 * Tables (created by supabase-setup.sql):
 *   items         — id (uuid PK), media_type, title (jsonb), url, date,
 *                   medium, genre, description (all jsonb), gallery (jsonb []),
 *                   gallery_metadata (jsonb), visibility, website, project_url,
 *                   legacy_id, created, updated_at
 *   category_refs — category_id (text PK), refs (jsonb []), updated_at
 */

const crypto = require('crypto');
const { getSupabaseClient } = require('./supabase-client');

// ─── Column Mapping ──────────────────────────────────────

/** JS camelCase property → DB snake_case column (only multi-word fields) */
const JS_TO_DB = {
  galleryMetadata: 'gallery_metadata',
  projectUrl: 'project_url',
  legacyId: 'legacy_id',
  mediaType: 'media_type',
};

/** DB snake_case column → JS camelCase property */
const DB_TO_JS = {
  gallery_metadata: 'galleryMetadata',
  project_url: 'projectUrl',
  legacy_id: 'legacyId',
};

/** Internal DB columns excluded from returned item objects */
const INTERNAL_COLUMNS = new Set(['media_type', 'updated_at', 'created_at']);

/** Known item columns in the DB (snake_case, excluding id and media_type) */
const ITEM_COLUMNS = new Set([
  'title', 'url', 'date', 'created', 'medium', 'genre', 'description',
  'gallery', 'gallery_metadata', 'visibility', 'website', 'project_url',
  'legacy_id',
]);

// ─── SupabaseStore Class ─────────────────────────────────

class SupabaseStore {
  /**
   * @param {import('./config-loader').ConfigLoader} configLoader
   */
  constructor(configLoader) {
    this.config = configLoader;
    this.supabase = getSupabaseClient();
  }

  // ─── Column Mapping Helpers ────────────────────────────

  /**
   * Convert a JS item object to a DB row (snake_case columns).
   * Only includes known columns; skips undefined values.
   * @param {object} item — JS item with camelCase fields
   * @param {string} [mediaType] — media type ID (e.g. "image")
   * @returns {object} DB row object
   */
  _itemToRow(item, mediaType) {
    const row = {};

    if (item.id) row.id = item.id;
    if (mediaType) row.media_type = mediaType;

    for (const [key, value] of Object.entries(item)) {
      if (key === 'id' || value === undefined) continue;

      // Map camelCase → snake_case
      const dbCol = JS_TO_DB[key] || key;

      // Only include known columns
      if (ITEM_COLUMNS.has(dbCol)) {
        row[dbCol] = value;
      }
    }

    row.updated_at = new Date().toISOString();
    return row;
  }

  /**
   * Convert a DB row to a JS item object (camelCase properties).
   * Excludes internal columns (media_type, updated_at).
   * @param {object} row — DB row with snake_case columns
   * @returns {object} JS item with camelCase properties
   */
  _rowToItem(row) {
    const item = {};

    for (const [col, value] of Object.entries(row)) {
      // Skip internal metadata columns
      if (INTERNAL_COLUMNS.has(col)) continue;

      // Map snake_case → camelCase
      const jsProp = DB_TO_JS[col] || col;
      item[jsProp] = value;
    }

    return item;
  }

  /**
   * Map a JS field name to its DB column name.
   * e.g. "galleryMetadata" → "gallery_metadata"
   * e.g. "title" → "title" (unchanged)
   */
  _fieldToColumn(field) {
    return JS_TO_DB[field] || field;
  }

  /**
   * Look up the media type ID for a given category.
   * e.g. "painting" → "image"
   */
  _mediaTypeForCategory(categoryId) {
    const ct = this.config.getCategory(categoryId);
    return ct ? ct.mediaType : null;
  }

  /**
   * Generate a new UUID for an item.
   */
  _generateId() {
    return crypto.randomUUID();
  }

  // ─── Items (media-type level) ──────────────────────────

  /**
   * Get all items for a media type.
   * @param {string} mediaType — e.g. "image", "audio"
   * @returns {Array} items array
   */
  async getAllItems(mediaType) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('media_type', mediaType);

    if (error) throw new Error(`SupabaseStore.getAllItems: ${error.message}`);
    return (data || []).map(row => this._rowToItem(row));
  }

  /**
   * Get a single item by UUID.
   * @param {string} id — UUID
   * @returns {object|null} item or null
   */
  async getItem(id) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`SupabaseStore.getItem: ${error.message}`);
    return data ? this._rowToItem(data) : null;
  }

  /**
   * Create a new item in the items table.
   * Generates a UUID if not present.
   * @param {string} mediaType — e.g. "image"
   * @param {object} item — item data (id will be assigned)
   * @returns {object} the created item with id
   */
  async createItem(mediaType, item) {
    if (!item.id) {
      item.id = this._generateId();
    }

    const row = this._itemToRow(item, mediaType);

    const { data, error } = await this.supabase
      .from('items')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`SupabaseStore.createItem: ${error.message}`);
    return this._rowToItem(data);
  }

  /**
   * Update an item's fields by UUID.
   * @param {string} id — UUID
   * @param {object} updates — key/value pairs to merge (camelCase or snake_case)
   * @returns {object|null} updated item, or null if not found
   */
  async updateItem(id, updates) {
    const dbUpdates = {};

    for (const [key, value] of Object.entries(updates || {})) {
      if (value === undefined) continue;

      // Map camelCase → snake_case
      const dbCol = JS_TO_DB[key] || key;

      if (ITEM_COLUMNS.has(dbCol)) {
        dbUpdates[dbCol] = value;
      }
    }

    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('items')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // PGRST116 = no rows found (single() expects exactly one row)
      if (error.code === 'PGRST116') return null;
      throw new Error(`SupabaseStore.updateItem: ${error.message}`);
    }

    return data ? this._rowToItem(data) : null;
  }

  /**
   * Delete an item by UUID.
   * Returns the removed item (for cloud cleanup) or null.
   * @param {string} id — UUID
   * @returns {object|null} removed item or null
   */
  async deleteItem(id) {
    const { data, error } = await this.supabase
      .from('items')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`SupabaseStore.deleteItem: ${error.message}`);
    }

    return data ? this._rowToItem(data) : null;
  }

  // ─── Categories (organizational layer) ─────────────────

  /**
   * Get the ordered array of UUIDs for a category.
   * @param {string} category — e.g. "painting"
   * @returns {Array<string>} UUID array
   */
  async getCategoryRefs(category) {
    const { data, error } = await this.supabase
      .from('category_refs')
      .select('refs')
      .eq('category_id', category)
      .maybeSingle();

    if (error) throw new Error(`SupabaseStore.getCategoryRefs: ${error.message}`);
    return (data && data.refs) || [];
  }

  /**
   * Get resolved items for a category, in reference order.
   * @param {string} category — e.g. "painting"
   * @returns {Array<object>} items with full data
   */
  async getCategoryItems(category) {
    const refs = await this.getCategoryRefs(category);
    if (refs.length === 0) return [];

    const mediaType = this._mediaTypeForCategory(category);
    if (!mediaType) return [];

    // Fetch all items matching the ref IDs in a single query
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .in('id', refs);

    if (error) throw new Error(`SupabaseStore.getCategoryItems: ${error.message}`);

    // Build a map and resolve in ref order, skip missing
    const itemMap = new Map((data || []).map(row => [row.id, this._rowToItem(row)]));
    return refs.map(id => itemMap.get(id)).filter(Boolean);
  }

  /**
   * Get all items grouped by category.
   * @returns {object} { painting: [...], music: [...], ... }
   */
  async getAllCategorizedItems() {
    const result = {};
    for (const ct of this.config.getCategories()) {
      result[ct.id] = await this.getCategoryItems(ct.id);
    }
    return result;
  }

  /**
   * Append an item UUID to a category's reference array.
   * @param {string} id — UUID
   * @param {string} category — category to add to
   * @returns {boolean} success
   */
  async addToCategory(id, category) {
    const refs = await this.getCategoryRefs(category);
    if (refs.includes(id)) return true; // already there

    refs.push(id);
    await this._upsertCategoryRefs(category, refs);
    return true;
  }

  /**
   * Remove an item UUID from a category's reference array.
   * @param {string} id — UUID
   * @param {string} category — category to remove from
   * @returns {boolean} true if removed, false if not found
   */
  async removeFromCategory(id, category) {
    const refs = await this.getCategoryRefs(category);
    const index = refs.indexOf(id);
    if (index === -1) return false;

    refs.splice(index, 1);
    await this._upsertCategoryRefs(category, refs);
    return true;
  }

  /**
   * Move an item from one category to another.
   * Validates both categories share the same media type.
   * @param {string} id — UUID
   * @param {string} fromCategory
   * @param {string} toCategory
   * @returns {{ success: boolean, error?: string }}
   */
  async changeCategory(id, fromCategory, toCategory) {
    const fromMT = this._mediaTypeForCategory(fromCategory);
    const toMT = this._mediaTypeForCategory(toCategory);

    if (!fromMT || !toMT) {
      return { success: false, error: 'Invalid category' };
    }
    if (fromMT !== toMT) {
      return { success: false, error: `Cannot move between different media types (${fromMT} → ${toMT})` };
    }
    if (fromCategory === toCategory) {
      return { success: true }; // no-op
    }

    // Remove from source
    const removed = await this.removeFromCategory(id, fromCategory);
    if (!removed) {
      return { success: false, error: `Item ${id} not found in category '${fromCategory}'` };
    }

    // Add to target
    await this.addToCategory(id, toCategory);
    return { success: true };
  }

  /**
   * Save the full category reference array (for reordering, bulk operations).
   * @param {string} category
   * @param {Array<string>} refs — ordered UUID array
   */
  async setCategoryRefs(category, refs) {
    await this._upsertCategoryRefs(category, refs);
  }

  /**
   * Upsert a category_refs row (internal helper).
   * @param {string} category — category_id
   * @param {Array<string>} refs — ordered UUID array
   */
  async _upsertCategoryRefs(category, refs) {
    const { error } = await this.supabase
      .from('category_refs')
      .upsert(
        {
          category_id: category,
          refs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'category_id' }
      );

    if (error) throw new Error(`SupabaseStore._upsertCategoryRefs: ${error.message}`);
  }

  // ─── Queries ───────────────────────────────────────────

  /**
   * Find an item by a specific field value.
   * Useful for backward compat (find by legacyId, etc.).
   * @param {string} field — field name (camelCase or snake_case)
   * @param {*} value — value to match
   * @returns {object|null} item or null
   */
  async findItemByField(field, value) {
    const dbCol = this._fieldToColumn(field);

    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq(dbCol, value)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`SupabaseStore.findItemByField: ${error.message}`);
    return data ? this._rowToItem(data) : null;
  }

  /**
   * Find which category contains a given item UUID.
   * Uses Postgres JSONB containment operator (@>).
   * @param {string} id — UUID
   * @returns {string|null} category ID or null
   */
  async findCategoryForItem(id) {
    const { data, error } = await this.supabase
      .from('category_refs')
      .select('category_id')
      .contains('refs', [id]);

    if (error) throw new Error(`SupabaseStore.findCategoryForItem: ${error.message}`);
    return (data && data.length > 0) ? data[0].category_id : null;
  }
}

module.exports = { SupabaseStore };
