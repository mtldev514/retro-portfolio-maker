/**
 * Supabase Client Factory (Singleton)
 *
 * Creates a single shared Supabase client for backend use.
 * Uses the SECRET/SERVICE key — full DB + Storage write access.
 *
 * Environment:
 *   SUPABASE_URL        — project URL (e.g. https://xxx.supabase.co)
 *   SUPABASE_SECRET_KEY — service role secret key
 */

const { createClient } = require('@supabase/supabase-js');

let _client = null;

/**
 * Get (or create) the singleton Supabase client.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseClient() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env'
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}

/** Reset the singleton (for testing) */
function resetClient() {
  _client = null;
}

module.exports = { getSupabaseClient, resetClient };
