/**
 * One-time migration: creates auth.users entries for every existing public.users row.
 *
 * Run BEFORE applying migration 002_use_supabase_auth.sql.
 *
 * Usage:
 *   node backend/scripts/migrate-users-to-auth.js
 *
 * Each user gets a generated temp password and must_change_password = true.
 * Their email with the temp password will be printed (no email sent here —
 * email system might not be configured yet at migration time).
 */

require('../src/config/env'); // load .env
const { createClient } = require('@supabase/supabase-js');
const env = require('../src/config/env');

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

async function run() {
  console.log('Fetching existing public.users...');
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name');

  if (error) { console.error('Failed to fetch users:', error.message); process.exit(1); }
  console.log(`Found ${users.length} users to migrate.\n`);

  const results = [];

  for (const user of users) {
    process.stdout.write(`  Migrating ${user.email}...`);

    // Check if already exists in auth.users
    const { data: existing } = await supabase.auth.admin.getUserById(user.id);
    if (existing?.user) {
      console.log(' already in auth.users, skipping.');
      continue;
    }

    const tempPassword = generateTempPassword();

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      id: user.id, // keep same UUID
      email: user.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authErr) {
      console.log(` FAILED: ${authErr.message}`);
      results.push({ email: user.email, status: 'error', reason: authErr.message });
      continue;
    }

    // Set must_change_password = true
    await supabase
      .from('users')
      .update({ must_change_password: true, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    console.log(' OK');
    results.push({ email: user.email, tempPassword, status: 'created' });
  }

  console.log('\n─── Migration results ───────────────────────────────────');
  results.forEach(r => {
    if (r.status === 'created') {
      console.log(`  ${r.email}  →  temp password: ${r.tempPassword}`);
    } else {
      console.log(`  ${r.email}  →  ERROR: ${r.reason}`);
    }
  });
  console.log('\nShare temp passwords with each user securely.');
  console.log('Now you can run migration 002_use_supabase_auth.sql in Supabase SQL editor.');
}

run().catch(e => { console.error(e); process.exit(1); });
