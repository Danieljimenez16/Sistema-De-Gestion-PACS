const supabase = require('../config/supabase');

const TABLE = 'users';

const findAll = async ({ from, to, search, roleId, isActive }) => {
  let query = supabase
    .from(TABLE)
    .select('id, email, full_name, is_active, created_at, roles(id, name)', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (search) query = query.ilike('full_name', `%${search}%`);
  if (roleId) query = query.eq('role_id', roleId);
  if (isActive !== undefined) query = query.eq('is_active', isActive);

  return query;
};

const findById = (id) =>
  supabase
    .from(TABLE)
    .select('id, email, full_name, is_active, created_at, updated_at, roles(id, name)')
    .eq('id', id)
    .single();

const findByEmail = (email) =>
  supabase
    .from(TABLE)
    .select('id, email, full_name, password_hash, is_active, roles(id, name)')
    .eq('email', email)
    .single();

const create = (data) =>
  supabase.from(TABLE).insert(data).select('id, email, full_name, is_active, created_at').single();

const update = (id, data) =>
  supabase
    .from(TABLE)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, email, full_name, is_active, updated_at')
    .single();

const setStatus = (id, isActive) =>
  supabase
    .from(TABLE)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, is_active')
    .single();

module.exports = { findAll, findById, findByEmail, create, update, setStatus };
