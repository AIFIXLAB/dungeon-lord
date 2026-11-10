// iPad touch test: ลากห้องไปวาง แล้วกด ✔ สร้างที่นี่ · สองนิ้วเลื่อน/ซูม
import { chromium, devices } from 'playwright';
const OUT = process.env.OUT || '.';
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x); } };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(process.env.URL || 'http://localhost:5173'); await page.waitForTimeout(800);
await page.tap('#tNew'); await page.waitForTimeout(300); await page.tap('.modal .btn.gold'); await page.waitForTimeout(200);
await page.evaluate(() => { __app.game.speed = 0; __app.game.state.gold = 5000; });
await page.tap('#mb-build'); await page.waitForTimeout(200);
await page.tap('[data-act="placeRoom"][data-id="storage_room"]'); await page.waitForTimeout(300);
check('panel closes on touch placement', await page.isHidden('#panel'));
const g0 = await page.evaluate(() => ({ tx: __app.ui.mode.tx, ty: __app.ui.mode.ty }));
check('ghost appears at screen center', g0.tx != null, JSON.stringify(g0));
const cdp = await ctx.newCDPSession(page);
const scr = (wx, wy) => page.evaluate(([x, y]) => { const p = __app.renderer.worldToScreen(x, y); const b = document.querySelector('#map').getBoundingClientRect(); return { x: p.x + b.left, y: p.y + b.top }; }, [wx, wy]);
const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
// ลากจากกลางตัววาง → ตำแหน่งเป้าหมาย
const from = await scr(g0.tx + 2.5, g0.ty + 2);
const to = await scr(12.5, 30);
await touch('touchStart', [from]);
for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: from.x + (to.x - from.x) * i / 10, y: from.y + (to.y - from.y) * i / 10 }]); await page.waitForTimeout(16); }
await touch('touchEnd', []);
await page.waitForTimeout(200);
const g1 = await page.evaluate(() => ({ tx: __app.ui.mode.tx, ty: __app.ui.mode.ty, cam: { ...__app.renderer.cam } }));
check('drag moves the room ghost (not the camera)', g1.tx === 10 && g1.ty === 28, JSON.stringify(g1));
await page.screenshot({ path: `${OUT}/ipad-drag.png` });
const rooms0 = await page.evaluate(() => __app.game.state.dungeon.rooms.length);
await page.tap('[data-act="confirmPlace"]'); await page.waitForTimeout(200);
const rooms = await page.evaluate(() => __app.game.state.dungeon.rooms.map((r) => `${r.type}@${r.x},${r.y}`));
check('✔ builds room at dragged spot', rooms.length === rooms0 + 1 && rooms.includes('storage_room@10,28'), rooms.join(' '));
// แตะบนตัววางซ้ำ = สร้าง (ย้ายไปจุดใหม่ก่อนด้วยการแตะ)
const t1 = await scr(17.5, 30); await touch('touchStart', [t1]); await touch('touchEnd', []); await page.waitForTimeout(100);
const g2 = await page.evaluate(() => ({ tx: __app.ui.mode.tx, ty: __app.ui.mode.ty }));
await touch('touchStart', [t1]); await touch('touchEnd', []); await page.waitForTimeout(200);
const n2 = await page.evaluate(() => __app.game.state.dungeon.rooms.length);
check('tap moves ghost, second tap on ghost builds', n2 === rooms0 + 2, JSON.stringify(g2) + ' n=' + n2);
// สองนิ้ว = เลื่อนแผนที่ (ไม่ขยับตัววาง)
const c0 = await page.evaluate(() => ({ ...__app.renderer.cam })), gg = await page.evaluate(() => __app.ui.mode?.tx);
const a = { x: 300, y: 300 }, b = { x: 500, y: 300 };
await touch('touchStart', [a, b]);
for (let i = 1; i <= 8; i++) { await touch('touchMove', [{ x: a.x + i * 10, y: a.y + i * 6 }, { x: b.x + i * 10, y: b.y + i * 6 }]); await page.waitForTimeout(16); }
await touch('touchEnd', []);
const c1 = await page.evaluate(() => ({ ...__app.renderer.cam })), gg2 = await page.evaluate(() => __app.ui.mode?.tx);
check('two-finger pans map', Math.abs(c1.x - c0.x) > 5 && gg === gg2, JSON.stringify([c0, c1, gg, gg2]));
check('no page errors', errs.length === 0, errs.join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
