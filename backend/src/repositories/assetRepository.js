const supabase = require('../config/supabase');

const BASE_SELECT = `
  id, code, serial, name, description, model,
  purchase_date, warranty_expiry, notes, is_deleted,
  created_at, updated_at,
  asset_type:asset_types(id, name),
  brand:brands(id, name),
  status:asset_statuses(id, name),
  location:locations(id, name),
  area:areas(id, name),
  responsible_user:users!assets_responsible_user_id_fkey(id, full_name, email)
`.trim();

const findAll = async ({ from, to, search, typeId, statusId, areaId, locationId }) => {
  let q = supabase
    .from('assets')
    .select(BASE_SELECT, { count: 'exact' })
    .eq('is_deleted', false)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (search) q = q.or(`name.ilike.%${search}%,code.ilike.%${search}%,serial.ilike.%${search}%`);
  if (typeId) q = q.eq('asset_type_id', typeId);
  if (statusId) q = q.eq('status_id', statusId);
  if (areaId) q = q.eq('area_id', areaId);
  if (locationId) q = q.eq('location_id', locationId);

  return q;
};

const findById = (id) =>
  supabase.from('assets').select(BASE_SELECT).eq('id', id).eq('is_deleted', false).single();

const findByCode = (code) =>
  supabase.from('assets').select('id').eq('code', code).eq('is_deleted', false).maybeSingle();

const findBySerial = (serial) =>
  supabase.from('assets').select('id').eq('serial', serial).eq('is_deleted', false).maybeSingle();

const create = (data) =>
  supabase.from('assets').insert(data).select(BASE_SELECT).single();

const update = (id, data) =>
  supabase
    .from('assets')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(BASE_SELECT)
    .single();

const softDelete = (id) =>
  supabase
    .from('assets')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .single();

const getStatusHistory = (assetId) =>
  supabase
    .from('status_history')
    .select('*, previous:asset_statuses!status_history_previous_status_id_fkey(id,name), new_status:asset_statuses!status_history_new_status_id_fkey(id,name), changer:users!status_history_changed_by_fkey(id,full_name)')
    .eq('asset_id', assetId)
    .order('changed_at', { ascending: false });

const insertStatusHistory = (data) =>
  supabase.from('status_history').insert(data).select().single();

const nextCode = async () => {
  const { data, error } = await supabase.rpc('next_asset_code');
  if (error) return { data: 'ELEM-001', error: null };
  return { data, error: null };
};

module.exports = {
  findAll, findById, findByCode, findBySerial,
  create, update, softDelete,
  getStatusHistory, insertStatusHistory, nextCode,
};
