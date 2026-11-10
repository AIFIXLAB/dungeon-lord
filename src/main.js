// จุดเริ่มต้นของเกม: หน้าจอไตเติล, สร้าง/โหลดเกม, Game Loop
import { Game } from './managers/GameManager.js';
import { Renderer } from './render/Renderer.js';
import { UI } from './ui/UI.js';
import { SaveManager, makeLocalStore, CODE_RE, normalizeCode } from './managers/SaveManager.js';
import { loadAssets, sprite as atlasSprite } from './render/atlas.js';

const $ = (s) => document.querySelector(s);

class App {
  constructor() {
    this.game = null;
    this.renderer = null;
    this.ui = null;
    this.store = makeLocalStore();
    this.probe = new SaveManager({ state: {} }, this.store);
    this.last = performance.now();
    this.buildTitle();
    this.titleLoop();
    window.addEventListener('beforeunload', () => {
      if (this.game && !this.game.state.defeated && this.game.state.settings.autoSave) this.game.save.autoSave();
    });
    window.addEventListener('error', (e) => this.ui?.toast({ text: `ข้อผิดพลาด: ${e.message}`, kind: 'bad', id: Math.random() }));
  }

  buildTitle() {
    const auto = this.probe.slotInfo('auto');
    const menu = $('#titleMenu');
    menu.innerHTML = `
      ${!auto.empty && !auto.corrupt ? `<button class="btn gold" id="tContinue">เล่นต่อ (วันที่ ${auto.day} · Lv.${auto.level})</button>` : ''}
      <button class="btn ${auto.empty || auto.corrupt ? 'gold' : ''}" id="tNew">เริ่มเกมใหม่</button>
      <div class="row" style="justify-content:center"><input class="code" id="tCode" maxlength="4" placeholder="รหัส" aria-label="รหัสเซฟ 4 ตัว" autocomplete="off"><button class="btn" id="tLoad">โหลดด้วยรหัส</button></div>
      <p class="note" id="tMsg" style="min-height:1.2em"></p>`;
    $('#tNew').onclick = () => this.start(null, true);
    if ($('#tContinue')) $('#tContinue').onclick = () => { const r = this.probe.loadSlot('auto'); if (r.ok) this.start(r.data); else $('#tMsg').textContent = r.reason; };
    const load = async () => {
      const code = normalizeCode($('#tCode').value);
      if (!CODE_RE.test(code)) { $('#tMsg').textContent = 'ใส่รหัส 4 ตัว (A–Z, 2–9)'; return; }
      $('#tMsg').textContent = 'กำลังโหลด...';
      const r = await this.probe.loadFromCode(code);
      if (r.ok) this.start(r.data); else $('#tMsg').textContent = r.reason;
    };
    $('#tLoad').onclick = load;
    $('#tCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') load(); });
  }

  titleLoop() {
    const cv = $('#titleArt');
    const ctx = cv.getContext('2d');
    loadAssets();
    const ids = ['mon_slime', 'mon_goblin', 'mon_skeleton', 'mon_bat', 'mon_wolf', 'mon_imp', 'mon_ghost', 'mon_mushroom', 'mon_slime_king', 'hero_knight_left', 'hero_mage_left', 'hero_warrior_left', 'mon_fire_drake', 'mon_mimic'];
    const mobs = Array.from({ length: 14 }, (_, i) => ({ id: ids[i % ids.length], x: Math.random(), y: 0.55 + Math.random() * 0.4, v: (Math.random() * 0.4 + 0.2) * (Math.random() < 0.5 ? -1 : 1), p: Math.random() * 6 }));
    let t = 0;
    const frame = () => {
      if ($('#title').classList.contains('hidden')) return;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w) { cv.width = w; cv.height = h; }
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      t += 1 / 60;
      // ผนังถ้ำ
      ctx.fillStyle = '#1a1230';
      for (let i = 0; i < w; i += 24) ctx.fillRect(i, h * 0.5 + Math.sin(i * 0.05) * 8, 24, h);
      ctx.fillStyle = '#241a3c';
      for (let i = 0; i < w; i += 32) for (let j = Math.floor(h * 0.56); j < h; j += 32) if ((i / 32 + j / 32) % 2 < 1) ctx.fillRect(i, j, 32, 32);
      for (const m of mobs) {
        m.x += m.v * 0.0012; if (m.x < -0.05) m.x = 1.05; if (m.x > 1.05) m.x = -0.05;
        const a = atlasSprite(m.id); if (!a) continue;
        const H = 72, W = a.w * H / a.h;
        const bob = Math.abs(Math.sin(t * 6 + m.p)) * 6;
        const hero = m.id.startsWith('hero_');
        ctx.save(); ctx.translate(m.x * w, m.y * h - bob); ctx.scale(hero ? (m.v < 0 ? 1 : -1) : (m.v < 0 ? 1 : -1), 1);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(a.img, a.x, a.y, a.w, a.h, -W / 2, -H, W, H); ctx.restore();
      }
      requestAnimationFrame(frame);
    };
    frame();
  }

  start(state, isNew = false) {
    this.game = new Game(state);
    if (!this.renderer) this.renderer = new Renderer($('#map'), this.game);
    else this.renderer.setGame(this.game);
    if (!this.ui) this.ui = new UI(this);
    $('#modal-root').innerHTML = '';
    this.ui.modalStack = [];
    this.ui.attach(this.game);
    $('#title').classList.add('hidden');
    this.renderer.resize();
    this.renderer.centerOnArea();
    this.game.save.checkCloud().then(() => this.ui.refresh(true));
    if (!this.looping) { this.looping = true; this.last = performance.now(); requestAnimationFrame((t) => this.loop(t)); }
    if (isNew) this.ui.alert('มรดกของ Demon Lord', `
      <p>ดันเจี้ยนเก่าเหลือเพียง 3 ห้อง กับมอนสเตอร์ 3 ตัว ผู้กล้า Rank F จะเริ่มบุกเข้ามาในไม่ช้า</p>
      <p><b>ทางเข้าอยู่ทางซ้าย</b> ผู้กล้าเดินไปหา Dungeon Core (คริสตัลสีม่วง) — ถ้า Core ถูกทำลายคือพ่ายแพ้</p>
      <p>เริ่มต้นด้วย: จ้าง <b>Kobold</b> เป็นคนทำความสะอาด, สร้าง <b>Storage Room</b> ให้ Loot มีที่เก็บ และจ้างมอนสเตอร์ต่อสู้เพิ่ม</p>
      <p class="note">เป้าหมาย: ทำตามเงื่อนไขในเมนู "ดันเจี้ยน" เพื่อเลื่อนเป็น Dungeon Level 2 และต่อไปจนถึง Level 10</p>`, 'เริ่มสร้างอาณาจักร');
  }

  async onNewDay() {
    const g = this.game, s = g.state.settings;
    if (s.autoSave) {
      const r = g.save.autoSave();
      if (!r.ok) this.ui.toast({ text: `Auto Save ไม่สำเร็จ: ${r.reason}`, kind: 'bad', id: Math.random() });
    }
    if (s.cloudAutoSave && g.state.saveCode) {
      const r = await g.save.saveToCode(g.state.saveCode);
      if (!r.ok) this.ui.toast({ text: `บันทึกรหัส ${g.state.saveCode} ไม่สำเร็จ: ${r.reason}`, kind: 'warn', id: Math.random() });
    }
  }

  loop(t) {
    const dt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    try {
      this.game.update(dt);
      this.renderer.render(dt * (this.game.time.speed || 0.3));
    } catch (e) {
      console.error(e);
      if (!this.errShown) { this.errShown = true; this.ui.toast({ text: `ข้อผิดพลาดของเกม: ${e.message}`, kind: 'bad', id: Math.random() }); setTimeout(() => { this.errShown = false; }, 3000); }
    }
    requestAnimationFrame((tt) => this.loop(tt));
  }
}

window.__app = new App();
