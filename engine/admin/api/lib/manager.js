/**
 * Content Manager for Admin API
 * Handles file uploads (Supabase Storage, Cloudinary, GitHub Releases),
 * content creation/deletion, and cloud asset management.
 *
 * Uses DataStore for all data operations.
 * Storage provider is selected by mode:
 *   - "supabase" → Supabase Storage (default for new setups)
 *   - "local"    → Cloudinary (legacy)
 */

const fs = require('fs-extra');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { config } = require('./config-loader');
const {
  uploadToSupabaseStorage,
  deleteFromSupabaseStorage,
  isSupabaseStorageUrl,
} = require('./storage-provider');

// Media content types for GitHub Releases
const MEDIA_CONTENT_TYPES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

let GITHUB_TOKEN = null;
let GITHUB_REPO = null;
let RELEASE_TAG = 'media';
let GITHUB_UPLOAD_CATEGORIES = new Set(['music']);
let store = null;
let mode = 'local'; // 'local' (Cloudinary) or 'supabase'

/**
 * Initialize manager with DataStore and env vars.
 * Called after config is loaded and store is created.
 * @param {object} dataStore — JsonFileStore or SupabaseStore instance
 * @param {object} [opts] — options
 * @param {string} [opts.mode='local'] — 'local' (Cloudinary) or 'supabase' (Supabase Storage)
 */
