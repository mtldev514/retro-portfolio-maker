/**
 * DataStore — Storage-agnostic data access layer (Repository Pattern)
 *
 * Normalized data model:
 *   - Media-type files (data/image.json) → source of truth, items with UUID ids
 *   - Category ref files (data/painting.json) → ordered arrays of UUIDs
 *
 * JsonFileStore is the Phase 1 implementation (flat JSON files).
 * Phase 2: swap for SupabaseStore with the same interface.
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// ─── Abstract Interface ──────────────────────────────────

/**
 * DataStore interface — all implementations must provide these methods.
 * Documented here for reference; JsonFileStore below is the concrete impl.
 *
 * Items (media-type level):
 *   getAllItems(mediaType)           → [{id, title, url, ...}]
 *   getItem(id)                     → {id, title, url, ...} or null
 *   createItem(mediaType, item)     → item with generated UUID
 *   updateItem(id, updates)         → updated item or null
 *   deleteItem(id)                  → removed item (for cloud cleanup) or null
 *
 * Categories (organizational layer):
 *   getCategoryRefs(category)       → ["uuid1", "uuid2"]
 *   getCategoryItems(category)      → resolved [{id, title, ...}] in ref order
 *   getAllCategorizedItems()         → { painting: [...], music: [...] }
 *   addToCategory(id, category)     → true/false
 *   removeFromCategory(id, category)→ true/false
 *   changeCategory(id, from, to)    → true/false
 *
 * Queries:
 *   findItemByField(field, value)   → item or null
 */

// ─── JsonFileStore Implementation ────────────────────────

class JsonFileStore {
  /**
   * @param {object} configLoader — Admin API ConfigLoader instance
   */
  constructor(configLoader) {
    this.config = configLoader;
    this.dataDir = configLoader.dataDir;
  }

  // ─── Helpers ─────────────────────────────────────────

