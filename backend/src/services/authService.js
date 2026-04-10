const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/userRepository');
const auditRepo = require('../repositories/auditRepository');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const login = async ({ email, password, ip }) => {
  const { data: user, error } = await userRepo.findByEmail(email);
  if (error || !user) throw new AppError('Credenciales inválidas', 401);
  if (!user.is_active) throw new AppError('Usuario inactivo', 403);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('Credenciales inválidas', 401);

  const payload = {
    sub: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.roles?.name,
    roleId: user.roles?.id,
  };

  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

  await auditRepo.log({
    entity_type: 'user',
    entity_id: user.id,
    action: 'login',
    performed_by: user.id,
    ip_address: ip,
  });

  return { token, user: payload };
};

const me = async (userId) => {
  const { data, error } = await userRepo.findById(userId);
  if (error || !data) throw new AppError('Usuario no encontrado', 404);
  return data;
};

module.exports = { login, me };
