const supabase = require('../config/supabase');

const BASE_SELECT = `
  id, entity_type, entity_id, action, performed_by,
  old_values, new_values, ip_address, notes, performed_at,
  performed_by_user:users!audit_events_performed_by_fkey(id, full_name, email)
`.trim();

const log = (data) =>
  supabase.from('audit_events').insert(data).select('id').single();

const findAll = ({ from, to, entityType, entityId, action, userId, dateFrom, dateTo }) => {
  let q = supabase
    .from('audit_events')
    .select(BASE_SELECT, { count: 'exact' })
    .range(from, to)
    .order('performed_at', { ascending: false });

  if (entityType) q = q.eq('entity_type', entityType);
  if (entityId) q = q.eq('entity_id', entityId);
  if (action) q = q.eq('action', action);
  if (userId) q = q.eq('performed_by', userId);
  if (dateFrom) q = q.gte('performed_at', dateFrom);
  if (dateTo) q = q.lte('performed_at', dateTo);

  return q;
};

const findById = (id) =>
  supabase.from('audit_events').select(BASE_SELECT).eq('id', id).single();

module.exports = { log, findAll, findById };
