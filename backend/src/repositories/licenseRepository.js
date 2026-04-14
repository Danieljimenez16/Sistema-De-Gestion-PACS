const supabase = require('../config/supabase');

const BASE_SELECT = `
  id, name, vendor, license_key, license_type,
  max_seats, purchase_date, expiry_date, cost,
  notes, is_active, created_at, updated_at,
  created_by_user_id,
  created_by_user:users!licenses_created_by_user_id_fkey(id, full_name, email)
`.trim();

const ASSIGN_SELECT = `
  id, assigned_at, released_at, is_active, notes,
  licenses(id, name),
  assets(id, code, name),
  users(id, full_name, email),
  creator:users!license_assignments_created_by_fkey(id, full_name)
`.trim();

const findAll = ({ from, to, search, isActive }) => {
  let q = supabase
    .from('licenses')
    .select(BASE_SELECT, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (search) q = q.ilike('name', `%${search}%`);
  if (isActive !== undefined) q = q.eq('is_active', isActive);

  return q;
};

const findById = (id) =>
  supabase.from('licenses').select(BASE_SELECT).eq('id', id).single();

const create = (data) =>
  supabase.from('licenses').insert(data).select(BASE_SELECT).single();

const update = (id, data) =>
  supabase
    .from('licenses')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(BASE_SELECT)
    .single();

const countActiveAssignments = (licenseId) =>
  supabase
    .from('license_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('license_id', licenseId)
    .eq('is_active', true);

const createAssignment = (data) =>
  supabase.from('license_assignments').insert(data).select(ASSIGN_SELECT).single();

const findAssignmentsByLicense = (licenseId) =>
  supabase
    .from('license_assignments')
    .select(ASSIGN_SELECT)
    .eq('license_id', licenseId)
    .order('assigned_at', { ascending: false });

const remove = (id) =>
  supabase.from('licenses').delete().eq('id', id);

module.exports = {
  findAll, findById, create, update, remove,
  countActiveAssignments, createAssignment, findAssignmentsByLicense,
};
