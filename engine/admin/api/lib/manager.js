/**
 * Content Manager for Admin API
 * Port of Python manager.py — handles Cloudinary uploads,
 * GitHub Releases uploads, content deletion, and JSON management.
 */

const fs = require('fs-extra');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { config } = require('./config-loader');

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
let JSON_MAP = {};

/**
 * Initialize manager with current config and env vars.
 * Called after config is loaded.
 */
function init() {
  // Configure Cloudinary from env vars
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  // GitHub config
  GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
  GITHUB_REPO = config.getGithubRepo();
  const ghConfig = config.getGithubConfig();
  RELEASE_TAG = ghConfig.mediaReleaseTag || 'media';
  GITHUB_UPLOAD_CATEGORIES = new Set(ghConfig.uploadCategories || ['music']);

  // Build category → data file map
  JSON_MAP = config.getCategoryMap();
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
  if (GITHUB_UPLOAD_CATEGORIES.has(category) && GITHUB_TOKEN) {
    console.log(`Uploading ${filePath} to GitHub Releases...`);
    const url = await uploadToGithubRelease(filePath, path.basename(filePath));
    console.log(`Success! URL: ${url}`);
    return url;
  }

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

// ─── Upload & Save ────────────────────────────────────────

async function uploadAndSave(filePath, title, category, opts = {}) {
  const { medium, genre, description, created } = opts;
  console.log(`--- Processing: ${title} (${category}) ---`);

  const mediaUrl = await uploadSingle(filePath, category);

  // Determine JSON file
  const jsonPath = JSON_MAP[category];
  if (!jsonPath) throw new Error(`Category '${category}' is invalid.`);

  // Load existing data
  let data = [];
  if (await fs.pathExists(jsonPath)) {
    try {
      const content = (await fs.readFile(jsonPath, 'utf-8')).trim();
      data = content ? JSON.parse(content) : [];
    } catch {
      data = [];
    }
  }

  const makeMultilingual = (val) => val ? config.createMultilingualObject(val) : undefined;
  const now = new Date();

  const newEntry = {
    id: `${category}_${Math.floor(now.getTime() / 1000)}`,
    title: makeMultilingual(title),
    url: mediaUrl,
    date: now.toISOString().slice(0, 10),
    created: created || now.toISOString().slice(0, 10),
  };

  if (medium) newEntry.medium = makeMultilingual(medium);
  if (genre) newEntry.genre = makeMultilingual(genre);
  if (description) newEntry.description = makeMultilingual(description);

  data.push(newEntry);

  await fs.writeFile(jsonPath, JSON.stringify(data, null, 4), 'utf-8');
  console.log(`Updated ${jsonPath}`);

  updateSiteTimestamp();
  return newEntry;
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

// ─── Item Deletion ────────────────────────────────────────

async function deleteItem(category, itemId) {
  console.log(`--- Deleting: ${itemId} from ${category} ---`);

  const jsonPath = JSON_MAP[category];
  if (!jsonPath) return { success: false, error: `Category '${category}' is invalid` };
  if (!(await fs.pathExists(jsonPath))) {
    return { success: false, error: `Data file not found for category '${category}'` };
  }

  let data;
  try {
    const content = (await fs.readFile(jsonPath, 'utf-8')).trim();
    data = content ? JSON.parse(content) : [];
  } catch {
    return { success: false, error: 'Invalid JSON in data file' };
  }

  // Find the item to delete
  let itemToDelete = null;
  const newData = [];
  for (const item of data) {
    let itemTitle = item.title;
    if (typeof itemTitle === 'object' && itemTitle !== null) {
      itemTitle = itemTitle.en || '';
    }
    if (item.id === itemId || itemTitle === itemId) {
      itemToDelete = item;
    } else {
      newData.push(item);
    }
  }

  if (!itemToDelete) {
    return { success: false, error: `Item '${itemId}' not found in ${category}` };
  }

  // Delete from cloud storage
  const deletedUrls = [];
  const failedUrls = [];

  // Delete main URL
  if (itemToDelete.url) {
    if (await deleteFromCloudinary(itemToDelete.url)) {
      deletedUrls.push(itemToDelete.url);
    } else if (await deleteFromGithubRelease(itemToDelete.url)) {
      deletedUrls.push(itemToDelete.url);
    } else {
      failedUrls.push(itemToDelete.url);
    }
  }

  // Delete gallery images
  const gallery = itemToDelete.gallery || [];
  for (const galleryUrl of gallery) {
    if (await deleteFromCloudinary(galleryUrl)) {
      deletedUrls.push(galleryUrl);
    } else {
      failedUrls.push(galleryUrl);
    }
  }

  // Save updated data
  try {
    await fs.writeFile(jsonPath, JSON.stringify(newData, null, 4), 'utf-8');
    console.log(`Removed item from ${jsonPath}`);
  } catch (e) {
    return { success: false, error: `Failed to update JSON: ${e.message}` };
  }

  updateSiteTimestamp();

  const result = {
    success: true,
    message: `Deleted '${itemId}' from ${category}`,
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
  deleteFromCloudinary,
  deleteFromGithubRelease,
  extractCloudinaryPublicId,
  getOrCreateRelease,
  uploadToGithubRelease,
  updateSiteTimestamp,
};
