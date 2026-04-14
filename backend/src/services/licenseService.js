const licenseRepo = require('../repositories/licenseRepository');
const auditRepo = require('../repositories/auditRepository');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const list = async (query) => {
  const { page, limit, from, to } = parsePagination(query);
  const { data, count, error } = await licenseRepo.findAll({
    from, to,
    search: query.search,
    isActive: query.is_active !== undefined ? query.is_active === 'true' : undefined,
  });
  if (error) throw new AppError('Error al obtener licencias', 500);
  return buildPaginatedResponse(data, count, page, limit);
};

const getById = async (id) => {
  const { data, error } = await licenseRepo.findById(id);
  if (error || !data) throw new AppError('Licencia no encontrada', 404);
  return data;
};

const create = async (body, actorId, ip) => {
  const { data, error } = await licenseRepo.create({ ...body, created_by_user_id: actorId || null });
  if (error) throw new AppError('Error al crear licencia', 500);

  await auditRepo.log({
    entity_type: 'license', entity_id: data.id,
    action: 'create', new_values: body,
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

const update = async (id, body, actorId, ip) => {
  const { data: old } = await licenseRepo.findById(id);
  if (!old) throw new AppError('Licencia no encontrada', 404);

  const { data, error } = await licenseRepo.update(id, body);
  if (error) throw new AppError('Error al actualizar licencia', 500);

  await auditRepo.log({
    entity_type: 'license', entity_id: id,
    action: 'update', old_values: old, new_values: body,
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

const assign = async (licenseId, body, actorId, ip) => {
  const { data: license } = await licenseRepo.findById(licenseId);
  if (!license) throw new AppError('Licencia no encontrada', 404);

  if (license.max_seats) {
    const { count } = await licenseRepo.countActiveAssignments(licenseId);
    if (count >= license.max_seats) {
      throw new AppError(`Licencia sin seats disponibles (max: ${license.max_seats})`, 409);
    }
  }

  const { data, error } = await licenseRepo.createAssignment({
    license_id: licenseId,
    asset_id: body.asset_id || null,
    user_id: body.user_id || null,
    notes: body.notes || null,
    created_by: actorId,
  });
  if (error) throw new AppError('Error al asignar licencia', 500);

  await auditRepo.log({
    entity_type: 'license', entity_id: licenseId,
    action: 'assignment', new_values: body,
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

const getAssignments = async (licenseId) => {
  const { data, error } = await licenseRepo.findAssignmentsByLicense(licenseId);
  if (error) throw new AppError('Error al obtener asignaciones', 500);
  return data;
};

const remove = async (id, actorId, ip) => {
  const { data: old } = await licenseRepo.findById(id);
  if (!old) throw new AppError('Licencia no encontrada', 404);

  const { error } = await licenseRepo.remove(id);
  if (error) throw new AppError('Error al eliminar licencia', 500);

  await auditRepo.log({
    entity_type: 'license', entity_id: id,
    action: 'delete', old_values: { name: old.name },
    performed_by: actorId, ip_address: ip,
  });
};

module.exports = { list, getById, create, update, remove, assign, getAssignments };
