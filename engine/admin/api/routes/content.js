/**
 * Content Routes
 * CRUD operations for portfolio content items + pile/gallery operations.
 *
 * IMPORTANT: Specific paths (/item, /update, /delete, /move-to-pile, etc.)
 * must be registered BEFORE the :category wildcard route.
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const manager = require('../lib/manager');
const { config } = require('../lib/config-loader');

const router = express.Router();

// Helper: resolve item by ID or title.en (backward compat)
function findItem(items, itemId) {
  for (let i = 0; i < items.length; i++) {
    let itemTitle = items[i].title;
    if (typeof itemTitle === 'object' && itemTitle !== null) {
      itemTitle = itemTitle.en || '';
    }
    if (items[i].id === itemId || itemTitle === itemId) {
      return { item: items[i], index: i };
    }
  }
  return { item: null, index: -1 };
}

// Helper: load data file for a category
async function loadDataFile(category) {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const dataFile = path.join(dataDir, `${category}.json`);
  if (!(await fs.pathExists(dataFile))) return { items: null, dataFile };
  try {
    const content = (await fs.readFile(dataFile, 'utf-8')).trim();
    const data = content ? JSON.parse(content) : [];
    return { items: Array.isArray(data) ? data : (data.items || []), dataFile };
  } catch {
    return { items: [], dataFile };
  }
}

// Helper: save data file
async function saveDataFile(dataFile, items) {
  await fs.writeFile(dataFile, JSON.stringify(items, null, 2), 'utf-8');
}

// ─── GET /api/content — All content from all categories ───

router.get('/', async (req, res) => {
  try {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const allContent = {};

    if (await fs.pathExists(dataDir)) {
      const files = await fs.readdir(dataDir);
      for (const filename of files) {
        if (!filename.endsWith('.json')) continue;
        const category = filename.slice(0, -5);
        const filePath = path.join(dataDir, filename);
        try {
          const data = await fs.readJson(filePath);
          if (Array.isArray(data)) {
            allContent[category] = data;
          } else if (data && data.items) {
            allContent[category] = data.items;
          } else {
            allContent[category] = [];
          }
        } catch {
          allContent[category] = [];
        }
      }
    }

    res.json(allContent);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/content/item — Single item by category + id ──

router.get('/item', async (req, res) => {
  const { category, id } = req.query;
  if (!category || !id) {
    return res.status(400).json({ error: 'Category and ID are required' });
  }

  const { items, dataFile } = await loadDataFile(category);
  if (items === null) {
    return res.status(404).json({ error: `Invalid category or file not found: ${category}` });
  }

  const { item } = findItem(items, id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  res.json({ success: true, item, category });
});

// ─── POST /api/content/update — Update item fields ─────────

router.post('/update', async (req, res) => {
  try {
    const { category, id, updates } = req.body;
    if (!category || !id) {
      return res.status(400).json({ error: 'Category and ID are required' });
    }

    const { items, dataFile } = await loadDataFile(category);
    if (items === null) {
      return res.status(404).json({ error: `Data file not found for category '${category}'` });
    }

    const { item } = findItem(items, id);
    if (!item) return res.status(404).json({ error: `Item '${id}' not found` });

    // Apply updates in-place
    for (const [key, value] of Object.entries(updates || {})) {
      item[key] = value;
    }

    await saveDataFile(dataFile, items);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/content/delete — Delete item + cloud assets ──

router.post('/delete', async (req, res) => {
  try {
    const { category, id } = req.body;
    if (!category || !id) {
      return res.status(400).json({ error: 'Category and ID are required' });
    }

    const result = await manager.deleteItem(category, id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error && result.error.includes('not found') ? 404 : 500).json(result);
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── POST /api/content/move-to-pile — Merge galleries ───────

router.post('/move-to-pile', async (req, res) => {
  try {
    const { category, sourceId, targetId } = req.body;
    if (!category || !sourceId || !targetId) {
      return res.status(400).json({ error: 'Category, sourceId, and targetId are required' });
    }

    const { items, dataFile } = await loadDataFile(category);
    if (items === null) {
      return res.status(404).json({ error: `Data file not found for category '${category}'` });
    }

    let sourceItem = null;
    let targetItem = null;
    const remainingItems = [];

    for (const item of items) {
      let itemTitle = item.title;
      if (typeof itemTitle === 'object' && itemTitle !== null) itemTitle = itemTitle.en || '';
      const identifier = item.id || itemTitle;

      if (identifier === sourceId) {
        sourceItem = item;
      } else if (identifier === targetId) {
        targetItem = item;
        remainingItems.push(item);
      } else {
        remainingItems.push(item);
      }
    }

    if (!sourceItem || !targetItem) {
      return res.status(404).json({ error: 'Source or target item not found' });
    }

    // Move images from source to target's gallery
    if (!targetItem.gallery) targetItem.gallery = [];
    if (sourceItem.url) targetItem.gallery.push(sourceItem.url);
    if (sourceItem.gallery) targetItem.gallery.push(...sourceItem.gallery);

    await saveDataFile(dataFile, remainingItems);
    res.json({ success: true, targetGalleryCount: targetItem.gallery.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/content/extract-from-pile ────────────────────

router.post('/extract-from-pile', async (req, res) => {
  try {
    const { category, sourceId, imageUrl, imageIndex, customTitle, customDescription } = req.body;
    if (!category || !sourceId || imageUrl === undefined || imageIndex === undefined) {
      return res.status(400).json({ error: 'category, sourceId, imageUrl, and imageIndex are required' });
    }

    const { items, dataFile } = await loadDataFile(category);
    if (items === null) {
      return res.status(404).json({ error: `Invalid category: ${category}` });
    }

    const { item: sourceItem } = findItem(items, sourceId);
    if (!sourceItem) return res.status(404).json({ error: 'Source item not found' });

    if (!sourceItem.gallery || imageIndex >= sourceItem.gallery.length) {
      return res.status(400).json({ error: 'Invalid image index' });
    }

    // Remove image from gallery
    const extractedUrl = sourceItem.gallery.splice(imageIndex, 1)[0];

    // Remove metadata for this image if it exists
    if (sourceItem.galleryMetadata && sourceItem.galleryMetadata[extractedUrl]) {
      delete sourceItem.galleryMetadata[extractedUrl];
    }

    // Create new item
    const now = new Date();
    const newId = `${category}_extracted_${Math.floor(now.getTime() / 1000)}`;

    let newTitle;
    if (customTitle) {
      newTitle = customTitle;
    } else {
      let sourceTitleEn = 'Untitled';
      if (typeof sourceItem.title === 'object' && sourceItem.title !== null) {
        sourceTitleEn = sourceItem.title.en || 'Untitled';
      } else if (sourceItem.title) {
        sourceTitleEn = sourceItem.title;
      }
      newTitle = `Photo ${imageIndex + 1} from ${sourceTitleEn}`;
    }

    const newItem = {
      id: newId,
      title: config.createMultilingualObject(newTitle),
      url: extractedUrl,
      date: sourceItem.date || now.toISOString().slice(0, 10),
      created: now.toISOString().slice(0, 10),
      description: config.createMultilingualObject(customDescription || ''),
    };

    items.push(newItem);
    await saveDataFile(dataFile, items);

    res.json({ success: true, newTitle, newId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/content/add-to-pile ──────────────────────────

router.post('/add-to-pile', async (req, res) => {
  try {
    const { category, sourceId, targetId, imageUrl, imageIndex } = req.body;
    if (!category || !sourceId || !targetId || imageUrl === undefined || imageIndex === undefined) {
      return res.status(400).json({ error: 'category, sourceId, targetId, imageUrl, and imageIndex are required' });
    }

    const { items, dataFile } = await loadDataFile(category);
    if (items === null) {
      return res.status(404).json({ error: `Invalid category: ${category}` });
    }

    const { item: sourceItem } = findItem(items, sourceId);
    const { item: targetItem } = findItem(items, targetId);
    if (!sourceItem) return res.status(404).json({ error: 'Source item not found' });
    if (!targetItem) return res.status(404).json({ error: 'Target item not found' });

    if (!sourceItem.gallery || imageIndex >= sourceItem.gallery.length) {
      return res.status(400).json({ error: 'Invalid image index' });
    }

    // Remove image from source, add to target
    const extractedUrl = sourceItem.gallery.splice(imageIndex, 1)[0];
    if (!targetItem.gallery) targetItem.gallery = [];
    targetItem.gallery.push(extractedUrl);

    await saveDataFile(dataFile, items);
    res.json({ success: true, targetGalleryCount: targetItem.gallery.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET/POST /api/content/:category — Category CRUD ────────
// MUST be registered LAST (wildcard catches everything)

router.get('/:category', async (req, res) => {
  try {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const dataFile = path.join(dataDir, `${req.params.category}.json`);

    if (!(await fs.pathExists(dataFile))) {
      return res.json({ items: [] });
    }

    const data = await fs.readJson(dataFile);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:category', async (req, res) => {
  try {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const dataFile = path.join(dataDir, `${req.params.category}.json`);

    await fs.writeFile(dataFile, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
