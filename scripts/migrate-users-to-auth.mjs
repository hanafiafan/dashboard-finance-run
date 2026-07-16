// One-time migration: creates a real Supabase Auth account for every row in the
// old fin_users table (reusing their existing plaintext password as the new
// password — Supabase Auth hashes it properly on write, so nobody has to reset
// anything), then writes the matching profiles row that RLS reads the role from.
//
// Run locally, never on a machine you don't control — it needs the service_role key:
//   SUPABASE_URL=https://yksfwxqpxcsmhqgrrrfa.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/migrate-users-to-auth.mjs
//
// Get the service_role key from Supabase dashboard > Project Settings > API —
// it is NOT the anon key already in src/api/supabaseClient.js. Never commit it
// or put it in a Vite env var (those ship to the browser).
//
// Safe to re-run: existing auth.users emails are detected and reused.
//
// Run 0001_fin_forecast_cashout.sql and 0002_auth_and_rls.sql (the `profiles`
// table part) in the Supabase SQL editor BEFORE running this script.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findExistingAuthUser(email) {
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find(u => u.email === email);
}

async function main() {
  const { data: oldUsers, error } = await admin.from('fin_users').select('*');
  if (error) throw error;
  if (!oldUsers?.length) {
    console.log('fin_users is empty — nothing to migrate.');
    return;
  }

  for (const u of oldUsers) {
    const email = u.email?.trim().toLowerCase();
    if (!email || !u.password_hash) {
      console.warn(`skip: row missing email or password (id=${u.id})`);
      continue;
    }
    console.log(`Migrating ${email}...`);

    let userId;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: u.password_hash,
      email_confirm: true,
    });

    if (createErr) {
      if (!createErr.message?.includes('already been registered')) {
        console.error(`  FAILED to create auth user for ${email}:`, createErr.message);
        continue;
      }
      const existing = await findExistingAuthUser(email);
      if (!existing) {
        console.error(`  FAILED: ${email} already registered but not found via listUsers()`);
        continue;
      }
      userId = existing.id;
      console.log(`  already exists in auth.users, reusing id ${userId}`);
    } else {
      userId = created.user.id;
    }

    const { error: profileErr } = await admin.from('profiles').upsert({
      id: userId,
      email,
      name: u.name,
      role: u.role,
      company_scope: u.company_scope,
      brand_scope: u.brand_scope,
      active: u.active !== false,
    });
    if (profileErr) console.error(`  profile upsert FAILED for ${email}:`, profileErr.message);
    else console.log(`  done: ${email} (${u.role})`);
  }

  console.log('\nDone. Existing email/password combos keep working, now via Supabase Auth.');
  console.log('Once you have confirmed logins work, drop the old table: drop table fin_users;');
}

main();
