const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/userRepository');
const auditRepo = require('../repositories/auditRepository');
const passwordRepo = require('../repositories/passwordRepository');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const supabase     = require('../config/supabase');
const supabaseAnon = require('../config/supabase').anon;

const PASS_LIMIT_PER_MONTH = 2;
const ROW_NOT_FOUND = 'PGRST116';

// Generate temp password: 12 chars, 1 uppercase, 1 special, rest alphanumeric.
const generateTempPassword = () => {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const special = '!@#$%&*';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const all     = lower + digits;
  const pick    = (s) => s[Math.floor(Math.random() * s.length)];
  const chars   = [pick(upper), pick(special), pick(digits)];
  for (let i = 0; i < 9; i++) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(password))          return 'Debe incluir al menos una mayúscula';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password))
    return 'Debe incluir al menos un carácter especial';
  return null;
};

const isMissingRow = (error) => error?.code === ROW_NOT_FOUND;

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

// ─── login ────────────────────────────────────────────────────────────────────
const login = async ({ email, password, ip }) => {
  // 1. Verify credentials via Supabase Auth
  const { data: authData, error: authErr } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (authErr || !authData?.user) throw new AppError('Credenciales inválidas', 401);

  // 2. Fetch profile from public.users
  let { data: profile, error: profileErr } = await userRepo.findById(authData.user.id);

  // Some existing databases have auth.users.id out of sync with public.users.id.
  // If credentials were valid, fall back to the profile with the same email.
  if (!profile && isMissingRow(profileErr)) {
    const byEmail = await userRepo.findByEmail(authData.user.email);
    profile = byEmail.data;
    profileErr = byEmail.error;
  }

  if (profileErr && !isMissingRow(profileErr)) {
    throw new AppError('Error al obtener perfil de usuario', 500);
  }
  if (!profile) throw new AppError('Perfil de usuario no encontrado', 404);
  if (!profile.is_active) throw new AppError('Usuario inactivo', 403);

  // 3. Issue our own JWT (frontend stays unchanged)
  // Resolve role name — the PostgREST join (roles(id,name)) can return null when
  // RLS blocks the read with the anon key.  We fall back to a direct service-role
  // lookup so the token ALWAYS carries a non-empty role string.
  let roleName = profile.roles?.name;
  let roleId   = profile.roles?.id ?? profile.role_id;

  if (!roleName && profile.role_id) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', profile.role_id)
      .single();
    if (roleData) { roleName = roleData.name; roleId = roleData.id; }
  }

  const payload = {
    sub: profile.id,
    email: authData.user.email,
    fullName: profile.full_name,
    role: (roleName ?? 'viewer').toLowerCase(),
    roleId: roleId ?? null,
    mustChangePassword: profile.must_change_password === true ||
      authData.user.app_metadata?.must_change_password === true ||
      authData.user.user_metadata?.must_change_password === true,
  };
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

  await auditRepo.log({
    entity_type: 'user', entity_id: profile.id,
    action: 'login', performed_by: profile.id, ip_address: ip,
  });

  return { token, user: payload };
};

// ─── me ───────────────────────────────────────────────────────────────────────
const me = async (userId) => {
  const { data, error } = await userRepo.findById(userId);
  if (error || !data) throw new AppError('Usuario no encontrado', 404);

  // Ensure role is always returned as an object { id, name }
  // even when the PostgREST join alias is `roles` instead of `role`
  const { roles, ...rest } = data;
  let role = roles ?? null;

  // Fallback: direct lookup if join returned nothing but we have role_id
  if (!role && rest.role_id) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', rest.role_id)
      .single();
    role = roleData ?? null;
  }

  return { ...rest, role };
};

// ─── changePassword ───────────────────────────────────────────────────────────
const changePassword = async ({ userId, currentPassword, newPassword, skipCurrentCheck = false }) => {
  const { data: profile, error: profileErr } = await userRepo.findById(userId);
  if (profileErr || !profile) throw new AppError('Usuario no encontrado', 404);

  // Verify current password (skip only for first-login forced flow)
  if (!skipCurrentCheck) {
    const { error: verifyErr } = await supabaseAnon.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });
    if (verifyErr) throw new AppError('Contraseña actual incorrecta', 400);
  }

  // Rate limit (skip for forced must_change_password flow)
  if (!profile.must_change_password) {
    const { count } = await passwordRepo.countChangesThisMonth(userId);
    if (count >= PASS_LIMIT_PER_MONTH) {
      const { data: existing } = await passwordRepo.findPendingRequest(userId);
      if (!existing) await passwordRepo.createRequest(userId);
      throw new AppError(
        'Límite de cambios de contraseña alcanzado (2 por mes). Se ha enviado una solicitud al administrador.',
        429
      );
    }
  }

  const strengthErr = validatePasswordStrength(newPassword);
  if (strengthErr) throw new AppError(strengthErr, 400);

  // Update password in auth.users via admin API
  const { error: updateAuthErr } = await updateAuthUserForProfile(profile, {
    password: newPassword,
    app_metadata: { must_change_password: false },
    user_metadata: { must_change_password: false },
  });
  if (updateAuthErr) throw new AppError('Error al actualizar contraseña: ' + updateAuthErr.message, 500);

  // Clear must_change_password flag in public.users
  await supabase
    .from('users')
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (!profile.must_change_password) {
    await passwordRepo.logChange(userId);
  }

  return { message: 'Contraseña actualizada' };
};

// ─── forgotPassword ───────────────────────────────────────────────────────────
const forgotPassword = async ({ email }) => {
  const { data: profile } = await userRepo.findByEmail(email);
  if (!profile || !profile.is_active) {
    return { message: 'Si la cuenta existe, se enviará una solicitud a los administradores.' };
  }

  const { data: existing } = await passwordRepo.findPendingRequest(profile.id);
  if (!existing) await passwordRepo.createRequest(profile.id);

  return { message: 'Si la cuenta existe, se enviará una solicitud a los administradores.' };
};

module.exports = { login, me, changePassword, forgotPassword, generateTempPassword, validatePasswordStrength };