  /**
   * Get the absolute path to a media-type data file.
   * e.g. "image" → "/path/to/data/image.json"
   */
  _mediaTypeFilePath(mediaTypeId) {
    const mt = this.config.getMediaType(mediaTypeId);
    if (!mt || !mt.dataFile) {
      // Fallback: data/<mediaType>.json
      return path.join(this.dataDir, `${mediaTypeId}.json`);
    }
    const filename = mt.dataFile.replace(/^data\//, '');
    return path.join(this.dataDir, filename);
  }

  /**
   * Get the absolute path to a category reference file.
   * e.g. "painting" → "/path/to/data/painting.json"
   */
  _categoryRefFilePath(categoryId) {
    return path.join(this.dataDir, `${categoryId}.json`);
  }

  /**
   * Look up the media type ID for a given category.
   * e.g. "painting" → "image"
   */
  _mediaTypeForCategory(categoryId) {
    const ct = this.config.getContentType(categoryId);
    return ct ? ct.mediaType : null;
  }

  /**
   * Get all categories that share the same media type.
   * e.g. "painting" → ["painting", "drawing", "photography", "sculpting"]
   */
  _siblingCategories(categoryId) {
    const mediaType = this._mediaTypeForCategory(categoryId);
    if (!mediaType) return [];
    return this.config.getContentTypes()
      .filter(ct => ct.mediaType === mediaType)
      .map(ct => ct.id);
  }

  /**
   * Read a JSON file, returning default value if missing or invalid.
   */
  async _readJson(filePath, defaultValue = []) {
    try {
      if (!(await fs.pathExists(filePath))) return defaultValue;
      const content = (await fs.readFile(filePath, 'utf-8')).trim();
      return content ? JSON.parse(content) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Write JSON to a file with pretty-printing.
   */
  async _writeJson(filePath, data) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Generate a new UUID for an item.
   */
  _generateId() {
    return crypto.randomUUID();
  }

  // ─── Items (media-type level) ────────────────────────

  /**
   * Get all items for a media type.
   * @param {string} mediaType — e.g. "image", "audio"
   * @returns {Array} items array
   */
  async getAllItems(mediaType) {
    const filePath = this._mediaTypeFilePath(mediaType);
    return this._readJson(filePath, []);
  }

  /**
   * Get a single item by UUID, searching across all media-type files.
   * @param {string} id — UUID
   * @returns {object|null} item or null
   */
  async getItem(id) {
    for (const mt of this.config.getMediaTypes()) {
      const items = await this.getAllItems(mt.id);
      const item = items.find(i => i.id === id);
      if (item) return item;
    }
    return null;
  }

  /**
   * Create a new item in the specified media-type file.
   * Generates a UUID if not present.
   * @param {string} mediaType — e.g. "image"
   * @param {object} item — item data (id will be assigned)
   * @returns {object} the created item with id
   */
  async createItem(mediaType, item) {
    const filePath = this._mediaTypeFilePath(mediaType);
    const items = await this._readJson(filePath, []);

    if (!item.id) {
      item.id = this._generateId();
    }

    items.push(item);
    await this._writeJson(filePath, items);
    return item;
  }

  /**
   * Update an item's fields by UUID.
   * @param {string} id — UUID
   * @param {object} updates — key/value pairs to merge
   * @returns {object|null} updated item, or null if not found
   */
  async updateItem(id, updates) {
    for (const mt of this.config.getMediaTypes()) {
      const filePath = this._mediaTypeFilePath(mt.id);
      const items = await this._readJson(filePath, []);
      const item = items.find(i => i.id === id);

      if (item) {
        for (const [key, value] of Object.entries(updates || {})) {
          item[key] = value;
        }
        await this._writeJson(filePath, items);
        return item;
      }
    }
    return null;
  }

  /**
   * Delete an item by UUID from its media-type file.
   * Returns the removed item (for cloud cleanup) or null.
   * Does NOT remove from category refs — call removeFromCategory separately.
   * @param {string} id — UUID
   * @returns {object|null} removed item or null
   */
  async deleteItem(id) {
    for (const mt of this.config.getMediaTypes()) {
      const filePath = this._mediaTypeFilePath(mt.id);
      const items = await this._readJson(filePath, []);
      const index = items.findIndex(i => i.id === id);

      if (index !== -1) {
        const [removed] = items.splice(index, 1);
        await this._writeJson(filePath, items);
        return removed;
      }
    }
    return null;
  }

  // ─── Categories (organizational layer) ───────────────

  /**
   * Get the ordered array of UUIDs for a category.
   * @param {string} category — e.g. "painting"
   * @returns {Array<string>} UUID array
   */
  async getCategoryRefs(category) {
    const filePath = this._categoryRefFilePath(category);
    return this._readJson(filePath, []);
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

    const allItems = await this.getAllItems(mediaType);
    const itemMap = new Map(allItems.map(i => [i.id, i]));

    // Resolve in ref order, skip missing
    return refs
      .map(id => itemMap.get(id))
      .filter(Boolean);
  }

  /**
   * Get all items grouped by category — same shape as old GET /api/content.
   * @returns {object} { painting: [...], music: [...], ... }
   */
  async getAllCategorizedItems() {
    const result = {};
    for (const ct of this.config.getContentTypes()) {
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
    const filePath = this._categoryRefFilePath(category);
    const refs = await this._readJson(filePath, []);

    if (refs.includes(id)) return true; // already there
    refs.push(id);

    await this._writeJson(filePath, refs);
    return true;
  }

  /**
   * Remove an item UUID from a category's reference array.
   * @param {string} id — UUID
   * @param {string} category — category to remove from
   * @returns {boolean} true if removed, false if not found
   */
  async removeFromCategory(id, category) {
    const filePath = this._categoryRefFilePath(category);
    const refs = await this._readJson(filePath, []);
    const index = refs.indexOf(id);

    if (index === -1) return false;
    refs.splice(index, 1);

    await this._writeJson(filePath, refs);
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
    const filePath = this._categoryRefFilePath(category);
    await this._writeJson(filePath, refs);
  }

  // ─── Queries ─────────────────────────────────────────

  /**
   * Find an item by a specific field value across all media types.
   * Useful for backward compat (find by old ID or title).
   * @param {string} field — field name (e.g. "id", "legacyId")
   * @param {*} value — value to match
   * @returns {object|null} item or null
   */
  async findItemByField(field, value) {
    for (const mt of this.config.getMediaTypes()) {
      const items = await this.getAllItems(mt.id);
      const item = items.find(i => i[field] === value);
      if (item) return item;
    }
    return null;
  }

  /**
   * Find which category contains a given item UUID.
   * @param {string} id — UUID
   * @returns {string|null} category ID or null
   */
  async findCategoryForItem(id) {
    for (const ct of this.config.getContentTypes()) {
      const refs = await this.getCategoryRefs(ct.id);
      if (refs.includes(id)) return ct.id;
    }
    return null;
  }
}

module.exports = { JsonFileStore };
