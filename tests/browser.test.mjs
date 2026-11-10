// Browser smoke test (Playwright + Chrome): เริ่มเกม, เล่นผ่าน UI จริง, บันทึกด้วยรหัส, รีโหลดแล้วโหลดกลับ
// ต้องรัน tests/devserver.mjs ก่อน
import { chromium } from 'playwright';

const OUT = process.env.OUT || '.';
const URL = process.env.URL || 'http://localhost:5173';
const errors = [];
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x); } };

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(URL);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/01-title.png` });
await page.click('#tNew');
await page.waitForTimeout(400);
check('intro modal', await page.isVisible('.modal'));
await page.screenshot({ path: `${OUT}/02-intro.png` });
await page.click('.modal .btn.gold');
await page.waitForTimeout(300);
check('topbar shows gold 500', (await page.textContent('#topbar')).includes('500'));

// จ้าง Kobold ผ่าน UI
await page.click('#mb-monsters');
await page.click('[data-act="tab"][data-v="recruit"]');
await page.click('[data-act="recruit"][data-id="rat"]');
await page.fill('#mIn', 'Pip');
await page.click('#mOk');
await page.waitForTimeout(300);
const st1 = await page.evaluate(() => ({ n: __app.game.state.monsters.length, gold: __app.game.state.gold, name: __app.game.state.monsters.at(-1).name }));
check('recruit via UI', st1.n === 4 && st1.gold === 455 && st1.name === 'Pip', JSON.stringify(st1));

// สร้าง Storage Room ผ่านโหมดวางห้องบนแผนที่
await page.click('#mb-build');
await page.click('[data-act="placeRoom"][data-id="storage_room"]');
const pos = await page.evaluate(() => { const p = __app.renderer.worldToScreen(10.5, 28.5); const b = document.querySelector('#map').getBoundingClientRect(); return { x: p.x + b.left, y: p.y + b.top }; });
await page.mouse.move(pos.x, pos.y);
await page.waitForTimeout(100);
await page.mouse.click(pos.x, pos.y);
await page.waitForTimeout(300);
const rooms = await page.evaluate(() => __app.game.state.dungeon.rooms.map((r) => `${r.type}@${r.x},${r.y}:${r.status}`));
check('room placed by click', rooms.some((r) => r.startsWith('storage_room@10,28')), rooms.join(' '));
await page.keyboard.press('Escape');

// เร่งเวลาให้ผู้กล้าเข้ามาต่อสู้
await page.click('[data-act="speed"][data-v="4"]');
await page.waitForFunction(() => __app.game.state.heroes.some((h) => h.inside), null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/03-combat.png` });
check('heroes inside dungeon', true);
await page.waitForFunction(() => __app.game.state.stats.kills > 0 || __app.game.state.stats.escapes > 0, null, { timeout: 90000 });
check('combat resolved on map', true);

// ทุกเมนูเปิดได้
for (const id of ['monsters', 'build', 'training', 'inventory', 'economy', 'dungeon', 'save', 'settings']) {
  await page.click(`#mb-${id}`);
  await page.waitForTimeout(120);
  const ok = await page.evaluate(() => document.querySelector('#panelBody').innerHTML.length > 50);
  check(`panel ${id} renders`, ok);
  if (id === 'dungeon') await page.screenshot({ path: `${OUT}/04-dungeon-panel.png` });
}
const openPanel = (id) => page.evaluate((i) => { if (__app.ui.panel !== i) __app.ui.openPanel(i); }, id);
for (const tab of ['boss', 'fusion', 'codex']) {
  await openPanel('monsters');
  await page.click(`[data-act="tab"][data-v="${tab}"]`);
  await page.waitForTimeout(150);
  check(`monsters tab ${tab}`, await page.evaluate(() => document.querySelector('#panelBody').innerHTML.length > 50));
}
// เลือกมอนสเตอร์ → detail
await openPanel('monsters');
await page.click('[data-act="tab"][data-v="list"]');
await page.click('[data-act="selMon"] >> nth=0');
await page.waitForTimeout(200);
check('monster detail', await page.isVisible('#detail'));
await page.screenshot({ path: `${OUT}/05-monster-detail.png` });
// เปลี่ยนหน้าที่เป็นทำความสะอาด
await page.selectOption('#detail select[data-change="assign"]', 'clean');
const asg = await page.evaluate(() => __app.game.state.monsters[0].assignment.type);
check('assignment change via UI', asg === 'clean', asg);

// บันทึกด้วยรหัส (คลาวด์ผ่าน /api/save)
await page.click('#mb-save');
await page.waitForTimeout(300);
await page.click('[data-act="newCode"]');
await page.waitForSelector('.modal');
const code = await page.evaluate(() => __app.game.state.saveCode);
check('code generated', /^[A-Z2-9]{4}$/.test(code || ''), code);
await page.screenshot({ path: `${OUT}/06-save-code.png` });
await page.click('.modal .btn.gold');
const snap = await page.evaluate(() => ({ gold: __app.game.state.gold, kills: __app.game.state.stats.kills, n: __app.game.state.monsters.length }));

// เคลียร์ localStorage เพื่อพิสูจน์ว่าโหลดจากเซิร์ฟเวอร์
await page.evaluate(() => { window.onbeforeunload = null; });
const page2 = await browser.newPage({ viewport: { width: 390, height: 780 } });
page2.on('pageerror', (e) => errors.push(`pageerror(mobile): ${e.message}`));
await page2.goto(URL);
await page2.evaluate(() => localStorage.clear());
await page2.reload();
await page2.waitForTimeout(500);
await page2.fill('#tCode', code.toLowerCase());
await page2.click('#tLoad');
await page2.waitForFunction(() => window.__app.game, null, { timeout: 10000 });
const loaded = await page2.evaluate(() => ({ gold: __app.game.state.gold, kills: __app.game.state.stats.kills, n: __app.game.state.monsters.length }));
check('load by code on another session (cloud)', loaded.n === snap.n && loaded.kills === snap.kills, `${JSON.stringify(snap)} vs ${JSON.stringify(loaded)}`);
await page2.waitForTimeout(600);
await page2.screenshot({ path: `${OUT}/07-mobile.png` });

check('no page errors', errors.length === 0, errors.slice(0, 5).join('\n'));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
