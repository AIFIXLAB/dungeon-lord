// Vercel Serverless Function — บันทึก/โหลดเซฟด้วยรหัส 4 ตัว
// ใช้ Upstash Redis (Vercel Marketplace → "Upstash for Redis" หรือ Vercel KV เดิม)
// Environment variables: KV_REST_API_URL + KV_REST_API_TOKEN  หรือ  UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//
// GET  /api/save?ping=1            → { ok, storage }
// GET  /api/save?code=ABCD         → { ok, save }
// POST /api/save?action=new        → { ok, code }   (จองรหัสที่ยังไม่มีคนใช้)
// POST /api/save  { code, save }   → { ok }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
const MAX_BYTES = 900_000;
const RESERVE_TTL = 60 * 60 * 24 * 7;

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function randomCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

const key = (code) => `dlme:save:${code}`;

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

async function rateLimit(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
  const k = `dlme:rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  const n = await redis('INCR', k);
  if (n === 1) await redis('EXPIRE', k, 70);
  return n <= 60;
}

export default async function handler(req, res) {
  const q = req.query || {};
  if (!URL_ || !TOKEN) {
    if (q.ping) return send(res, 200, { ok: true, storage: false });
    return send(res, 503, { ok: false, error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่าฐานข้อมูล (Upstash Redis)' });
  }
  try {
    if (q.ping) return send(res, 200, { ok: true, storage: true });
    if (!(await rateLimit(req))) return send(res, 429, { ok: false, error: 'เรียกใช้บ่อยเกินไป ลองใหม่ในอีกสักครู่' });

    if (req.method === 'GET') {
      const code = String(q.code || '').toUpperCase();
      if (!CODE_RE.test(code)) return send(res, 400, { ok: false, error: 'รหัสไม่ถูกต้อง' });
      const raw = await redis('GET', key(code));
      if (!raw) return send(res, 404, { ok: false, error: 'ไม่พบเซฟของรหัสนี้' });
      const save = JSON.parse(raw);
      if (save.reserved) return send(res, 404, { ok: false, error: 'รหัสนี้ยังไม่มีเซฟ' });
      return send(res, 200, { ok: true, save });
    }

    if (req.method === 'POST') {
      if (q.action === 'new') {
        for (let i = 0; i < 25; i++) {
          const code = randomCode();
          const ok = await redis('SET', key(code), JSON.stringify({ reserved: true }), 'NX', 'EX', RESERVE_TTL);
          if (ok === 'OK') return send(res, 200, { ok: true, code });
        }
        return send(res, 503, { ok: false, error: 'สร้างรหัสไม่สำเร็จ ลองใหม่' });
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const code = String(body.code || '').toUpperCase();
      const save = body.save;
      if (!CODE_RE.test(code)) return send(res, 400, { ok: false, error: 'รหัสไม่ถูกต้อง' });
      if (!save || save.format !== 'DLME' || typeof save.version !== 'number' || !save.data) return send(res, 400, { ok: false, error: 'ข้อมูลเซฟไม่ถูกต้อง' });
      if (fnv1a(JSON.stringify(save.data)) !== save.checksum) return send(res, 400, { ok: false, error: 'ข้อมูลเซฟเสียหาย (checksum)' });
      const text = JSON.stringify(save);
      if (text.length > MAX_BYTES) return send(res, 413, { ok: false, error: 'เซฟมีขนาดใหญ่เกินไป' });
      const prev = await redis('GET', key(code));
      if (prev && !JSON.parse(prev).reserved) await redis('SET', `${key(code)}:prev`, prev);
      await redis('SET', key(code), text);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (e) {
    return send(res, 500, { ok: false, error: `เซิร์ฟเวอร์ผิดพลาด: ${e.message}` });
  }
}
