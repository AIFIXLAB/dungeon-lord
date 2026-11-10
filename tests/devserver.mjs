// Dev server สำหรับทดสอบในเครื่อง: เสิร์ฟไฟล์ static + /api/save (ใช้ handler จริง) + Redis จำลองใน memory
// รัน: node tests/devserver.mjs  แล้วเปิด http://localhost:5173
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PORT = +process.env.PORT || 5173;
const mem = new Map();
process.env.KV_REST_API_URL = `http://127.0.0.1:${PORT}/_redis`;
process.env.KV_REST_API_TOKEN = 'dev';
const { default: handler } = await import('../api/save.js');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

function fakeRedis(cmd) {
  const [op, k, v, ...rest] = cmd;
  switch (op) {
    case 'GET': return mem.has(k) ? mem.get(k) : null;
    case 'SET': if (rest.includes('NX') && mem.has(k)) return null; mem.set(k, v); return 'OK';
    case 'INCR': mem.set(k, String((+mem.get(k) || 0) + 1)); return +mem.get(k);
    case 'EXPIRE': return 1;
    default: throw new Error(`unsupported ${op}`);
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let body = '';
  for await (const c of req) body += c;
  if (url.pathname === '/_redis') {
    try { res.end(JSON.stringify({ result: fakeRedis(JSON.parse(body)) })); } catch (e) { res.end(JSON.stringify({ error: e.message })); }
    return;
  }
  if (url.pathname === '/api/save') {
    const vreq = { method: req.method, query: Object.fromEntries(url.searchParams), headers: req.headers, socket: req.socket, body: body ? JSON.parse(body) : {} };
    const vres = {
      statusCode: 200, setHeader: (a, b) => res.setHeader(a, b),
      status(c) { this.statusCode = c; return this; },
      send(t) { res.statusCode = this.statusCode; res.end(t); },
    };
    return handler(vreq, vres);
  }
  const p = normalize(join(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
  if (!p.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  try {
    const data = await readFile(p);
    res.setHeader('Content-Type', TYPES[extname(p)] || 'application/octet-stream');
    res.end(data);
  } catch { res.statusCode = 404; res.end('not found'); }
}).listen(PORT, () => console.log(`dev server http://localhost:${PORT}`));
