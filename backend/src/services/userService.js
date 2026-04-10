const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/userRepository');
const auditRepo = require('../repositories/auditRepository');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const list = async (query) => {
  const { page, limit, from, to } = parsePagination(query);
  const { data, count, error } = await userRepo.findAll({
    from, to,
    search: query.search,
    roleId: query.role_id,
    isActive: query.is_active !== undefined ? query.is_active === 'true' : undefined,
  });
  if (error) throw new AppError('Error al obtener usuarios', 500);
  return buildPaginatedResponse(data, count, page, limit);
};

const getById = async (id) => {
  const { data, error } = await userRepo.findById(id);
  if (error || !data) throw new AppError('Usuario no encontrado', 404);
  return data;
};

const create = async (body, actorId, ip) => {
  const { data: existing } = await userRepo.findByEmail(body.email);
  if (existing) throw new AppError('Email ya registrado', 409);

  const password_hash = await bcrypt.hash(body.password, 12);
  const { data, error } = await userRepo.create({
    email: body.email,
    full_name: body.full_name,
    role_id: body.role_id,
    password_hash,
  });
  if (error) throw new AppError('Error al crear usuario', 500);

  await auditRepo.log({
    entity_type: 'user', entity_id: data.id,
    action: 'create', new_values: { email: data.email, full_name: data.full_name },
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

const update = async (id, body, actorId, ip) => {
  const { data: old, error: e1 } = await userRepo.findById(id);
  if (e1 || !old) throw new AppError('Usuario no encontrado', 404);

  const updates = {};
  if (body.full_name) updates.full_name = body.full_name;
  if (body.role_id) updates.role_id = body.role_id;
  if (body.password) updates.password_hash = await bcrypt.hash(body.password, 12);

  const { data, error } = await userRepo.update(id, updates);
  if (error) throw new AppError('Error al actualizar usuario', 500);

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

  await auditRepo.log({
    entity_type: 'user', entity_id: id,
    action: isActive ? 'activate' : 'deactivate',
    old_values: { is_active: old.is_active }, new_values: { is_active: isActive },
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

module.exports = { list, getById, create, update, setStatus };
