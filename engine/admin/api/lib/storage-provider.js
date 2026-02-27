/**
 * Supabase Storage Provider
 *
 * Handles file uploads and deletions using Supabase Storage buckets,
 * replacing Cloudinary for media file hosting.
 *
 * Bucket: "portfolio-media" (public, created on first upload if missing)
 * Path:   {category}/{timestamp}_{filename}
 * URL:    https://{project}.supabase.co/storage/v1/object/public/portfolio-media/{path}
 */

const fs = require('fs-extra');
const path = require('path');
const { getSupabaseClient } = require('./supabase-client');

const BUCKET_NAME = 'portfolio-media';

/** MIME type mapping for common media files */
const MIME_TYPES = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  // Documents
  '.pdf': 'application/pdf',
};

/**
 * Get the MIME type for a filename based on its extension.
 * @param {string} filename
 * @returns {string} MIME type
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Ensure the storage bucket exists, creating it as public if needed.
 * Called once before the first upload.
 */
let _bucketReady = false;

async function ensureBucket() {
  if (_bucketReady) return;

  const supabase = getSupabaseClient();
  const { data: buckets } = await supabase.storage.listBuckets();

  const exists = (buckets || []).some(b => b.name === BUCKET_NAME);

  if (!exists) {
    console.log(`Creating Supabase Storage bucket: ${BUCKET_NAME}`);
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 100 * 1024 * 1024, // 100 MB
    });

    if (error) {
      // Bucket may have been created by another process / migration
      if (!error.message.includes('already exists')) {
        throw new Error(`Failed to create bucket '${BUCKET_NAME}': ${error.message}`);
      }
    }
    console.log(`Bucket '${BUCKET_NAME}' created (public).`);
  }

  _bucketReady = true;
}

/**
 * Upload a file to Supabase Storage.
 * @param {string} filePath — local path to the file
 * @param {string} category — category folder (e.g. "painting", "music")
 * @returns {string} public URL of the uploaded file
 */
async function uploadToSupabaseStorage(filePath, category) {
  await ensureBucket();

  const supabase = getSupabaseClient();
  const filename = path.basename(filePath);
  const timestamp = Math.floor(Date.now() / 1000);
  const storagePath = `${category}/${timestamp}_${filename}`;
  const contentType = getMimeType(filename);

  console.log(`Uploading to Supabase Storage: ${storagePath} (${contentType})`);

  const fileBuffer = await fs.readFile(filePath);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;
  console.log(`Success! URL: ${publicUrl}`);
  return publicUrl;
}

/**
 * Delete a file from Supabase Storage by its public URL.
 * Extracts the storage path from the URL and removes the object.
 * @param {string} url — public URL of the file
 * @returns {boolean} true if deleted, false if failed
 */
async function deleteFromSupabaseStorage(url) {
  if (!url || !url.includes('supabase.co/storage')) {
    console.log(`Skipping Supabase Storage delete: not a Supabase URL (${url})`);
    return false;
  }

  try {
    // Extract storage path from public URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const marker = `/object/public/${BUCKET_NAME}/`;
    const markerIndex = url.indexOf(marker);

    if (markerIndex === -1) {
      console.log(`Could not extract storage path from URL: ${url}`);
      return false;
    }

    const storagePath = decodeURIComponent(url.substring(markerIndex + marker.length));
    console.log(`Deleting from Supabase Storage: ${storagePath}`);

    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error(`Supabase Storage deletion error: ${error.message}`);
      return false;
    }

    console.log(`Successfully deleted from Supabase Storage: ${storagePath}`);
    return true;
  } catch (e) {
    console.error(`Error deleting from Supabase Storage: ${e.message}`);
    return false;
  }
}

/**
 * Check if a URL is a Supabase Storage URL.
 * @param {string} url
 * @returns {boolean}
 */
function isSupabaseStorageUrl(url) {
  return url && url.includes('supabase.co/storage');
}

/** Reset bucket readiness flag (for testing). */
function resetBucketReady() {
  _bucketReady = false;
}

module.exports = {
  uploadToSupabaseStorage,
  deleteFromSupabaseStorage,
  isSupabaseStorageUrl,
  ensureBucket,
  getMimeType,
  resetBucketReady,
  BUCKET_NAME,
};