function init(dataStore, opts = {}) {
  store = dataStore;
  mode = opts.mode || 'local';

  // Configure Cloudinary only in local mode (legacy)
  if (mode !== 'supabase') {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  // GitHub config (used in both modes for audio/video uploads)
  GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
  GITHUB_REPO = config.getGithubRepo();
  const ghConfig = config.getGithubConfig();
  RELEASE_TAG = ghConfig.mediaReleaseTag || 'media';
  GITHUB_UPLOAD_CATEGORIES = new Set(ghConfig.uploadCategories || ['music']);

  console.log(`Manager initialized (mode: ${mode})`);
}

// ─── GitHub Releases ──────────────────────────────────────

async function getOrCreateRelease() {
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  };

  // Try to get existing release by tag
  const getResp = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${RELEASE_TAG}`,
    { headers }
  );
  if (getResp.ok) return getResp.json();

  // Create a new release
  console.log(`Creating GitHub Release '${RELEASE_TAG}'...`);
  const createResp = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: RELEASE_TAG,
        name: 'Media Assets',
        body: 'Audio and video files for the portfolio.',
        draft: false,
        prerelease: false,
      }),
    }
  );
  if (!createResp.ok) {
    throw new Error(`Failed to create GitHub Release: ${createResp.statusText}`);
  }
  return createResp.json();
}

async function uploadToGithubRelease(filePath, filename) {
  const release = await getOrCreateRelease();
  const uploadUrl = release.upload_url.replace('{?name,label}', '');

  const ext = path.extname(filename).toLowerCase();
  const contentType = MEDIA_CONTENT_TYPES[ext] || 'application/octet-stream';
  const uniqueFilename = `${Math.floor(Date.now() / 1000)}_${filename}`;

  console.log(`Uploading asset '${uniqueFilename}' (${contentType})...`);
  const fileBuffer = await fs.readFile(filePath);

  const resp = await fetch(`${uploadUrl}?name=${encodeURIComponent(uniqueFilename)}`, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': contentType,
      Accept: 'application/vnd.github.v3+json',
    },
    body: fileBuffer,
  });

  if (!resp.ok) {
    throw new Error(`GitHub upload failed: ${resp.statusText}`);
  }
  const data = await resp.json();
  return data.browser_download_url;
}

// ─── Cloud Upload ─────────────────────────────────────────

async function uploadSingle(filePath, category) {
  // GitHub Releases for configured categories (works in both modes)
  if (GITHUB_UPLOAD_CATEGORIES.has(category) && GITHUB_TOKEN) {
    console.log(`Uploading ${filePath} to GitHub Releases...`);
    const url = await uploadToGithubRelease(filePath, path.basename(filePath));
    console.log(`Success! URL: ${url}`);
    return url;
  }

  // Supabase Storage (supabase mode)
  if (mode === 'supabase') {
    console.log(`Uploading ${filePath} to Supabase Storage...`);
    return uploadToSupabaseStorage(filePath, category);
  }

  // Cloudinary (local/legacy mode)
  const resourceType = category === 'video' ? 'video' : 'auto';
  console.log(`Uploading ${filePath} to Cloudinary...`);
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `portfolio/${category}`,
    resource_type: resourceType,
  });
  const url = result.secure_url;
  console.log(`Success! URL: ${url}`);
  return url;
}

// ─── Upload & Save (DataStore) ────────────────────────────

async function uploadAndSave(filePath, title, category, opts = {}) {
  const { medium, genre, description, created } = opts;
  console.log(`--- Processing: ${title} (${category}) ---`);

  const mediaUrl = await uploadSingle(filePath, category);

  // Determine media type for this category
  const ct = config.getContentType(category);
  if (!ct) throw new Error(`Category '${category}' is invalid.`);
  const mediaType = ct.mediaType;

  const makeMultilingual = (val) => val ? config.createMultilingualObject(val) : undefined;
  const now = new Date();

  const newEntry = {
    title: makeMultilingual(title),
    url: mediaUrl,
    date: now.toISOString().slice(0, 10),
    created: created || now.toISOString().slice(0, 10),
  };

  if (medium) newEntry.medium = makeMultilingual(medium);
  if (genre) newEntry.genre = makeMultilingual(genre);
  if (description) newEntry.description = makeMultilingual(description);

  // Create item in media-type data file (generates UUID)
  const item = await store.createItem(mediaType, newEntry);

  // Add to category reference file
  await store.addToCategory(item.id, category);

  updateSiteTimestamp();
  return item;
}

// ─── Cloud Deletion ───────────────────────────────────────

function extractCloudinaryPublicId(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  let p = parts[1];
  p = p.replace(/^v\d+\//, '');       // Remove version prefix
  p = p.replace(/\.[^.]+$/, '');       // Remove extension
  return p;
}

async function deleteFromCloudinary(url) {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) {
    console.log(`Skipping Cloudinary delete: not a Cloudinary URL (${url})`);
    return false;
  }

  try {
    console.log(`Deleting from Cloudinary: ${publicId}`);
    let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });

    // Also try as video if image deletion failed
    if (result.result !== 'ok') {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    }

    if (result.result === 'ok') {
      console.log(`Successfully deleted from Cloudinary: ${publicId}`);
      return true;
    }
    console.log(`Cloudinary deletion returned: ${result.result} for ${publicId}`);
    return false;
  } catch (e) {
    console.error(`Error deleting from Cloudinary: ${e.message}`);
    return false;
  }
}

async function deleteFromGithubRelease(url) {
  if (!url || (!url.includes('github.com') && !url.includes('githubusercontent.com'))) {
    return false;
  }

  const filename = url.split('/').pop();

  try {
    const release = await getOrCreateRelease();
    const assets = release.assets || [];

    for (const asset of assets) {
      if (asset.name === filename) {
        console.log(`Deleting from GitHub Release: ${filename}`);
        const resp = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/releases/assets/${asset.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (resp.status === 204) {
          console.log(`Successfully deleted from GitHub Release: ${filename}`);
          return true;
        }
        console.log(`GitHub deletion failed with status ${resp.status}`);
        return false;
      }
    }

    console.log(`Asset not found in GitHub Release: ${filename}`);
    return false;
  } catch (e) {
    console.error(`Error deleting from GitHub Release: ${e.message}`);
    return false;
  }
}

// ─── Cloud Asset Cleanup ──────────────────────────────────

/**
 * Delete a single cloud asset URL, trying each provider by URL pattern.
 * @param {string} url — cloud asset URL
 * @returns {boolean} true if deleted
 */
async function deleteSingleCloudAsset(url) {
  if (!url) return false;

  // Try Supabase Storage first (if URL matches)
  if (isSupabaseStorageUrl(url)) {
    return deleteFromSupabaseStorage(url);
  }

  // Try Cloudinary
  if (url.includes('cloudinary.com')) {
    return deleteFromCloudinary(url);
  }

  // Try GitHub Releases
  if (url.includes('github.com') || url.includes('githubusercontent.com')) {
    return deleteFromGithubRelease(url);
  }

  console.log(`Unknown cloud provider for URL: ${url}`);
  return false;
}

/**
 * Delete all cloud assets (URLs) associated with an item.
 * Detects the provider from each URL pattern.
 * @param {object} item — item with url and optional gallery array
 * @returns {{ deletedUrls: string[], failedUrls: string[] }}
 */
async function deleteCloudAssets(item) {
  const deletedUrls = [];
  const failedUrls = [];

  // Collect all URLs to delete
  const urls = [];
  if (item.url) urls.push(item.url);
  for (const galleryUrl of (item.gallery || [])) {
    urls.push(galleryUrl);
  }

  // Delete each URL, trying the appropriate provider
  for (const url of urls) {
    if (await deleteSingleCloudAsset(url)) {
      deletedUrls.push(url);
    } else {
      failedUrls.push(url);
    }
  }

  return { deletedUrls, failedUrls };
}

// ─── Item Deletion (DataStore) ────────────────────────────

async function deleteItem(category, itemId) {
  console.log(`--- Deleting: ${itemId} from ${category} ---`);

  // Find the item (try UUID, then legacy ID for backward compat)
  let item = await store.getItem(itemId);
  if (!item) {
    item = await store.findItemByField('legacyId', itemId);
  }
  if (!item) {
    return { success: false, error: `Item '${itemId}' not found` };
  }

  const id = item.id;

  // Delete from cloud storage
  const { deletedUrls, failedUrls } = await deleteCloudAssets(item);

  // Remove from DataStore (media-type file + category refs)
  await store.deleteItem(id);
  await store.removeFromCategory(id, category);

  updateSiteTimestamp();

  const result = {
    success: true,
    message: `Deleted '${id}' from ${category}`,
    deleted_urls: deletedUrls.length,
    failed_urls: failedUrls.length,
  };

  if (failedUrls.length > 0) {
    result.warning = `Some cloud files could not be deleted: ${failedUrls.join(', ')}`;
  }

  return result;
}

// ─── Site Timestamp ───────────────────────────────────────

function updateSiteTimestamp() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  const possibleFiles = [
    'index.html',
    path.join(config.contentRoot || '.', 'index.html'),
  ];

  for (const filePath of possibleFiles) {
    try {
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('Last Updated:</span>')) {
          content = content.replace(
            /Last Updated:<\/span> \d{1,2} \w{3} \d{4}/,
            `Last Updated:</span> ${formatted}`
          );
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`Updated timestamp in ${filePath}`);
        }
      }
    } catch (e) {
      console.error(`Failed to update timestamp in ${filePath}: ${e.message}`);
    }
  }
}

module.exports = {
  init,
  uploadSingle,
  uploadAndSave,
  deleteItem,
  deleteCloudAssets,
  deleteFromCloudinary,
  deleteFromGithubRelease,
  extractCloudinaryPublicId,
  getOrCreateRelease,
  uploadToGithubRelease,
  updateSiteTimestamp,
};
