-- ============================================================
-- Supabase Setup for Retro Portfolio
-- ============================================================
-- Run this in the Supabase SQL Editor to create the required
-- tables, RLS policies, and storage bucket.
--
-- Tables:
--   config         — key/value config (app.json, categories.json, etc.)
--   items          — media items (images, audio, video, etc.)
--   category_refs  — ordered UUID arrays per category
--   translations   — per-language translation data
--
-- Storage:
--   portfolio-media — public bucket for uploaded files
-- ============================================================

-- ─── 1. Config Table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS config (
  key          TEXT PRIMARY KEY,
  value        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Items Table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type        TEXT NOT NULL,
  title             JSONB DEFAULT '{}'::jsonb,
  url               TEXT,
  date              TEXT,
  created           TEXT,
  medium            JSONB,
  genre             JSONB,
  description       JSONB,
  gallery           JSONB DEFAULT '[]'::jsonb,
  gallery_metadata  JSONB,
  visibility        TEXT DEFAULT 'visible',
  website           TEXT,
  project_url       TEXT,
  legacy_id         TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for media type queries (getAllItems)
CREATE INDEX IF NOT EXISTS idx_items_media_type ON items (media_type);

-- Index for legacy ID lookups (findItemByField)
CREATE INDEX IF NOT EXISTS idx_items_legacy_id ON items (legacy_id);

-- ─── 3. Category Refs Table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS category_refs (
  category_id  TEXT PRIMARY KEY,
  refs         JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GIN index for containment queries (findCategoryForItem)
CREATE INDEX IF NOT EXISTS idx_category_refs_refs ON category_refs USING GIN (refs);

-- ─── 4. Translations Table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS translations (
  lang_code    TEXT PRIMARY KEY,
  data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. Row Level Security ───────────────────────────────────
-- Public read via publishable key, full write via service role.

-- Config
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read config"
  ON config FOR SELECT
  USING (true);

CREATE POLICY "Service role write config"
  ON config FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read items"
  ON items FOR SELECT
  USING (true);

CREATE POLICY "Service role write items"
  ON items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Category Refs
ALTER TABLE category_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read category_refs"
  ON category_refs FOR SELECT
  USING (true);

CREATE POLICY "Service role write category_refs"
  ON category_refs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Translations
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read translations"
  ON translations FOR SELECT
  USING (true);

CREATE POLICY "Service role write translations"
  ON translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── 6. Storage Bucket ───────────────────────────────────────
-- Creates the portfolio-media bucket for file uploads.
-- Note: The admin API also auto-creates this bucket on first upload.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('portfolio-media', 'portfolio-media', true, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Public read access for portfolio-media
CREATE POLICY "Public read portfolio-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-media');

-- Service role write access for portfolio-media
CREATE POLICY "Service role write portfolio-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portfolio-media' AND auth.role() = 'service_role');

CREATE POLICY "Service role delete portfolio-media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'portfolio-media' AND auth.role() = 'service_role');
