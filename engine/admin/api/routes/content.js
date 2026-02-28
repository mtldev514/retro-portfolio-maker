/**
 * Content Routes (Factory)
 * CRUD operations for portfolio content items + pile/gallery operations.
 * Uses DataStore abstraction for all data access.
 *
 * IMPORTANT: Specific paths (/item, /update, /delete, /move-to-pile, etc.)
 * must be registered BEFORE the :category wildcard route.
 */

const express = require('express');
const { config } = require('../lib/config-loader');

/**
 * Create content router with injected DataStore.
 * @param {import('../lib/data-store').JsonFileStore} store
 */
module.exports = function createContentRouter(store) {
  const router = express.Router();

  // ─── GET /api/content — All content (or single category with ?category=) ───

  router.get('/', async (req, res) => {
    try {
      if (req.query.category) {
        // Single category — lighter response for large portfolios
        const items = await store.getCategoryItems(req.query.category);
        return res.json({ [req.query.category]: items });
      }
      const allContent = await store.getAllCategorizedItems();
      res.json(allContent);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── GET /api/content/item — Single item by UUID ──────────

  router.get('/item', async (req, res) => {
    const { id, category } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    try {
      const item = await store.getItem(id);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      // Look up category if not provided
      const cat = category || await store.findCategoryForItem(id);
      res.json({ success: true, item, category: cat });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── POST /api/content/update — Update item fields ─────────

  router.post('/update', async (req, res) => {
    try {
      const { id, updates } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const item = await store.updateItem(id, updates);
      if (!item) return res.status(404).json({ error: `Item '${id}' not found` });

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

      const manager = require('../lib/manager');
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

  // ─── POST /api/content/change-category — Move item between categories ──

  router.post('/change-category', async (req, res) => {
    try {
      const { id, fromCategory, toCategory } = req.body;
      if (!id || !fromCategory || !toCategory) {
        return res.status(400).json({ error: 'id, fromCategory, and toCategory are required' });
      }

      // Validate both categories exist in config
      if (!config.getCategory(fromCategory)) {
        return res.status(400).json({ error: `Unknown category: '${fromCategory}'` });
      }
      if (!config.getCategory(toCategory)) {
        return res.status(400).json({ error: `Unknown category: '${toCategory}'` });
      }

      const result = await store.changeCategory(id, fromCategory, toCategory);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── POST /api/content/move-to-pile — Merge galleries ───────

  router.post('/move-to-pile', async (req, res) => {
    try {
      const { category, sourceId, targetId } = req.body;
      if (!category || !sourceId || !targetId) {
        return res.status(400).json({ error: 'Category, sourceId, and targetId are required' });
      }

      const sourceItem = await store.getItem(sourceId);
      const targetItem = await store.getItem(targetId);
      if (!sourceItem || !targetItem) {
        return res.status(404).json({ error: 'Source or target item not found' });
      }

      // Merge images from source into target's gallery
      const gallery = targetItem.gallery ? [...targetItem.gallery] : [];
      if (sourceItem.url) gallery.push(sourceItem.url);
      if (sourceItem.gallery) gallery.push(...sourceItem.gallery);

      await store.updateItem(targetId, { gallery });

      // Remove source from category refs and media-type file
      await store.removeFromCategory(sourceId, category);
      await store.deleteItem(sourceId);

      res.json({ success: true, targetGalleryCount: gallery.length });
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

      const sourceItem = await store.getItem(sourceId);
      if (!sourceItem) return res.status(404).json({ error: 'Source item not found' });

      if (!sourceItem.gallery || imageIndex >= sourceItem.gallery.length) {
        return res.status(400).json({ error: 'Invalid image index' });
      }

      // Remove image from source gallery
      const updatedGallery = [...sourceItem.gallery];
      updatedGallery.splice(imageIndex, 1);

      // Remove metadata for this image if it exists
      const updatedMetadata = sourceItem.galleryMetadata
        ? { ...sourceItem.galleryMetadata }
        : undefined;
      if (updatedMetadata && updatedMetadata[imageUrl]) {
        delete updatedMetadata[imageUrl];
      }

      const sourceUpdates = { gallery: updatedGallery };
      if (updatedMetadata) sourceUpdates.galleryMetadata = updatedMetadata;
      await store.updateItem(sourceId, sourceUpdates);

      // Determine title for new extracted item
      const now = new Date();
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

      // Create new item via DataStore
      const mediaType = store._mediaTypeForCategory(category);
      if (!mediaType) return res.status(400).json({ error: `Invalid category: ${category}` });

      const newItem = await store.createItem(mediaType, {
        title: config.createMultilingualObject(newTitle),
        url: imageUrl,
        date: sourceItem.date || now.toISOString().slice(0, 10),
        created: now.toISOString().slice(0, 10),
        description: config.createMultilingualObject(customDescription || ''),
      });

      // Add new item to category refs
      await store.addToCategory(newItem.id, category);

      res.json({ success: true, newTitle, newId: newItem.id });
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

      const sourceItem = await store.getItem(sourceId);
      const targetItem = await store.getItem(targetId);
      if (!sourceItem) return res.status(404).json({ error: 'Source item not found' });
      if (!targetItem) return res.status(404).json({ error: 'Target item not found' });

      if (!sourceItem.gallery || imageIndex >= sourceItem.gallery.length) {
        return res.status(400).json({ error: 'Invalid image index' });
      }

      // Remove image from source gallery
      const updatedSourceGallery = [...sourceItem.gallery];
      const extractedUrl = updatedSourceGallery.splice(imageIndex, 1)[0];
      await store.updateItem(sourceId, { gallery: updatedSourceGallery });

      // Add image to target gallery
      const updatedTargetGallery = targetItem.gallery ? [...targetItem.gallery] : [];
      updatedTargetGallery.push(extractedUrl);
      await store.updateItem(targetId, { gallery: updatedTargetGallery });

      res.json({ success: true, targetGalleryCount: updatedTargetGallery.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── GET/POST /api/content/:category — Category CRUD ────────
  // MUST be registered LAST (wildcard catches everything)

  router.get('/:category', async (req, res) => {
    try {
      const items = await store.getCategoryItems(req.params.category);
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/:category', async (req, res) => {
    try {
      const data = req.body;

      if (Array.isArray(data)) {
        if (data.length === 0 || typeof data[0] === 'string') {
          // UUID array — save directly as category refs
          await store.setCategoryRefs(req.params.category, data);
        } else {
          // Item objects array (backward compat: reorder) — extract IDs
          const refs = data.map(item => item.id).filter(Boolean);
          await store.setCategoryRefs(req.params.category, refs);
        }
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
