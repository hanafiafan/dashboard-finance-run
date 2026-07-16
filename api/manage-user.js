// Privileged user management — creating a Supabase Auth user, resetting a
// password, or deleting a user all require the service_role key, which must
// never reach the browser. This function holds that key server-side and
// re-checks the caller's own role from `profiles` before doing anything, so
// a non-admin can't just call this endpoint directly with someone else's token.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset di Vercel Environment Variables.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ ok: false, error: 'Tidak ada sesi login.' });

  const { data: callerAuth, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !callerAuth?.user) return res.status(401).json({ ok: false, error: 'Sesi login tidak valid.' });

  const { data: callerProfile } = await admin.from('profiles').select('role, active').eq('id', callerAuth.user.id).single();
  if (!callerProfile?.active || !['superadmin', 'finance'].includes(callerProfile.role)) {
    return res.status(403).json({ ok: false, error: 'Tidak punya izin mengelola user.' });
  }

  const body = req.body || {};
  const action = body.action;

  try {
    if (action === 'create') {
      const email = String(body.email || '').trim().toLowerCase();
      const role = String(body.role || '').trim();
      if (!email || !body.password || !role) return res.status(400).json({ ok: false, error: 'Email, password, dan role wajib diisi.' });
      if (role === 'superadmin' && callerProfile.role !== 'superadmin') {
        return res.status(403).json({ ok: false, error: 'Hanya superadmin yang bisa membuat akun superadmin.' });
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password: body.password, email_confirm: true });
      if (createErr) return res.status(400).json({ ok: false, error: createErr.message });

      const { error: profileErr } = await admin.from('profiles').insert({
        id: created.user.id, email, name: body.name || '', role,
        company_scope: body.company_scope || null, brand_scope: body.brand_scope || null, active: true,
      });
      if (profileErr) { await admin.auth.admin.deleteUser(created.user.id); return res.status(400).json({ ok: false, error: profileErr.message }); }
      return res.status(200).json({ ok: true });
    }

    if (action === 'reset-password') {
      const targetEmail = String(body.targetEmail || '').trim().toLowerCase();
      if (!targetEmail || !body.password) return res.status(400).json({ ok: false, error: 'Target email dan password baru wajib diisi.' });
      const { data: list, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) return res.status(500).json({ ok: false, error: listErr.message });
      const target = list.users.find(u => u.email === targetEmail);
      if (!target) return res.status(404).json({ ok: false, error: 'User tidak ditemukan.' });
      const { error: updateErr } = await admin.auth.admin.updateUserById(target.id, { password: body.password });
      if (updateErr) return res.status(400).json({ ok: false, error: updateErr.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      const targetEmail = String(body.targetEmail || '').trim().toLowerCase();
      if (!targetEmail) return res.status(400).json({ ok: false, error: 'Target email wajib diisi.' });
      const { data: list, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) return res.status(500).json({ ok: false, error: listErr.message });
      const target = list.users.find(u => u.email === targetEmail);
      if (!target) return res.status(404).json({ ok: false, error: 'User tidak ditemukan.' });
      const { error: deleteErr } = await admin.auth.admin.deleteUser(target.id);
      if (deleteErr) return res.status(400).json({ ok: false, error: deleteErr.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action.' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
}
