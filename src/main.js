// จุดเริ่มต้นของเกม: หน้าจอไตเติล, สร้าง/โหลดเกม, Game Loop
import { Game } from './managers/GameManager.js';
import { Renderer } from './render/Renderer.js';
import { UI } from './ui/UI.js';
import { SaveManager, makeLocalStore, CODE_RE, normalizeCode } from './managers/SaveManager.js';
import { loadAssets } from './render/atlas.js';

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
    loadAssets();
    const cv = $('#cover');
    if (window.__ASSETS__?.cover) cv.src = window.__ASSETS__.cover;
    cv.onerror = () => { cv.style.display = 'none'; };
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
