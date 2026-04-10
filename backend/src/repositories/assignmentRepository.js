const supabase = require('../config/supabase');

const BASE_SELECT = `
  id, assigned_at, released_at, is_active, notes, created_at,
  assets(id, code, name),
  users(id, full_name, email),
  areas(id, name),
  locations(id, name),
  creator:users!assignments_created_by_fkey(id, full_name)
`.trim();

const findActiveByAsset = (assetId) =>
  supabase
    .from('assignments')
    .select(BASE_SELECT)
    .eq('asset_id', assetId)
    .eq('is_active', true)
    .maybeSingle();

const findAllByAsset = (assetId) =>
  supabase
    .from('assignments')
    .select(BASE_SELECT)
    .eq('asset_id', assetId)
    .order('assigned_at', { ascending: false });

const create = (data) =>
  supabase.from('assignments').insert(data).select(BASE_SELECT).single();

const release = (id) =>
  supabase
    .from('assignments')
    .update({ is_active: false, released_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, released_at')
    .single();

module.exports = { findActiveByAsset, findAllByAsset, create, release };
