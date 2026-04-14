const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const missing = [];
if (!env.supabaseUrl)            missing.push('SUPABASE_URL');
if (!env.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

if (missing.length > 0) {
  throw new Error(
    `Missing required env var${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Check backend/.env`
  );
}

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const assertServiceRoleKey = () => {
  const serviceKey = env.supabaseServiceRoleKey;
  const anonKey = env.supabaseAnonKey;
  const jwtPayload = serviceKey.startsWith('eyJ') ? decodeJwtPayload(serviceKey) : null;
  const isSecretKey = serviceKey.startsWith('sb_secret_');
  const isServiceRoleJwt = jwtPayload?.role === 'service_role';

  if (anonKey && serviceKey === anonKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY must be the service_role secret, not the same value as SUPABASE_ANON_KEY. Check backend/.env'
    );
  }

  if (serviceKey.startsWith('sb_publishable_') || (!isSecretKey && !isServiceRoleJwt)) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY must be a Supabase service_role key (sb_secret_... or a JWT with role "service_role"). Check backend/.env'
    );
  }
};

assertServiceRoleKey();

// Service-role client — used for DB queries (bypasses RLS) AND auth.admin.* operations.
// Requires the real service_role key (sb_secret_... or JWT starting with eyJ...).
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client — used ONLY for auth.signInWithPassword() to validate user credentials.
// Falls back to service-role client if no anon key is set (works in most Supabase configs).
const anonKey = env.supabaseAnonKey || env.supabaseServiceRoleKey;
const supabaseAnon = createClient(env.supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabase;
module.exports.anon = supabaseAnon;
