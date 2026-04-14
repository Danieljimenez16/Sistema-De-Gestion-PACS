const userRepo = require('../repositories/userRepository');
const auditRepo = require('../repositories/auditRepository');
const passwordRepo = require('../repositories/passwordRepository');
const { generateTempPassword } = require('./authService');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const supabase = require('../config/supabase');

const mapUser = (u) => {
  if (!u) return null;
  const { roles, ...rest } = u;
  return { ...rest, role: roles };
};

const findAuthUserByEmail = async (email) => {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  return (data.users ?? []).find(user => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
};

const updateAuthUserForProfile = async (profile, updates) => {
  const byProfileId = await supabase.auth.admin.updateUserById(profile.id, updates);
  if (!byProfileId.error) return byProfileId;

  const authUser = await findAuthUserByEmail(profile.email);
  if (!authUser || authUser.id === profile.id) return byProfileId;
  return supabase.auth.admin.updateUserById(authUser.id, updates);
};

const list = async (query) => {
  const { page, limit, from, to } = parsePagination(query);
  const { data, count, error } = await userRepo.findAll({
    from, to,
    search: query.search,
    roleId: query.role_id,
    isActive: query.is_active !== undefined ? query.is_active === 'true' : undefined,
  });
  if (error) throw new AppError('Error al obtener usuarios', 500);
  return buildPaginatedResponse((data ?? []).map(mapUser), count, page, limit);
};

const getById = async (id) => {
  const { data, error } = await userRepo.findById(id);
  if (error || !data) throw new AppError('Usuario no encontrado', 404);
  return mapUser(data);
};

const create = async (body, actorId, ip) => {
  const tempPassword = generateTempPassword();

  // 1. Create in auth.users (Supabase Auth)
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: body.email,
    password: tempPassword,
    email_confirm: true,
    app_metadata: { must_change_password: true },
  });
  if (authErr) {
    if (authErr.message?.toLowerCase().includes('already registered') ||
        authErr.message?.toLowerCase().includes('already exists') ||
        authErr.status === 422) {
      throw new AppError('Email ya registrado', 409);
    }
    throw new AppError('Error al crear usuario en autenticación: ' + authErr.message, 500);
  }

  // 2. Insert profile in public.users with same id as auth.users
  const { data, error: profileErr } = await userRepo.create({
    id: authData.user.id,
    email: body.email,
    full_name: body.full_name,
    role_id: body.role_id,
    must_change_password: true,
  });
  if (profileErr) {
    // Rollback: remove from auth.users
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
    throw new AppError('Error al crear perfil de usuario', 500);
  }

  await auditRepo.log({
    entity_type: 'user', entity_id: data.id,
    action: 'create', new_values: { email: data.email, full_name: data.full_name },
    performed_by: actorId, ip_address: ip,
  });

  return { ...mapUser(data), temp_password: tempPassword };
};

const update = async (id, body, actorId, ip) => {
  const { data: old, error: e1 } = await userRepo.findById(id);
  if (e1 || !old) throw new AppError('Usuario no encontrado', 404);

  const updates = {};
  if (body.full_name) updates.full_name = body.full_name;
  if (body.role_id)   updates.role_id   = body.role_id;

  const { data, error } = await userRepo.update(id, updates);
  if (error) throw new AppError('Error al actualizar usuario', 500);

  // Sync email change to auth.users if provided
  if (body.email && body.email !== old.email) {
    await supabase.auth.admin.updateUserById(id, { email: body.email }).catch(() => {});
  }

  await auditRepo.log({
    entity_type: 'user', entity_id: id,
    action: 'update', old_values: old, new_values: updates,
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

const setStatus = async (id, isActive, actorId, ip) => {
  const { data: old } = await userRepo.findById(id);
  if (!old) throw new AppError('Usuario no encontrado', 404);

  const { data, error } = await userRepo.setStatus(id, isActive);
  if (error) throw new AppError('Error al actualizar estado', 500);

  // Sync with auth.users ban flag
  await supabase.auth.admin.updateUserById(id, {
    ban_duration: isActive ? 'none' : '876600h', // 100 years ≈ permanent ban
  }).catch(() => {});

  await auditRepo.log({
    entity_type: 'user', entity_id: id,
    action: isActive ? 'activate' : 'deactivate',
    old_values: { is_active: old.is_active }, new_values: { is_active: isActive },
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

// ─── Admin: reset password (resolves pending request) ────────────────────────
const resetPassword = async (targetId, actorId, ip) => {
  const { data: user } = await userRepo.findById(targetId);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  const tempPassword = generateTempPassword();

  const { error: authErr } = await updateAuthUserForProfile(user, {
    password: tempPassword,
    app_metadata: { must_change_password: true },
  });
  if (authErr) throw new AppError('Error al restablecer contraseña: ' + authErr.message, 500);

  await supabase
    .from('users')
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq('id', targetId);

  await passwordRepo.resolveRequest(targetId, actorId);

  await auditRepo.log({
    entity_type: 'user', entity_id: targetId,
    action: 'reset_password',
    new_values: { must_change_password: true },
    performed_by: actorId, ip_address: ip,
  });

  return { message: 'Contraseña restablecida', temp_password: tempPassword };
};

const getPendingPasswordRequests = async () => {
  const { data, error } = await passwordRepo.findAllPending();
  if (error) throw new AppError('Error al obtener solicitudes', 500);
  return data ?? [];
};

module.exports = { list, getById, create, update, setStatus, resetPassword, getPendingPasswordRequests };
