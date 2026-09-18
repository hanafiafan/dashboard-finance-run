// Production server for VPS/Coolify deployment: serves the built Vite SPA
// and mounts the same two handlers Vercel used to run as serverless functions.
// Plain node:http on purpose — no framework needed for two routes + static files.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import financeApi from './api/finance-api.js';
import manageUser from './api/manage-user.js';

const PORT = process.env.PORT || 3000;
const DIST = join(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Vercel's serverless handlers call res.status(n).json(obj) and expect
// req.body already parsed — shim just enough of that on top of node:http.
function withHelpers(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
  };
  return res;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const routes = {
  '/api/finance-api': financeApi,
  '/api/manage-user': manageUser,
};

const server = createServer(async (req, res) => {
  withHelpers(res);
  const { pathname } = new URL(req.url, 'http://localhost');

  const handler = routes[pathname];
  if (handler) {
    req.body = await readJsonBody(req);
    try {
      return await handler(req, res);
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message || String(error) });
    }
  }

  const filePath = join(DIST, pathname === '/' ? 'index.html' : pathname);
  try {
    const data = await readFile(filePath);
    res.setHeader('content-type', MIME[extname(filePath)] || 'application/octet-stream');
    return res.end(data);
  } catch {
    // SPA fallback — same behavior as the vercel.json rewrite to index.html.
    const html = await readFile(join(DIST, 'index.html'));
    res.setHeader('content-type', 'text/html');
    return res.end(html);
  }
});

server.listen(PORT, () => console.log(`dashboard-finance-run listening on :${PORT}`));
