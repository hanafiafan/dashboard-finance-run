/** API client — proxies requests to Google Apps Script backend */

import { demoState, demoRows, demoApi } from '../utils/demoData';

// Existing Apps Script deployment — token validation
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPiUwHg_735T661w8hLQ77XPfp_J9V7KSvqaQnkm2VBFQ8hqn2hSte7wp2izE94BIy/exec';

// Cached token — must match Apps Script generateApiToken_() output
let cachedApiToken = localStorage.getItem('financeJoyboardApiToken') || '';

export async function getApiToken() {
  if (cachedApiToken) return cachedApiToken;
  // Try to get from the Apps Script project properties
  try {
    const resp = await fetch(APPS_SCRIPT_URL + '?api=1');
    const data = await resp.json();
    if (data.configured) {
      // Token already configured on server
    }
  } catch (e) {}
  return cachedApiToken;
}

export async function api(action, args = [], auth) {
  if (auth?.isDemo) return demoApi(action, args);

  const userEmail = auth?.email || localStorage.getItem('financeJoyboardEmail') || '';
  const loginCode = auth?.loginCode || localStorage.getItem('financeJoyboardLoginCode') || '';

  // Try Vercel proxy first (for production)
  try {
    const response = await fetch('/api/finance-api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, args, userEmail, loginCode }),
    });
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data.ok) return data.result;
    }
  } catch (e) {
    // Fall through to direct Apps Script
  }

  // Direct call to Apps Script (for local dev or when Vercel proxy unavailable)
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      token: loginCode || cachedApiToken || 'mismatch',
      userEmail,
      action,
      args,
    }),
  });
  const text = await response.text();
  const data = JSON.parse(text || '{}');
  if (!data.ok && data.error && data.error.includes('Token')) {
    // Token not configured yet — fall back to demo
    console.warn('Apps Script API token not configured, using demo data:', data.error);
    return demoApi(action, args);
  }
  if (!data.ok) throw new Error(data.error || 'Request gagal.');
  return data.result;
}

export async function getAppState(filters = {}, auth) {
  if (auth?.isDemo) return demoState(filters);
  return api('getAppState', [filters], auth);
}

export async function getRecords(entity, filters = {}, auth) {
  if (auth?.isDemo) return { rows: demoRows(entity, filters), canEdit: true, canApprove: entity === 'budget' };
  return api('getRecords', [entity, filters], auth);
}

export async function saveRecord(entity, record, auth) {
  if (auth?.isDemo) return { ok: true, record, created: !record.ID };
  return api('saveRecord', [entity, record], auth);
}

export async function deleteRecord(entity, id, auth) {
  if (auth?.isDemo) return { ok: true };
  return api('deleteRecord', [entity, id], auth);
}

export async function approveBudget(id, status, paid, feedback, auth) {
  if (auth?.isDemo) return { ok: true };
  return api('approveBudget', [id, status, paid, feedback], auth);
}

export async function importFromSources(auth) {
  if (auth?.isDemo) return { ok: true, results: [{ brand: 'Demo', imported: 24 }] };
  return api('importFromSourceWorkbooks', [], auth);
}
