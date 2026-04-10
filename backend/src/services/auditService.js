const auditRepo = require('../repositories/auditRepository');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const list = async (query) => {
  const { page, limit, from, to } = parsePagination(query);
  const { data, count, error } = await auditRepo.findAll({
    from, to,
    entityType: query.entity_type,
    entityId: query.entity_id,
    action: query.action,
    userId: query.user_id,
  });
  if (error) throw new AppError('Error al obtener auditoría', 500);
  return buildPaginatedResponse(data, count, page, limit);
};

const getById = async (id) => {
  const { data, error } = await auditRepo.findById(id);
  if (error || !data) throw new AppError('Evento no encontrado', 404);
  return data;
};

module.exports = { list, getById };
