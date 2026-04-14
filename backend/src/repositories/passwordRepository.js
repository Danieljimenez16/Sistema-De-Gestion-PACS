const supabase = require('../config/supabase');

const REQUEST_SELECT = `
  id, user_id, status, requested_at, resolved_at, resolved_by,
  user:users!password_change_requests_user_id_fkey(id, full_name, email)
`.trim();
const REQUEST_ACTION = 'password_reset_requested';
const RESET_ACTION = 'reset_password';

const isMissingTable = (error) =>
  error?.code === 'PGRST205' || error?.code === '42P01';

const asSuccess = (data = null, extra = {}) => ({ data, error: null, ...extra });

const findAuditPendingRequests = async () => {
  const { data: requests, error } = await supabase
    .from('audit_events')
    .select('id, entity_id, performed_at, new_values')
    .eq('entity_type', 'user')
    .eq('action', REQUEST_ACTION)
    .order('performed_at', { ascending: false });

  if (error) return { data: null, error };
  if (!requests?.length) return asSuccess([]);

  const userIds = [...new Set(requests.map(r => r.entity_id).filter(Boolean))];
  if (!userIds.length) return asSuccess([]);

  const { data: resets } = await supabase
    .from('audit_events')
    .select('entity_id, performed_at')
    .eq('entity_type', 'user')
    .eq('action', RESET_ACTION)
    .in('entity_id', userIds);

  const latestResetByUser = new Map();
  for (const reset of resets ?? []) {
    const current = latestResetByUser.get(reset.entity_id);
    if (!current || new Date(reset.performed_at) > new Date(current)) {
      latestResetByUser.set(reset.entity_id, reset.performed_at);
    }
  }

  const pending = [];
  const seenUsers = new Set();
  for (const request of requests) {
    if (seenUsers.has(request.entity_id)) continue;
    seenUsers.add(request.entity_id);

    const latestReset = latestResetByUser.get(request.entity_id);
    if (!latestReset || new Date(request.performed_at) > new Date(latestReset)) {
      pending.push(request);
    }
  }

  if (!pending.length) return asSuccess([]);

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('id', pending.map(r => r.entity_id));
  const usersById = new Map((users ?? []).map(user => [user.id, user]));

  return asSuccess(pending.map(request => ({
    id: request.id,
    user_id: request.entity_id,
    status: 'pending',
    requested_at: request.performed_at,
    resolved_at: null,
    resolved_by: null,
    user: usersById.get(request.entity_id) ?? null,
  })));
};

const findAuditPendingRequest = async (userId) => {
  const { data, error } = await findAuditPendingRequests();
  if (error) return { data: null, error };
  return asSuccess((data ?? []).find(request => request.user_id === userId) ?? null);
};

const createAuditRequest = async (userId) =>
  supabase
    .from('audit_events')
    .insert({
      entity_type: 'user',
      entity_id: userId,
      action: REQUEST_ACTION,
      new_values: { requested_from: 'forgot_password' },
      notes: 'Solicitud de restablecimiento de contraseña para revisión de administrador',
    })
    .select('id')
    .single();

// ─── Password change log (rate limiting) ─────────────────────────────────────

const countChangesThisMonth = async (userId) => {
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('password_change_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('changed_at', start.toISOString());

  if (isMissingTable(error)) return { count: 0, error: null };
  return { count: count ?? 0, error };
};

const logChange = async (userId) => {
  const result = await supabase.from('password_change_log').insert({ user_id: userId }).select('id').single();
  return isMissingTable(result.error) ? asSuccess() : result;
};

// ─── Password change requests (admin workflow) ────────────────────────────────

const findPendingRequest = async (userId) => {
  const result = await supabase
    .from('password_change_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();
  return isMissingTable(result.error) ? findAuditPendingRequest(userId) : result;
};

const createRequest = async (userId) => {
  const result = await supabase
    .from('password_change_requests')
    .insert({ user_id: userId })
    .select('id')
    .single();
  return isMissingTable(result.error) ? createAuditRequest(userId) : result;
};

const findAllPending = async () => {
  const result = await supabase
    .from('password_change_requests')
    .select(REQUEST_SELECT)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });
  return isMissingTable(result.error) ? findAuditPendingRequests() : result;
};

const resolveRequest = async (userId, resolvedBy) => {
  const result = await supabase
    .from('password_change_requests')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
    .eq('user_id', userId)
    .eq('status', 'pending');
  return isMissingTable(result.error) ? asSuccess() : result;
};

module.exports = {
  countChangesThisMonth, logChange,
  findPendingRequest, createRequest, findAllPending, resolveRequest,
};
