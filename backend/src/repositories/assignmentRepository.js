const supabase = require('../config/supabase');

const BASE_SELECT = `
  id, assigned_at, released_at, is_active, notes, created_at,
  asset:assets!assignments_asset_id_fkey(id, code, name),
  user:users!assignments_user_id_fkey(id, full_name, email),
  area:areas!assignments_area_id_fkey(id, name),
  location:locations!assignments_location_id_fkey(id, name),
  created_by_user:users!assignments_created_by_fkey(id, full_name)
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
