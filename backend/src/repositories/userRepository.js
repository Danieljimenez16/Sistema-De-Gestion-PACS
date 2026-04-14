const supabase = require('../config/supabase');

const TABLE = 'users';
const SELECT_WITH_PASSWORD_FLAG = 'id, email, full_name, is_active, must_change_password, created_at, roles(id, name)';
const SELECT_WITH_PASSWORD_FLAG_DETAIL = 'id, email, full_name, is_active, must_change_password, created_at, updated_at, roles(id, name)';
const SELECT_BASE = 'id, email, full_name, is_active, created_at, roles(id, name)';
const SELECT_BASE_DETAIL = 'id, email, full_name, is_active, created_at, updated_at, roles(id, name)';
const LEGACY_PASSWORD_HASH_PLACEHOLDER = 'managed_by_supabase_auth';

const missingMustChangePassword = (error) =>
  (error?.code === '42703' || error?.code === 'PGRST204') &&
  error?.message?.includes('must_change_password');

const missingRequiredPasswordHash = (error) =>
  error?.code === '23502' && error?.message?.includes('password_hash');

const withDefaultPasswordFlag = (data) => {
  if (Array.isArray(data)) {
    return data.map((item) => ({ ...item, must_change_password: false }));
  }
  return data ? { ...data, must_change_password: false } : data;
};

const retryWithoutPasswordFlag = async (result, fallbackQuery) => {
  if (!missingMustChangePassword(result.error)) return result;

  const fallback = await fallbackQuery();
  return {
    ...fallback,
    data: withDefaultPasswordFlag(fallback.data),
  };
};

const findAll = async ({ from, to, search, roleId, isActive }) => {
  let query = supabase
    .from(TABLE)
    .select(SELECT_WITH_PASSWORD_FLAG, { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (search)    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (roleId)    query = query.eq('role_id', roleId);
  if (isActive !== undefined) query = query.eq('is_active', isActive);

  const result = await query;
  return retryWithoutPasswordFlag(result, () => {
    let fallback = supabase
      .from(TABLE)
      .select(SELECT_BASE, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search)    fallback = fallback.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    if (roleId)    fallback = fallback.eq('role_id', roleId);
    if (isActive !== undefined) fallback = fallback.eq('is_active', isActive);

    return fallback;
  });
};

const findById = async (id) => {
  const result = await supabase
    .from(TABLE)
    .select(SELECT_WITH_PASSWORD_FLAG_DETAIL)
    .eq('id', id)
    .single();
  return retryWithoutPasswordFlag(result, () =>
    supabase
      .from(TABLE)
      .select(SELECT_BASE_DETAIL)
      .eq('id', id)
      .single()
  );
};

const findByEmail = async (email) => {
  const result = await supabase
    .from(TABLE)
    .select('id, email, full_name, is_active, must_change_password, roles(id, name)')
    .eq('email', email)
    .single();
  return retryWithoutPasswordFlag(result, () =>
    supabase
      .from(TABLE)
      .select('id, email, full_name, is_active, roles(id, name)')
      .eq('email', email)
      .single()
  );
};

const create = async (data) => {
  const insertProfile = (payload, select) =>
    supabase
      .from(TABLE)
      .insert(payload)
      .select(select)
      .single();

  const withLegacyPasswordHash = (payload) => ({
    ...payload,
    password_hash: LEGACY_PASSWORD_HASH_PLACEHOLDER,
  });

  const result = await supabase
    .from(TABLE)
    .insert(data)
    .select('id, email, full_name, is_active, must_change_password, created_at')
    .single();
  if (!missingMustChangePassword(result.error)) {
    if (!missingRequiredPasswordHash(result.error)) return result;

    return insertProfile(
      withLegacyPasswordHash(data),
      'id, email, full_name, is_active, must_change_password, created_at'
    );
  }

  const { must_change_password, ...fallbackData } = data;
  let fallback = await insertProfile(
    fallbackData,
    'id, email, full_name, is_active, created_at'
  );

  if (missingRequiredPasswordHash(fallback.error)) {
    fallback = await insertProfile(
      withLegacyPasswordHash(fallbackData),
      'id, email, full_name, is_active, created_at'
    );
  }

  return { ...fallback, data: withDefaultPasswordFlag(fallback.data) };
};

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
