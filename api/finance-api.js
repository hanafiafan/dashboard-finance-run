const APPS_SCRIPT_API_URL = process.env.APPS_SCRIPT_API_URL || "";
const FINANCE_API_TOKEN = process.env.FINANCE_API_TOKEN || "";
const FINANCE_APP_LOGIN_CODE = process.env.FINANCE_APP_LOGIN_CODE || "";
const ALLOW_EMAIL_OVERRIDE = String(process.env.ALLOW_EMAIL_OVERRIDE || "").toLowerCase() === "true";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!APPS_SCRIPT_API_URL || !FINANCE_API_TOKEN) {
    return res.status(500).json({
      ok: false,
      error: "APPS_SCRIPT_API_URL dan FINANCE_API_TOKEN belum diset di Vercel Environment Variables.",
    });
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
  const userEmail = String(body.userEmail || body.email || "").trim().toLowerCase();
  const loginCode = String(body.loginCode || "").trim();

  if (!userEmail) {
    return res.status(401).json({ ok: false, error: "Email user wajib diisi." });
  }

  if (!ALLOW_EMAIL_OVERRIDE && (!FINANCE_APP_LOGIN_CODE || loginCode !== FINANCE_APP_LOGIN_CODE)) {
    return res.status(401).json({ ok: false, error: "Access code tidak valid." });
  }

  const payload = {
    token: FINANCE_API_TOKEN,
    userEmail,
    action: body.action,
    args: Array.isArray(body.args) ? body.args : [],
  };

  try {
    const response = await fetch(APPS_SCRIPT_API_URL, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const text = await response.text();
    const data = safeJson(text) || { ok: false, error: text || "Apps Script mengembalikan response kosong." };
    res.setHeader("Cache-Control", "no-store");
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    return res.status(502).json({ ok: false, error: error.message || String(error) });
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text || "{}");
  } catch (error) {
    return null;
  }
}
