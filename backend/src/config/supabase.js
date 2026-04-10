const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const missingEnvVars = [];

if (!env.supabaseUrl) {
  missingEnvVars.push('SUPABASE_URL');
}

if (!env.supabaseServiceRoleKey) {
  missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY');
}

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variable${missingEnvVars.length > 1 ? 's' : ''}: ${missingEnvVars.join(
      ', '
    )}. Create backend/.env and set the missing values.`
  );
}

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabase;
