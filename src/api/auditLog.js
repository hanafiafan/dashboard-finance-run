import { supabase } from './supabaseClient';

// Self-hosted audit trail + error log (no third-party monitoring SaaS).
// Both fire-and-forget: a logging failure must never block the real action
// the user is trying to do, so every call is wrapped and only console.error'd.

export async function logAudit({ action, entity, entityId, before, after, note, auth }) {
  if (auth?.isDemo) return;
  try {
    const { error } = await supabase.from('fin_audit_log').insert({
      actor_email: auth?.email || null,
      actor_role: auth?.role || null,
      action,
      entity,
      entity_id: entityId != null ? String(entityId) : null,
      before: before ?? null,
      after: after ?? null,
      note: note ?? null,
    });
    if (error) throw error;
  } catch (err) {
    console.error('Audit log gagal disimpan:', err);
  }
}

export async function logError({ message, stack, source, userEmail }) {
  try {
    const { error } = await supabase.from('fin_error_log').insert({
      message: String(message || '').slice(0, 2000),
      stack: String(stack || '').slice(0, 4000),
      url: window.location.href,
      user_email: userEmail || null,
      user_agent: navigator.userAgent,
      source,
    });
    if (error) throw error;
  } catch (err) {
    console.error('Error log gagal disimpan:', err);
  }
}
