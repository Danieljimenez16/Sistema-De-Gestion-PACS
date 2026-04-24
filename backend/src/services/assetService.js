const assetRepo = require('../repositories/assetRepository');
const assignmentRepo = require('../repositories/assignmentRepository');
const auditRepo = require('../repositories/auditRepository');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const list = async (query) => {
  const { page, limit, from, to } = parsePagination(query);
  const { data, count, error } = await assetRepo.findAll({
    from, to,
    search: query.search,
    typeId: query.type_id,
    statusId: query.status_id,
    areaId: query.area_id,
    locationId: query.location_id,
  });
  if (error) throw new AppError('Error al obtener activos', 500);
  return buildPaginatedResponse(data, count, page, limit);
};

const getById = async (id) => {
  const { data, error } = await assetRepo.findById(id);
  if (error || !data) throw new AppError('Activo no encontrado', 404);
  return data;
};

const create = async (body, actorId, ip) => {
  const existing = await assetRepo.findByCode(body.code);
  if (existing.data) throw new AppError(`Código ${body.code} ya existe`, 409);
  if (body.serial) {
    const bySerial = await assetRepo.findBySerial(body.serial);
    if (bySerial.data) throw new AppError(`Serial ${body.serial} ya existe`, 409);
  }

  const { data, error } = await assetRepo.create(body);
  if (error) throw new AppError('Error al crear activo: ' + error.message, 500);

  await auditRepo.log({
    entity_type: 'asset', entity_id: data.id,
    action: 'create', new_values: body,
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

const update = async (id, body, actorId, ip) => {
  const { data: old, error: e1 } = await assetRepo.findById(id);
  if (e1 || !old) throw new AppError('Activo no encontrado', 404);

  if (body.code && body.code !== old.code) {
    const existing = await assetRepo.findByCode(body.code);
    if (existing.data) throw new AppError(`Código ${body.code} ya existe`, 409);
  }
  if (body.serial && body.serial !== old.serial) {
    const existing = await assetRepo.findBySerial(body.serial);
    if (existing.data) throw new AppError(`Serial ${body.serial} ya existe`, 409);
  }

  const allowed = [
  'name', 'code', 'serial', 'description', 'model',
  'asset_type_id', 'brand_id', 'status_id', 'area_id',
  'location_id', 'responsible_user_id',
  'purchase_date', 'warranty_expiry', 'notes',
];
const cleanBody = Object.fromEntries(
  Object.entries(body).filter(([k]) => allowed.includes(k))
);
const { data, error } = await assetRepo.update(id, cleanBody);
if (error) throw new AppError('Error al actualizar activo: ' + error.message, 500);

// If status changed via update, record in status history
if (cleanBody.status_id && cleanBody.status_id !== old.status_id) {
  await assetRepo.insertStatusHistory({
    asset_id: id,
    previous_status_id: old.status_id || null,
    new_status_id: cleanBody.status_id,
    changed_by: actorId,
    reason: 'Cambio desde edición de activo',
  });
}

if (cleanBody.responsible_user_id && cleanBody.responsible_user_id !== old.responsible_user_id) {
  const { data: active } = await assignmentRepo.findActiveByAsset(id);
  if (active) await assignmentRepo.release(active.id);
  await assignmentRepo.create({
    asset_id: id,
    user_id: cleanBody.responsible_user_id,
    area_id: cleanBody.area_id || old.area_id || null,
    location_id: cleanBody.location_id || old.location_id || null,
    created_by: actorId,
  });
}

  await auditRepo.log({
    entity_type: 'asset', entity_id: id,
    action: 'update', old_values: old, new_values: body,
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

const changeStatus = async (id, statusId, reason, actorId, ip) => {
  const { data: asset, error: e1 } = await assetRepo.findById(id);
  if (e1 || !asset) throw new AppError('Activo no encontrado', 404);

  const { data, error } = await assetRepo.update(id, { status_id: statusId });
  if (error) throw new AppError('Error al cambiar estado', 500);

  await assetRepo.insertStatusHistory({
    asset_id: id,
    previous_status_id: asset.status?.id || null,
    new_status_id: statusId,
    changed_by: actorId,
    reason,
  });

  await auditRepo.log({
    entity_type: 'asset', entity_id: id,
    action: 'status_change',
    old_values: { status_id: asset.status?.id },
    new_values: { status_id: statusId, reason },
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

const assign = async (id, body, actorId, ip) => {
  const { data: asset, error: e1 } = await assetRepo.findById(id);
  if (e1 || !asset) throw new AppError('Activo no encontrado', 404);

  // Release current active assignment
  const { data: active } = await assignmentRepo.findActiveByAsset(id);
  if (active) await assignmentRepo.release(active.id);

  const { data, error } = await assignmentRepo.create({
    asset_id: id,
    user_id: body.user_id || null,
    area_id: body.area_id || null,
    location_id: body.location_id || null,
    notes: body.notes || null,
    created_by: actorId,
  });
  if (error) throw new AppError('Error al asignar activo', 500);

  // Mirror on assets table
  await assetRepo.update(id, {
    responsible_user_id: body.user_id || null,
    area_id: body.area_id || null,
    location_id: body.location_id || null,
  });

  await auditRepo.log({
    entity_type: 'asset', entity_id: id,
    action: 'assignment', new_values: body,
    performed_by: actorId, ip_address: ip,
  });

  return data;
};

const getStatusHistory = async (id) => {
  const { data, error } = await assetRepo.getStatusHistory(id);
  if (error) throw new AppError('Error al obtener historial', 500);
  return data;
};

const getHistory = async (id) => {
  const [statusRes, assignRes] = await Promise.all([
    assetRepo.getStatusHistory(id),
    assignmentRepo.findAllByAsset(id),
  ]);
  if (statusRes.error) throw new AppError('Error al obtener historial de estado', 500);
  if (assignRes.error) throw new AppError('Error al obtener historial de asignaciones', 500);
  return {
    status_history: statusRes.data ?? [],
    assignments: assignRes.data ?? [],
  };
};

const nextCode = async () => {
  const { data, error } = await assetRepo.nextCode();
  if (error) throw new AppError('Error al generar código', 500);
  return { next_code: data };
};

const remove = async (id, actorId, ip) => {
  const { data: asset, error: e1 } = await assetRepo.findById(id);
  if (e1 || !asset) throw new AppError('Activo no encontrado', 404);

  const { error } = await assetRepo.softDelete(id);
  if (error) throw new AppError('Error al eliminar activo', 500);

  await auditRepo.log({
    entity_type: 'asset', entity_id: id,
    action: 'delete', old_values: { code: asset.code, name: asset.name },
    performed_by: actorId, ip_address: ip,
  });
};

module.exports = { list, getById, create, update, changeStatus, assign, getStatusHistory, getHistory, nextCode, remove };
