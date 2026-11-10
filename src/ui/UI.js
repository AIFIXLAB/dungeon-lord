// UIManager — Top Bar, Bottom Menu, หน้าต่างเมนู, Detail Panel, Modal, Tooltip, Input บนแผนที่ (GDD §27)
import { BALANCE } from '../config/balance.js';
import { MONSTERS, PERSONALITIES, MUTATIONS, ROLE_TH, RARITY_ORDER } from '../data/monsters.js';
import { BOSSES, BOSS_TIERS } from '../data/bosses.js';
import { spriteIcon, onAssetsReady } from '../render/atlas.js';
import { RECIPES as FUSION_RECIPES } from '../managers/FusionManager.js';
import { ROOMS } from '../data/rooms.js';
import { ITEMS, RECIPES } from '../data/items.js';
import { TRAPS } from '../data/traps.js';
import { EVENTS } from '../data/events.js';
import { LEVELS } from '../data/levels.js';
import { HERO_CLASSES } from '../data/heroes.js';
import { SKILLS, STATUS_INFO } from '../data/skills.js';
import { ELEMENT_INFO } from '../data/elements.js';
import { TRAINING_TYPES } from '../managers/TrainingManager.js';
import { INCOME_LABELS, EXPENSE_LABELS } from '../managers/EconomyManager.js';
import { speciesInfo, tierOf } from '../managers/MonsterManager.js';
import { CODE_RE, normalizeCode } from '../managers/SaveManager.js';
import { spriteDataURL, itemIconURL } from '../render/sprites.js';
import { fmt, timeString, dist } from '../core/util.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => Math.max(0, Math.min(100, (a / Math.max(1, b)) * 100));
const AI_TH = {
  idle: 'ว่าง', patrol: 'ลาดตระเวน', fight: 'ต่อสู้', retreat: 'ถอยหนี', return: 'กลับประจำการ', rest: 'พักผ่อน', to_rest: 'ไปพัก',
  training: 'กำลังฝึก', to_train: 'ไปห้องฝึก', wait_train: 'รอห้องฝึกว่าง', to_job: 'ไปทำความสะอาด', cleaning: 'ทำความสะอาด',
  deliver: 'ขนของ', idle_worker: 'รองาน', ko: 'หมดสติ',
};
const HERO_STATE_TH = { entering: 'กำลังเข้า', advance: 'บุกไปที่ Core', fight: 'ต่อสู้', retreat: 'หลบหนี', attack_core: 'โจมตี Core', loot: 'หาสมบัติ' };
const MENU = [
  { id: 'monsters', label: 'มอนสเตอร์' }, { id: 'build', label: 'ก่อสร้าง' }, { id: 'training', label: 'ฝึก' },
  { id: 'inventory', label: 'คลัง' }, { id: 'economy', label: 'เศรษฐกิจ' }, { id: 'dungeon', label: 'ดันเจี้ยน' },
  { id: 'save', label: 'บันทึก' }, { id: 'settings', label: 'ตั้งค่า' },
];

export class UI {
  constructor(app) {
    this.app = app;
    this.panel = null; this.tab = {}; this.sel = null; this.invSel = null;
    this.mode = null;
    this.modalStack = [];
    this.lastToastIds = new Set();
    this.bindDom();
    this.bindCanvas();
    setInterval(() => this.refresh(), 400);
    onAssetsReady(() => { this.lastPanel = this.lastDetail = null; this.refresh(true); });
  }
  get g() { return this.app.game; }
  get r() { return this.app.renderer; }

  attach(game) {
    game.bus.on('notify', (e) => this.toast(e));
    game.bus.on('event', () => this.showEvent());
    game.bus.on('defeat', (d) => this.showDefeat(d));
    game.bus.on('rank_up', (d) => this.showRankUp(d));
    game.bus.on('new_day', () => this.app.onNewDay());
    this.sel = null; this.mode = null; this.panel = null;
    this.renderBottom();
    this.refresh(true);
    if (game.state.pendingEvent) this.showEvent();
  }

  // ================= DOM binding =================
  bindDom() {
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#map')) this.pointerDown = true; }, true);
    document.addEventListener('pointerup', () => { setTimeout(() => { this.pointerDown = false; }, 0); }, true);
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const fn = this.actions[el.dataset.act];
      if (!fn) return;
      e.preventDefault();
      this.g?.audio?.play('click');
      try { fn.call(this, el.dataset, el); } catch (err) { console.error(err); this.toast({ text: `เกิดข้อผิดพลาด: ${err.message}`, kind: 'bad', id: Math.random() }); }
      this.refresh(true);
    });
    document.addEventListener('change', (e) => {
      const el = e.target.closest('[data-change]');
      if (!el) return;
      const fn = this.changes[el.dataset.change];
      if (fn) { try { fn.call(this, el.value, el.dataset, el); } catch (err) { console.error(err); } this.refresh(true); }
    });
    document.addEventListener('keydown', (e) => {
      if (!this.g || $('#title').classList.contains('hidden') === false) return;
      if (e.target.matches('input, select, textarea')) return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); this.g.time.setSpeed(this.g.state.settings.speed === 0 ? (this.prevSpeed || 1) : (this.prevSpeed = this.g.state.settings.speed, 0)); }
      else if (k === '1' || k === '2' || k === '3') this.g.time.setSpeed([1, 2, 4][+k - 1]);
      else if (k === 'escape') { if (this.modalStack.length) return; if (this.mode) this.setMode(null); else if (this.sel) this.select(null); else this.openPanel(null); }
      else if (k === 'r' && this.mode && (this.mode.type === 'room' || this.mode.type === 'move')) this.mode.rot = ((this.mode.rot || 0) + 1) % 2;
      else if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        const d = 40; const m = { w: [0, d], s: [0, -d], a: [d, 0], d: [-d, 0], arrowup: [0, d], arrowdown: [0, -d], arrowleft: [d, 0], arrowright: [-d, 0] }[k];
        this.r.pan(m[0], m[1]);
      } else return;
      this.refresh(true);
    });
  }

  bindCanvas() {
    const cv = $('#map');
    const ptrs = new Map();
    let down = null, pinch = null, painted = new Set();
    const pos = (e) => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, pos(e));
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; down = null; return;
      }
      const p = pos(e);
      down = { ...p, sx: p.x, sy: p.y, moved: false, button: e.button, touch: e.pointerType === 'touch' };
      painted = new Set();
      if (this.mode?.type === 'corridor' && e.button === 0) this.paintCorridor(p, painted);
    });
    cv.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, p);
      if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.r.zoomAt(d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2); pinch.d = d; return;
      }
      this.hover(p, e);
      if (!down) return;
      if (this.mode?.type === 'corridor' && down.button === 0) { this.paintCorridor(p, painted); down.moved = true; return; }
      const dx = p.x - down.x, dy = p.y - down.y;
      if (!down.moved && Math.hypot(p.x - down.sx, p.y - down.sy) < 6) return;
      down.moved = true;
      this.r.pan(dx, dy); down.x = p.x; down.y = p.y;
    });
    const up = (e) => {
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (!down) return;
      const d = down; down = null;
      if (d.moved) return;
      if (d.button === 2) { this.setMode(null); return; }
      this.mapClick(pos(e), d.touch);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); down = null; pinch = null; });
    cv.addEventListener('pointerleave', () => { $('#tooltip').classList.add('hidden'); });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); this.r.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); }, { passive: false });
  }

  tileAt(p) { const w = this.r.screenToWorld(p.x, p.y); return { tx: Math.floor(w.x), ty: Math.floor(w.y), wx: w.x, wy: w.y }; }

  hover(p, e) {
    const { tx, ty, wx, wy } = this.tileAt(p);
    if (this.mode && e.pointerType !== 'touch') { this.mode.tx = tx; this.mode.ty = ty; }
    if (this.mode) { $('#tooltip').classList.add('hidden'); return; }
    if (e.pointerType === 'touch') return;
    const u = this.unitAt(wx, wy);
    const tt = $('#tooltip');
    let html = '';
    if (u) {
      const st = this.g.combat.stats(u);
      html = u.side === 'hero'
        ? `<b>${esc(u.name)}</b><br>${u.className} Rank ${u.rank} Lv.${u.level}<br>HP ${Math.ceil(u.hp)}/${st.hp} · ${HERO_STATE_TH[u.state] || u.state}`
        : `<b>${esc(u.name)}</b><br>${speciesInfo(u.species).name} Lv.${u.level}<br>${u.ko ? 'หมดสติ' : `HP ${Math.ceil(u.hp)}/${st.hp}`} · ${AI_TH[u.ai] || u.ai}`;
    } else {
      const room = this.g.dungeon.roomAtTile(tx, ty);
      const fo = this.g.state.floor.find((o) => Math.abs(o.x - wx) < 0.4 && Math.abs(o.y - wy) < 0.4);
      if (fo) html = { corpse: 'ศพผู้กล้า — รอทีมทำความสะอาด', blood: 'คราบเลือด', loot: `Loot: ${(fo.items || []).map((i) => ITEMS[i.itemId]?.name).join(', ') || ''} ${fo.gold ? `${fo.gold}G` : ''}`, debris: 'เศษหิน' }[fo.type];
      else if (room) html = `<b>${ROOMS[room.type].th}</b> Lv.${room.level}${room.status !== 'active' ? '<br><span class="bad-t">ไม่เชื่อมต่อทางเดิน</span>' : ''}${this.g.cleaning.isDirty(room) ? '<br><span class="bad-t">ห้องสกปรก</span>' : ''}`;
    }
    if (!html) { tt.classList.add('hidden'); return; }
    tt.innerHTML = html; tt.classList.remove('hidden');
    tt.style.left = `${Math.min(window.innerWidth - 270, e.clientX + 14)}px`; tt.style.top = `${e.clientY + 14}px`;
  }

  unitAt(wx, wy) {
    let best = null, bd = 0.75;
    for (const u of [...this.g.state.heroes, ...this.g.state.monsters]) {
      if (u.dead || (u.ko && u.ko.fade <= 0 && false)) continue;
      const d = Math.hypot(u.x - wx, u.y - 0.35 - wy);
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }

  paintCorridor(p, painted) {
    const { tx, ty } = this.tileAt(p);
    const key = `${tx},${ty}`;
    if (painted.has(key)) return;
    painted.add(key);
    this.mode.tx = tx; this.mode.ty = ty;
    const r = this.mode.erase ? this.g.dungeon.removeCorridor(tx, ty) : this.g.dungeon.buildCorridor(tx, ty);
    if (!r.ok && painted.size === 1 && r.reason !== 'มีสิ่งก่อสร้างอยู่แล้ว') this.flash(r.reason);
  }

  mapClick(p, touch) {
    const { tx, ty, wx, wy } = this.tileAt(p);
    const m = this.mode;
    if (m) {
      // มือถือ: แตะครั้งแรกเลื่อนตำแหน่ง แตะซ้ำเพื่อยืนยัน
      if (touch && (m.tx !== tx || m.ty !== ty) && m.type !== 'corridor') { m.tx = tx; m.ty = ty; return; }
      m.tx = tx; m.ty = ty;
      if (m.type === 'room') {
        const r = this.g.dungeon.buildRoom(m.roomType, tx, ty, m.rot || 0);
        if (!r.ok) this.flash(r.reason); else { this.g.audio?.play('build'); if (ROOMS[m.roomType].unique || this.g.state.gold < ROOMS[m.roomType].cost) this.setMode(null); }
      } else if (m.type === 'move') {
        if (!m.roomId) {
          const room = this.g.dungeon.roomAtTile(tx, ty);
          if (!room || room.type === 'core_room' && false) { this.flash('เลือกห้องที่จะย้าย'); return; }
          m.roomId = room.id; m.rot = room.rot; this.renderModeBar();
        } else {
          const r = this.g.dungeon.moveRoom(m.roomId, tx, ty, m.rot || 0);
          if (!r.ok) this.flash(r.reason); else this.setMode(null);
        }
      } else if (m.type === 'trap') {
        const r = this.g.dungeon.placeTrap(m.trapType, tx, ty);
        if (!r.ok) this.flash(r.reason); else this.g.audio?.play('build');
      } else if (m.type === 'corridor') {
        // handled by paint
      }
      return;
    }
    const u = this.unitAt(wx, wy);
    if (u) return this.select({ kind: u.side, id: u.id });
    const fo = this.g.state.floor.find((o) => Math.abs(o.x - wx) < 0.4 && Math.abs(o.y - wy) < 0.4);
    if (fo) return this.select({ kind: 'floor', id: fo.id });
    const trap = this.g.state.dungeon.traps.find((t) => t.x === tx && t.y === ty);
    if (trap) return this.select({ kind: 'trap', id: trap.id });
    const room = this.g.dungeon.roomAtTile(tx, ty);
    if (room) return this.select({ kind: 'room', id: room.id });
    this.select(null);
  }

  flash(text) { this.toast({ text, kind: 'bad', id: Math.random() }); this.g?.audio?.play('error'); }

  select(s) {
    this.sel = s;
    this.r.selected = s;
    this.refresh(true);
  }

  setMode(m) {
    this.mode = m;
    this.r.overlay = m;
    if (m) { this.select(null); if (window.innerWidth < 900) this.openPanel(null); }
    this.renderModeBar();
  }

  renderModeBar() {
    const bar = $('#modeBar');
    const m = this.mode;
    if (!m) { bar.classList.add('hidden'); return; }
    let t = '';
    if (m.type === 'room') t = `วาง <b>${ROOMS[m.roomType].th}</b> (${ROOMS[m.roomType].cost}G) — คลิกบนพื้นที่ว่าง`;
    if (m.type === 'move') t = m.roomId ? `เลือกตำแหน่งใหม่ของ <b>${ROOMS[this.g.dungeon.getRoom(m.roomId)?.type]?.th}</b>` : 'คลิกห้องที่ต้องการย้าย';
    if (m.type === 'corridor') t = m.erase ? 'ลากเพื่อลบทางเดิน' : `ลากเพื่อสร้างทางเดิน (${BALANCE.economy.corridorCost}G/ช่อง)`;
    if (m.type === 'trap') t = `วาง <b>${TRAPS[m.trapType].name}</b> (${TRAPS[m.trapType].cost}G)`;
    const rot = m.type === 'room' || (m.type === 'move' && m.roomId) ? '<button class="btn sm" data-act="rotate">หมุน (R)</button>' : '';
    bar.innerHTML = `<span>${t}</span>${rot}<button class="btn sm red" data-act="cancelMode">เสร็จ</button>`;
    bar.classList.remove('hidden');
  }

  // ================= Toasts =================
  toast(e) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = `toast ${e.kind || ''}`;
    el.textContent = e.text;
    box.appendChild(el);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => el.remove(), e.kind === 'story' ? 9000 : 5000);
  }

  // ================= Refresh =================
  refresh(force = false) {
    if (!this.g) return;
    if (this.pointerDown && !force) return; // อย่าเปลี่ยน DOM ระหว่างกดปุ่ม
    this.renderTop();
    const active = document.activeElement;
    const typing = active && active.matches('input, select, textarea');
    if (this.panel && (force || !typing || !$('#panel').contains(active))) this.renderPanel();
    if (force || !typing || !$('#detail').contains(active)) this.renderDetail();
    this.renderBadges();
  }

  renderTop() {
    const s = this.g.state;
    const core = s.core;
    const lvl = LEVELS[s.dungeonLevel - 1];
    const night = this.g.time.isNight();
    const sp = s.settings.speed;
    const html = `
      <span class="stat" title="Gold"><span class="ico" style="background:#f3c74a"></span><b>${fmt(s.gold)}</b></span>
      <span class="stat" title="อาหาร (ต้องการ ${this.g.economy.foodNeed()}/วัน)"><span class="ico" style="background:#d8a84a"></span>${fmt(s.food)}</span>
      <span class="stat" title="${lvl.name}">Lv.<b>${s.dungeonLevel}</b> ${esc(lvl.th)}</span>
      <span class="stat" title="มอนสเตอร์ / ที่พัก">👾 ${s.monsters.length}/${this.g.dungeon.barracksCapacity()}</span>
      <span class="stat" title="กำจัดผู้กล้า">⚔ ${fmt(s.stats.kills)}</span>
      <span class="stat" title="ชื่อเสียง: ${this.g.reputation.title()}">★ ${fmt(s.reputation)}</span>
      <span class="stat" title="Dungeon Core HP">Core <span class="corebar"><i style="transform:scaleX(${core.hp / core.maxHp})"></i></span> ${Math.ceil(core.hp)}</span>
      <span class="stat daynight">${night ? '☾' : '☀'} วันที่ ${this.g.time.day} ${timeString(s.time)}${s.heroes.length ? ` · <span class="bad-t">ผู้กล้า ${s.heroes.length}</span>` : ''}</span>
      <span class="speed" role="group" aria-label="ความเร็วเกม">
        ${[[0, '❚❚'], [1, '▶'], [2, '▶▶'], [4, '▶▶▶']].map(([v, l]) => `<button class="${sp === v ? 'on' : ''}" data-act="speed" data-v="${v}" title="${v ? `x${v}` : 'หยุด'}">${l}</button>`).join('')}
      </span>`;
    if (html !== this.lastTop) { $('#topbar').innerHTML = html; this.lastTop = html; }
  }

  renderBottom() {
    $('#bottombar').innerHTML = MENU.map((m) => `<button class="btn" data-act="panel" data-v="${m.id}" id="mb-${m.id}">${m.label}<span class="badge hidden"></span></button>`).join('');
  }

  renderBadges() {
    for (const m of MENU) {
      const b = $(`#mb-${m.id}`); if (!b) continue;
      b.classList.toggle('on', this.panel === m.id);
      const badge = b.querySelector('.badge');
      let t = '';
      if (m.id === 'dungeon' && this.g.progression.next() && this.g.progression.requirements().every((r) => r.met)) t = '!';
      if (m.id === 'inventory' && this.g.inventory.freeSlots() <= 0) t = 'เต็ม';
      if (m.id === 'monsters' && this.g.state.monsters.some((mm) => this.g.monsters.evolutionOptions(mm).some((id) => this.g.monsters.evolutionCheck(mm, id).ok))) t = 'Evo';
      badge.textContent = t; badge.classList.toggle('hidden', !t);
    }
  }

  openPanel(id) {
    this.panel = this.panel === id ? null : id;
    $('#panel').classList.toggle('hidden', !this.panel);
    this.r.showPath = this.panel === 'dungeon';
    if (this.panel && window.innerWidth < 640) this.select(null);
    this.refresh(true);
  }

  renderPanel() {
    const p = $('#panel');
    if (!this.panel) { p.classList.add('hidden'); this.lastPanel = null; return; }
    p.classList.remove('hidden');
    const body = $('#panelBody');
    const scroll = body.scrollTop;
    const def = MENU.find((m) => m.id === this.panel);
    $('#panelTitle').textContent = def.label;
    const html = this.panels[this.panel].call(this);
    if (html !== this.lastPanel) { body.innerHTML = html; this.lastPanel = html; body.scrollTop = scroll; }
  }

  tabs(panel, list) {
    const cur = this.tab[panel] || list[0][0];
    return { cur, html: `<div class="tabs" role="tablist">${list.map(([id, l]) => `<button class="tab ${cur === id ? 'on' : ''}" role="tab" data-act="tab" data-p="${panel}" data-v="${id}">${l}</button>`).join('')}</div>` };
  }

  monIcon(species, cls = '') { const sp = speciesInfo(species); const u = spriteIcon(sp.sprite, 64) || spriteDataURL('slime', { a: '#4fc3ff' }); return `<img class="icon ${cls}" alt="" src="${u}">`; }
  heroIcon(cls, dir = 'down', extra = '') { const u = spriteIcon(`hero_${cls}_${dir}`, 64) || spriteDataURL('hero', { a: '#4a6ab8' }); return `<img class="icon ${extra}" alt="" src="${u}">`; }
  itemIcon(it) {
    const d = ITEMS[it.itemId];
    const t = { weapon: 'weapon', armor: 'armor', helmet: 'helmet', shield: 'shield', ring: 'ring', necklace: 'necklace', potion: 'potion', material: 'material', crystal: 'crystal' }[d.type];
    const col = { common: '#a8a8b8', uncommon: '#5ad86a', rare: '#4a98ff', epic: '#b85aff', legendary: '#f3a74a', mythic: '#ff5a8a' }[it.rarity] || '#a8a8b8';
    const c2 = d.type === 'potion' ? (it.itemId === 'stamina_tonic' ? '#4ac8ff' : it.itemId === 'loyalty_treat' ? '#ffb84a' : '#e84a5a') : d.type === 'crystal' ? '#c86aff' : col;
    return `<img class="icon px" alt="" src="${itemIconURL(t, c2)}">`;
  }
  assignLabel(m) {
    const a = m.assignment;
    if (a.type === 'guard') return `เฝ้า ${ROOMS[this.g.dungeon.getRoom(a.roomId)?.type]?.th || '-'}`;
    if (a.type === 'train') return `ฝึก ${TRAINING_TYPES[a.stat]?.th}`;
    if (a.type === 'clean') return 'ทำความสะอาด';
    return 'พักผ่อน';
  }
  meter(label, v, max, cls) { return `<div class="meter"><span>${label}</span><div class="bar ${cls}"><i style="width:${pct(v, max)}%"></i></div><b>${Math.round(v)}</b></div>`; }

  // ================= Panels =================
  panels = {
    monsters() {
      const g = this.g;
      const t = this.tabs('monsters', [['list', `ทีม (${g.state.monsters.length})`], ['recruit', 'จ้าง'], ['boss', 'บอส'], ['fusion', 'Fusion'], ['codex', 'Codex']]);
      let html = t.html;
      if (t.cur === 'boss') return html + this.bossPanel();
      if (t.cur === 'fusion') return html + this.fusionPanel();
      if (t.cur === 'codex') return html + this.codexPanel();
      if (t.cur === 'list') {
        if (!g.state.monsters.length) html += '<p class="note">ยังไม่มีมอนสเตอร์ — จ้างได้ที่แท็บ "จ้างมอนสเตอร์"</p>';
        html += `<div class="list">${g.state.monsters.map((m) => {
          const st = g.monsters.stats(m);
          const evo = g.monsters.evolutionOptions(m).some((id) => g.monsters.evolutionCheck(m, id).ok);
          return `<div class="item ${this.sel?.id === m.id ? 'sel' : ''}" data-act="selMon" data-id="${m.id}">
            ${this.monIcon(m.species)}
            <div class="grow"><div class="name">${esc(m.name)} <span class="muted">Lv.${m.level}</span> ${evo ? '<span class="gold-t">Evo!</span>' : ''}</div>
            <div class="sub">${speciesInfo(m.species).name}${m.isBoss ? ' <span class="gold-t">BOSS</span>' : ''}${m.locked ? ' 🔒' : ''} · ${m.row === 'front' ? 'แถวหน้า' : 'แถวหลัง'} · ${this.assignLabel(m)} · ${m.ko ? '<span class="bad-t">หมดสติ</span>' : AI_TH[m.ai] || ''}</div>
            <div class="bar hp" style="margin-top:3px"><i style="width:${pct(m.hp, st.hp)}%"></i></div></div></div>`;
        }).join('')}</div>`;
        html += `<p class="note">คลิกมอนสเตอร์เพื่อดูรายละเอียด เปลี่ยนหน้าที่ สวมอุปกรณ์ และวิวัฒนาการ</p>`;
      } else {
        const cap = g.dungeon.barracksCapacity();
        html += `<p class="note">ที่พัก ${g.state.monsters.length}/${cap} — สร้างหรืออัปเกรด Barracks เพื่อเพิ่มที่พัก</p>`;
        html += '<div class="list">';
        for (const [id, d] of Object.entries(MONSTERS)) {
          if (!d.recruitable) continue;
          const locked = d.unlock > g.state.dungeonLevel;
          if (locked && d.unlock > g.state.dungeonLevel + 1) continue;
          const chk = g.monsters.canRecruit(id);
          const b = d.base;
          html += `<div class="card ${locked ? 'item locked' : ''}" style="cursor:default">
            <div class="row">${this.monIcon(id, 'lg')}<div class="grow">
              <div class="name">${d.name} <span class="r-${d.rarity}" style="font-size:12px">${d.rarity}</span></div>
              <div class="sub">${ROLE_TH[d.role]} · ธาตุ${ELEMENT_INFO[d.element].name} · ค่าบำรุง ${d.upkeep}/วัน${d.weak.length ? ` · แพ้ ${d.weak.map((w) => ELEMENT_INFO[w]?.name || w).join(', ')}` : ''}</div>
              <div class="sub">HP ${b.hp} ATK ${b.atk} MATK ${b.matk} DEF ${b.def} MDEF ${b.mdef} SPD ${b.spd}</div></div></div>
            <div class="row"><span class="gold-t grow">${fmt(g.monsters.recruitCost(id))} G</span>
            ${locked ? `<span class="muted">ปลดล็อกที่ Dungeon Lv.${d.unlock}</span>` : `<button class="btn sm gold" data-act="recruit" data-id="${id}" ${chk.ok ? '' : 'disabled'} title="${esc(chk.reason || '')}">จ้าง</button>`}</div>
            ${!locked && !chk.ok ? `<div class="sub bad-t">${esc(chk.reason)}</div>` : ''}
          </div>`;
        }
        html += '</div>';
      }
      return html;
    },

    build() {
      const g = this.g;
      const t = this.tabs('build', [['rooms', 'ห้อง'], ['tools', 'ทางเดิน/ย้าย'], ['traps', 'กับดัก'], ['list', 'ห้องทั้งหมด']]);
      let html = t.html;
      if (t.cur === 'rooms') {
        html += '<p class="note">เลือกห้องแล้วคลิกบนแผนที่ ห้องต้องติดกับทางเดินหรือห้องอื่นที่เชื่อมกับทางเข้า จึงจะใช้งานได้</p><div class="list">';
        for (const [id, d] of Object.entries(ROOMS)) {
          if (!d.buildable && d.buildable !== undefined) continue;
          const locked = d.unlock > g.state.dungeonLevel;
          const owned = g.state.dungeon.rooms.filter((r) => r.type === id).length;
          const disabled = locked || g.state.gold < d.cost || (d.unique && owned);
          html += `<div class="item ${locked ? 'locked' : ''} ${this.mode?.roomType === id ? 'sel' : ''}" ${disabled ? '' : `data-act="placeRoom" data-id="${id}"`}>
            <div class="icon" style="background:${d.color};border:2px solid #000"></div>
            <div class="grow"><div class="name">${d.th} <span class="muted">${d.size[0]}x${d.size[1]}</span> ${owned ? `<span class="muted">(มี ${owned})</span>` : ''}</div>
            <div class="sub">${esc(d.desc)}</div>
            <div class="sub">${locked ? `ปลดล็อกที่ Dungeon Lv.${d.unlock}` : `<span class="gold-t">${d.cost}G</span> · ค่าบำรุง ${d.upkeep}/วัน/ระดับ${d.unique ? ' · สร้างได้ 1 ห้อง' : ''}`}</div></div></div>`;
        }
        html += '</div>';
      } else if (t.cur === 'tools') {
        const lay = g.dungeon.canModifyLayout();
        html += `<div class="list">
          <div class="item ${this.mode?.type === 'corridor' && !this.mode.erase ? 'sel' : ''}" data-act="corridor" data-v="0"><div class="grow"><div class="name">สร้างทางเดิน</div><div class="sub">${BALANCE.economy.corridorCost}G ต่อช่อง — ลากบนแผนที่</div></div></div>
          <div class="item ${this.mode?.erase ? 'sel' : ''}" data-act="corridor" data-v="1"><div class="grow"><div class="name">ลบทางเดิน</div><div class="sub">ลบไม่ได้ถ้าทำให้ Core ขาดการเชื่อมต่อ</div></div></div>
          <div class="item ${this.mode?.type === 'move' ? 'sel' : ''}" ${lay.ok ? 'data-act="moveRoom"' : ''}><div class="grow"><div class="name">ย้ายห้อง</div><div class="sub">${lay.ok ? 'คลิกห้อง แล้วคลิกตำแหน่งใหม่ (ห้องเดิมย้ายพร้อมมอนสเตอร์)' : esc(lay.reason)}</div></div></div>
        </div>`;
        html += `<h3>ขยายพื้นที่ (${g.state.dungeon.area.w}x${g.state.dungeon.area.h})</h3><div class="row wrap">`;
        for (const [dir, l] of [['right', 'ขวา'], ['up', 'บน'], ['down', 'ล่าง']]) {
          const c = g.dungeon.canExpand(dir);
          html += `<button class="btn sm" data-act="expand" data-v="${dir}" ${c.ok && g.state.gold >= c.cost ? '' : 'disabled'} title="${esc(c.reason || '')}">ขยาย${l} ${c.ok ? `${fmt(c.cost)}G` : ''}</button>`;
        }
        const max = LEVELS[g.state.dungeonLevel - 1].maxArea;
        html += `</div><p class="note">ขนาดสูงสุดที่ Dungeon Lv.${g.state.dungeonLevel}: ${max.w}x${max.h}</p>`;
      } else if (t.cur === 'traps') {
        const ws = g.dungeon.roomsOfType('trap_workshop')[0];
        if (!ws) html += `<p class="note">${g.state.dungeonLevel < 2 ? 'กับดักปลดล็อกที่ Dungeon Level 2 (ต้องสร้าง Trap Workshop)' : 'สร้าง Trap Workshop ในแท็บ "ห้อง" เพื่อผลิตกับดัก'}</p>`;
        else {
          html += `<p class="note">กับดัก ${g.state.dungeon.traps.length}/${g.dungeon.maxTraps()} · วางบนทางเดินหรือในห้อง (ยกเว้นห้อง Core)</p><div class="list">`;
          for (const [id, d] of Object.entries(TRAPS)) {
            const locked = d.unlock > g.state.dungeonLevel;
            html += `<div class="item ${locked ? 'locked' : ''} ${this.mode?.trapType === id ? 'sel' : ''}" ${locked ? '' : `data-act="placeTrap" data-id="${id}"`}>
              <div class="icon" style="background:${d.color};border:2px solid #000"></div><div class="grow"><div class="name">${d.name}</div>
              <div class="sub">${locked ? `ปลดล็อก Lv.${d.unlock}` : `<span class="gold-t">${d.cost}G</span> · ดาเมจ ${d.damage} · CD ${d.cooldown}s · ระยะ ${d.range} · ทนทาน ${d.durability}`}</div></div></div>`;
          }
          html += '</div>';
        }
      } else {
        html += '<div class="list">';
        for (const r of g.state.dungeon.rooms) {
          const d = ROOMS[r.type];
          html += `<div class="item" data-act="selRoom" data-id="${r.id}"><div class="icon" style="background:${d.color};border:2px solid #000"></div>
            <div class="grow"><div class="name">${d.th} Lv.${r.level}</div><div class="sub">${r.status === 'active' ? 'ใช้งานได้' : '<span class="bad-t">ไม่เชื่อมต่อ</span>'}${g.cleaning.isDirty(r) ? ' · <span class="bad-t">สกปรก</span>' : ''}</div></div></div>`;
        }
        html += '</div>';
      }
      return html;
    },

    training() {
      const g = this.g;
      const rooms = g.training.rooms();
      let html = '';
      if (!rooms.length) return '<p class="note">ยังไม่มี Training Room — สร้างได้ที่เมนูก่อสร้าง</p><button class="btn" data-act="gotoBuild">ไปที่เมนูก่อสร้าง</button>';
      html += `<p class="note">การฝึก 1 รอบใช้ ${BALANCE.training.sessionHours} ชั่วโมงเกม และเพิ่ม Fatigue — มอนสเตอร์จะไปพักเองเมื่อเหนื่อยแล้วกลับมาฝึกต่อ</p>`;
      for (const r of rooms) html += `<div class="card"><b>Training Room Lv.${r.level}</b> — ช่องฝึก ${g.training.slotsUsed(r)}/${g.dungeon.roomCapacity(r)} · ประสิทธิภาพ x${g.dungeon.roomEffect(r, 'trainMult')}${g.cleaning.isDirty(r) ? ' <span class="bad-t">(สกปรก -30%)</span>' : ''}</div>`;
      html += '<div class="list">';
      for (const m of g.state.monsters) {
        const tr = m.training;
        const prog = tr ? pct(g.state.time - tr.start, tr.end - tr.start) : 0;
        const opts = Object.entries(TRAINING_TYPES).map(([k, v]) => `<option value="${k}" ${m.assignment.stat === k ? 'selected' : ''}>${v.th}</option>`).join('');
        html += `<div class="item" style="cursor:default">${this.monIcon(m.species)}<div class="grow">
          <div class="name">${esc(m.name)} <span class="muted">Lv.${m.level}</span></div>
          <div class="sub">${m.assignment.type === 'train' ? `${TRAINING_TYPES[m.assignment.stat].th} · ${AI_TH[m.ai] || ''}` : this.assignLabel(m)} · Fatigue ${Math.round(m.fatigue)}</div>
          ${tr ? `<div class="bar exp"><i style="width:${prog}%"></i></div>` : ''}
          <div class="row" style="margin-top:4px"><select data-id="${m.id}" id="tr-${m.id}" aria-label="ประเภทการฝึก">${opts}</select>
          ${m.assignment.type === 'train' ? `<button class="btn sm red" data-act="stopTrain" data-id="${m.id}">หยุดฝึก</button>` : `<button class="btn sm" data-act="startTrain" data-id="${m.id}" ${m.ko ? 'disabled' : ''}>ฝึก (${g.training.cost(m)}G/รอบ)</button>`}</div>
        </div></div>`;
      }
      return html + '</div>';
    },

    inventory() {
      const g = this.g, inv = g.inventory;
      const t = this.tabs('inventory', [['items', `ไอเทม ${inv.usedSlots()}/${inv.capacity()}`], ['craft', 'คราฟต์'], ['shop', 'ร้านค้า Merchant']]);
      let html = t.html;
      if (t.cur === 'items') {
        html += `<div class="row wrap" style="margin-bottom:8px"><span class="muted">เรียงตาม</span>
          <button class="btn sm" data-act="sort" data-v="type">ประเภท</button><button class="btn sm" data-act="sort" data-v="rarity">ความหายาก</button><button class="btn sm" data-act="sort" data-v="price">ราคา</button></div>`;
        html += '<div class="inv-grid">';
        for (const it of inv.items) {
          html += `<div class="slot ${this.invSel === it.uid ? 'sel' : ''}" data-act="invSel" data-id="${it.uid}" title="${esc(ITEMS[it.itemId].name)}">${this.itemIcon(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : ''}${it.plus ? `<span class="pl">+${it.plus}</span>` : ''}</div>`;
        }
        for (let i = inv.usedSlots(); i < inv.capacity(); i++) html += '<div class="slot empty"></div>';
        html += '</div>';
        const it = inv.get(this.invSel);
        if (it) {
          const d = ITEMS[it.itemId];
          const st = inv.itemStats(it);
          const mons = g.state.monsters.map((m) => `<option value="${m.id}">${esc(m.name)} (Lv.${m.level})</option>`).join('');
          html += `<div class="card" style="margin-top:10px"><div class="row">${this.itemIcon(it)}<div class="grow"><div class="name r-${it.rarity}">${d.name}${it.plus ? ` +${it.plus}` : ''}</div><div class="sub">${d.type} · ${it.rarity}${it.qty > 1 ? ` · x${it.qty}` : ''}</div></div></div>
            ${Object.keys(st).length ? `<div class="sub">${Object.entries(st).map(([k, v]) => `${k.toUpperCase()} +${k === 'crit' ? `${Math.round(v * 100)}%` : v}`).join(' · ')}</div>` : ''}
            ${d.use ? `<div class="sub">${d.use.heal ? `ฟื้น HP ${d.use.heal * 100}%` : ''}${d.use.fatigue ? ` Fatigue ${d.use.fatigue}` : ''}${d.use.loyalty ? ` Loyalty +${d.use.loyalty}` : ''}</div>` : ''}
            <div class="row wrap" style="margin-top:8px">
              ${d.slot || d.use ? `<select id="invTarget" aria-label="เลือกมอนสเตอร์">${mons}</select>` : ''}
              ${d.slot ? '<button class="btn sm" data-act="invEquip">สวมใส่</button>' : ''}
              ${d.use ? '<button class="btn sm" data-act="invUse">ใช้</button>' : ''}
              ${d.stats ? `<button class="btn sm" data-act="invUpgrade" ${it.plus >= BALANCE.loot.itemUpgradeMax ? 'disabled' : ''}>อัปเกรด (${inv.upgradeCost(it)}G)</button>` : ''}
              <button class="btn sm gold" data-act="invSell">ขาย ${inv.sellPrice(it)}G${it.qty > 1 ? ' /ชิ้น' : ''}</button>
              ${it.qty > 1 ? `<button class="btn sm" data-act="invSellAll">ขายทั้งหมด ${inv.sellPrice(it) * it.qty}G</button>` : ''}
            </div></div>`;
        } else html += '<p class="note">เลือกไอเทมเพื่อสวมใส่ ใช้ อัปเกรด หรือขาย · Loot ถูกนำเข้าคลังโดยทีมทำความสะอาด</p>';
      } else if (t.cur === 'craft') {
        html += '<div class="list">';
        for (const r of RECIPES) {
          const c = inv.canCraft(r);
          const d = ITEMS[r.result];
          html += `<div class="item" style="cursor:default">${this.itemIcon({ itemId: r.result, rarity: 'common' })}<div class="grow"><div class="name">${d.name}</div>
            <div class="sub">${Object.entries(r.materials).map(([k, q]) => `<span class="${inv.count(k) >= q ? 'good-t' : 'bad-t'}">${ITEMS[k].name} ${inv.count(k)}/${q}</span>`).join(' · ')} · ${r.gold}G</div></div>
            <button class="btn sm" data-act="craft" data-id="${r.id}" ${c.ok ? '' : 'disabled'} title="${esc(c.reason || '')}">คราฟต์</button></div>`;
        }
        html += '</div>';
      } else {
        html += `<p class="note">${g.state.shopDiscountDays > 0 ? '<span class="good-t">พ่อค้าเร่ลดราคา 25% วันนี้!</span>' : 'สินค้าเพิ่มขึ้นตาม Dungeon Level · ชื่อเสียงสูงได้ส่วนลด'}</p><div class="list">`;
        for (const s of g.economy.shopItems()) {
          const d = ITEMS[s.item];
          html += `<div class="item" style="cursor:default">${this.itemIcon({ itemId: s.item, rarity: 'common' })}<div class="grow"><div class="name">${d.name}</div><div class="sub">${d.type}${d.stats ? ` · ${Object.entries(d.stats).map(([k, v]) => `${k.toUpperCase()}+${v}`).join(' ')}` : ''}</div></div>
            <button class="btn sm gold" data-act="buy" data-id="${s.item}" ${g.state.gold >= s.price ? '' : 'disabled'}>${s.price}G</button></div>`;
        }
        html += '</div>';
      }
      return html;
    },

    economy() {
      const g = this.g, e = g.state.economy;
      const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
      const up = g.economy.dailyUpkeep();
      const need = g.economy.foodNeed(), prod = Math.floor(g.economy.foodProduction());
      let html = `<div class="card"><dl class="kv">
        <dt>Gold</dt><dd class="gold-t">${fmt(g.state.gold)}</dd>
        <dt>รายได้รวมทั้งหมด</dt><dd>${fmt(g.state.stats.totalIncome)}</dd>
        <dt>วันนี้ รายรับ / รายจ่าย</dt><dd><span class="good-t">+${fmt(sum(e.today.income))}</span> / <span class="bad-t">-${fmt(sum(e.today.expense))}</span></dd>
        <dt>ค่าบำรุงเที่ยงคืน</dt><dd>${fmt(up.total)} (มอนสเตอร์ ${up.monsters} · ห้อง ${up.rooms} · กับดัก ${up.traps})</dd></dl></div>`;
      html += `<h3>อาหารมอนสเตอร์</h3><div class="card"><dl class="kv"><dt>คลังอาหาร</dt><dd>${fmt(g.state.food)}</dd><dt>ใช้ต่อวัน</dt><dd>${need}</dd><dt>ฟาร์มผลิต/วัน</dt><dd>${prod}</dd><dt>ราคา</dt><dd>${g.economy.foodPrice()}G/หน่วย</dd></dl>
        <div class="row wrap" style="margin-top:8px"><button class="btn sm" data-act="buyFood" data-v="10">ซื้อ 10</button><button class="btn sm" data-act="buyFood" data-v="50">ซื้อ 50</button>
        <label class="row"><input type="checkbox" data-change="autoFood" ${g.state.settings.autoBuyFood ? 'checked' : ''}> ซื้ออัตโนมัติเมื่อไม่พอ</label></div></div>`;
      const hist = e.history.slice(-10);
      if (hist.length) {
        const max = Math.max(1, ...hist.map((h) => Math.max(h.income, h.expense)));
        html += `<h3>รายรับ-รายจ่ายย้อนหลัง</h3><div class="chart" aria-label="กราฟรายรับรายจ่าย">${hist.map((h) => `<div title="วันที่ ${h.day}: +${h.income} / -${h.expense}"><span class="inc" style="height:${(h.income / max) * 48}%"></span><span class="exp" style="height:${(h.expense / max) * 48}%"></span></div>`).join('')}</div>
          <p class="note"><span class="good-t">■</span> รายรับ <span class="bad-t">■</span> รายจ่าย · กำไรเมื่อวาน ${fmt(hist[hist.length - 1].profit)}</p>`;
      }
      html += '<h3>รายละเอียดวันนี้</h3><div class="card"><dl class="kv">';
      for (const [k, v] of Object.entries(e.today.income)) html += `<dt>${INCOME_LABELS[k] || k}</dt><dd class="good-t">+${fmt(v)}</dd>`;
      for (const [k, v] of Object.entries(e.today.expense)) html += `<dt>${EXPENSE_LABELS[k] || k}</dt><dd class="bad-t">-${fmt(v)}</dd>`;
      if (!Object.keys(e.today.income).length && !Object.keys(e.today.expense).length) html += '<dt>ยังไม่มีรายการ</dt><dd></dd>';
      return html + '</dl></div>';
    },

    dungeon() {
      const g = this.g, prog = g.progression, s = g.state;
      const lv = prog.current(), next = prog.next();
      let html = `<div class="card"><div class="name gold-t" style="font-size:18px">Lv.${lv.level} ${lv.name}</div><div class="sub">${esc(lv.th)} · ผู้กล้า Rank ${lv.ranks.join('/')} · ปาร์ตี้สูงสุด ${lv.party} คน · ${g.heroes.dailyCount()} คน/วัน</div></div>`;
      if (next) {
        const reqs = prog.requirements();
        html += `<h3>เลื่อนเป็น Lv.${next.level} ${next.name}</h3>`;
        for (const r of reqs) html += `<div class="req"><span class="${r.met ? 'ok' : 'no'}">${r.met ? '✔' : '✘'}</span><span class="grow">${r.label}</span><span>${fmt(r.have)}/${fmt(r.need)}</span></div><div class="bar exp"><i style="width:${pct(r.have, r.need)}%"></i></div>`;
        const can = prog.canRankUp();
        html += `<p class="note">ปลดล็อก: ${next.unlocks.map(esc).join(', ')}</p><button class="btn gold" data-act="rankUp" ${can.ok ? '' : 'disabled'}>เลื่อนระดับดันเจี้ยน</button>${!can.ok && reqs.every((r) => r.met) ? `<p class="note">${esc(can.reason)}</p>` : ''}`;
      } else html += '<p class="note">ดันเจี้ยนถึงระดับสูงสุดแล้ว — ผู้กล้าที่แข็งแกร่งที่สุดจะมาไม่สิ้นสุด</p>';
      const ev = g.dungeon.evaluateDifficulty();
      html += `<h3>ความยากของเส้นทางสู่ Core</h3><div class="card"><div class="name">${ev.label} <span class="muted">(คะแนน ${ev.score})</span></div>
        <div class="sub">ระยะทาง ${ev.length} ช่อง · ห้องบนเส้นทาง ${ev.rooms || 0} · มอนสเตอร์เฝ้า ${ev.monsterCount || 0} · กับดัก ${ev.traps || 0} · ทางแยก ${ev.branches || 0}</div>
        <p class="note">เส้นประสีทองบนแผนที่คือเส้นทางที่ผู้กล้าน่าจะใช้</p></div>`;
      const core = g.dungeon.coreRoom();
      const cc = g.dungeon.upgradeCost(core);
      html += `<h3>Dungeon Core</h3><div class="card"><dl class="kv"><dt>Core Level</dt><dd>${core.level}</dd><dt>HP</dt><dd>${Math.ceil(s.core.hp)}/${s.core.maxHp}</dd>
        <dt>Core Defense</dt><dd>${BALANCE.core.defPerLevel * (core.level - 1)}</dd><dt>Core Aura</dt><dd>${BALANCE.core.auraDamagePerLevel * core.level} ดาเมจ/${BALANCE.core.auraInterval}s ในห้อง Core</dd></dl>
        <button class="btn sm" data-act="upRoom" data-id="${core.id}" style="margin-top:6px" ${cc != null && s.gold >= cc ? '' : 'disabled'}>${cc != null ? `อัปเกรด Core (${fmt(cc)}G)` : 'Core ระดับสูงสุด'}</button></div>`;
      html += `<h3>ชื่อเสียง</h3><div class="card"><div class="name">★ ${fmt(s.reputation)} — ${g.reputation.title()}</div><p class="note">ชื่อเสียงเพิ่มจำนวนและระดับผู้กล้า ลดราคาจ้างมอนสเตอร์ และเพิ่มรางวัล · ลดลงเมื่อผู้กล้าหนี ห้องสกปรก หรือ Core เสียหาย</p></div>`;
      if (s.dungeon.traps.length) {
        html += '<h3>กับดัก</h3><div class="list">';
        for (const t of s.dungeon.traps) {
          const d = TRAPS[t.type], max = d.durability + (t.level - 1) * 10;
          html += `<div class="item" data-act="selTrap" data-id="${t.id}"><div class="grow"><div class="name">${d.name} Lv.${t.level}</div><div class="sub">ทนทาน ${t.durability}/${max} ${t.durability <= 0 ? '<span class="bad-t">พัง</span>' : ''}</div></div></div>`;
        }
        html += '</div>';
      }
      const st = s.stats;
      html += `<h3>สถิติ</h3><div class="card"><dl class="kv"><dt>กำจัดผู้กล้า</dt><dd>${fmt(st.kills)}</dd><dt>ผู้กล้าหลบหนี</dt><dd>${fmt(st.escapes)}</dd><dt>ป้องกันสำเร็จ</dt><dd>${fmt(st.defenses)}</dd><dt>ทำความสะอาด</dt><dd>${fmt(st.cleaned)}</dd><dt>การฝึก</dt><dd>${fmt(st.trainings)}</dd><dt>มอนสเตอร์หมดสติ</dt><dd>${fmt(st.monsterKOs)}</dd></dl></div>`;
      html += `<h3>บันทึกเหตุการณ์</h3><div class="card" style="max-height:200px;overflow:auto;font-size:13px">${[...s.log].reverse().slice(0, 40).map((l) => `<div class="${l.kind === 'bad' ? 'bad-t' : l.kind === 'good' ? 'good-t' : ''}">[${timeString(l.t)}] ${esc(l.text)}</div>`).join('')}</div>`;
      return html;
    },

    save() {
      const g = this.g, sv = g.save;
      const code = g.state.saveCode;
      const cloud = sv.cloudAvailable;
      let html = `<h3>บันทึกด้วยรหัส 4 ตัว</h3><div class="card">
        <p class="note">${cloud === true ? '<span class="good-t">● เชื่อมต่อคลาวด์</span> — ใช้รหัสโหลดเกมจากเครื่องไหนก็ได้' : cloud === false ? `<span class="bad-t">● ${esc(sv.cloudReason || 'ออฟไลน์')}</span> — รหัสจะบันทึกไว้ในเบราว์เซอร์นี้เท่านั้น` : 'กำลังตรวจสอบการเชื่อมต่อ...'}</p>
        ${code ? `<div class="row"><span class="muted">รหัสของคุณ</span><span class="gold-t" style="font-size:30px;letter-spacing:6px">${code}</span></div>
          <div class="row wrap" style="margin-top:8px"><button class="btn gold" data-act="saveCode">บันทึกไปที่รหัส ${code}</button><button class="btn sm" data-act="newCode">สร้างรหัสใหม่</button></div>
          <p class="note">จดรหัสนี้ไว้! บันทึกอัตโนมัติทุกวันในเกม${g.state.settings.cloudAutoSave ? '' : ' (ปิดอยู่ในตั้งค่า)'} · ใครมีรหัสก็โหลดเซฟนี้ได้</p>`
        : '<button class="btn gold" data-act="newCode">สร้างรหัสและบันทึก</button>'}
      </div>
      <h3>โหลดด้วยรหัส</h3><div class="card"><div class="row wrap"><input class="code" id="loadCodeInput" maxlength="4" placeholder="XXXX" aria-label="รหัส 4 ตัว" autocomplete="off"><button class="btn" data-act="loadCode">โหลด</button></div>
        <p class="note">รหัสใช้ตัวอักษร A–Z และตัวเลข 2–9 (ไม่มี I, O, 0, 1 เพื่อไม่ให้สับสน)</p></div>
      <h3>ช่องบันทึกในเครื่อง</h3><div class="list">`;
      for (const slot of [1, 2, 3, 'auto']) {
        const info = sv.slotInfo(slot);
        html += `<div class="item" style="cursor:default"><div class="grow"><div class="name">${slot === 'auto' ? 'Auto Save' : `ช่อง ${slot}`}</div>
          <div class="sub">${info.empty ? 'ว่าง' : info.corrupt ? '<span class="bad-t">ข้อมูลเสียหาย</span>' : `วันที่ ${info.day} · Lv.${info.level} · ${fmt(info.gold)}G · ${new Date(info.savedAt).toLocaleString('th-TH')}`}</div></div>
          ${slot !== 'auto' ? `<button class="btn sm" data-act="saveSlot" data-v="${slot}">บันทึก</button>` : ''}
          <button class="btn sm" data-act="loadSlot" data-v="${slot}" ${info.empty ? 'disabled' : ''}>โหลด</button></div>`;
      }
      html += `</div><h3>ไฟล์สำรอง</h3><div class="row wrap"><button class="btn sm" data-act="exportSave">ดาวน์โหลดไฟล์เซฟ</button><label class="btn sm">นำเข้าไฟล์เซฟ<input type="file" accept=".json,application/json" data-change="importSave" hidden></label></div>`;
      return html;
    },

    settings() {
      const s = this.g.state.settings;
      const chk = (k, l) => `<label class="row" style="margin:6px 0"><input type="checkbox" data-change="setting" data-k="${k}" ${s[k] ? 'checked' : ''}> ${l}</label>`;
      return `<div class="card">${chk('sound', 'เสียงเอฟเฟกต์')}
        <label class="row">ระดับเสียง <input type="range" min="0" max="1" step="0.1" value="${s.volume}" data-change="volume" class="grow"></label>
        ${chk('pauseOnModal', 'หยุดเวลาเมื่อเปิดหน้าต่างสำคัญ')}${chk('autoBuyFood', 'ซื้ออาหารอัตโนมัติ')}${chk('autoSave', 'Auto Save ทุกวัน (ในเครื่อง)')}${chk('cloudAutoSave', 'บันทึกไปที่รหัสอัตโนมัติทุกวัน')}</div>
        <h3>วิธีเล่น</h3><div class="card" style="font-size:14px;line-height:1.55">
        <p>ผู้กล้าเดินจากทางเข้า (ซ้าย) ไปหา Dungeon Core มอนสเตอร์ที่เฝ้าห้องบนเส้นทางจะต่อสู้แบบ Real-time</p>
        <p>กำจัดผู้กล้าเพื่อรับทอง EXP และชื่อเสียง ทีมทำความสะอาดนำ Loot เข้าคลังและกำจัดศพ</p>
        <p>ฝึกมอนสเตอร์ในห้องฝึก เก็บ Evolution Crystal เพื่อวิวัฒนาการ และทำตามเงื่อนไขในเมนูดันเจี้ยนเพื่อเลื่อนระดับ</p>
        <p class="muted">คีย์ลัด: Space หยุด/เล่น · 1/2/3 ความเร็ว · WASD เลื่อนกล้อง · ล้อเมาส์ซูม · R หมุนห้อง · Esc ยกเลิก</p></div>
        <h3>เกมใหม่</h3><button class="btn red" data-act="newGame">เริ่มเกมใหม่</button>`;
    },
  };

  // ================= Boss / Fusion / Codex =================
  bossPanel() {
    const g = this.g;
    const cur = g.monsters.currentBoss();
    const hasRoom = g.dungeon.roomsOfType('boss_room').length > 0;
    let html = `<p class="note">${hasRoom ? 'บอสเฝ้า Boss Room มี 3 Phase (HP 60% / 25%) และเรียก Minion ได้ — ได้ Boss Soul จากการเลื่อนระดับดันเจี้ยนและการป้องกันสำเร็จ' : 'สร้าง Boss Room (เมนูก่อสร้าง) ก่อนอัญเชิญบอส'} · Boss Soul ที่มี: <b>${g.inventory.count('boss_soul')}</b></p>`;
    if (cur) html += `<div class="card"><div class="row">${this.monIcon(cur.species, 'lg')}<div class="grow"><div class="name gold-t">${esc(cur.name)} Lv.${cur.level}</div><div class="sub">${cur.ko ? '<span class="bad-t">หมดสติ</span>' : `Phase ${cur.phase || 1}`} · ค่าบำรุง ${g.monsters.upkeep(cur)}/วัน</div></div><button class="btn sm" data-act="selMon" data-id="${cur.id}">ดู</button></div></div>`;
    for (const tier of [1, 2, 3, 4, 5]) {
      const T = BOSS_TIERS[tier];
      const locked = T.unlock > g.state.dungeonLevel;
      html += `<h3>${T.name} — ${T.th} <span class="muted">(Dungeon Lv.${T.unlock}+ · ${fmt(T.cost)}G หรือ Boss Soul x${tier})</span></h3>`;
      if (locked) { html += '<p class="note">ยังไม่ปลดล็อก</p>'; continue; }
      html += '<div class="list">';
      for (const b of Object.values(BOSSES).filter((x) => x.tier === tier)) {
        const cg = g.monsters.canSummonBoss(b.id, false), cs = g.monsters.canSummonBoss(b.id, true);
        html += `<div class="item" style="cursor:default">${this.monIcon(b.id, 'lg')}<div class="grow"><div class="name">${b.name}</div>
          <div class="sub">${ROLE_TH[b.role] || b.role} · ธาตุ${ELEMENT_INFO[b.element]?.name} · แพ้ ${b.weak.map((w) => ELEMENT_INFO[w]?.name || w).join(', ') || '-'}</div>
          <div class="sub">${b.skills.map((s) => s.name).join(' · ')}</div></div>
          <div class="list"><button class="btn sm gold" data-act="summonBoss" data-id="${b.id}" ${cg.ok ? '' : 'disabled'} title="${esc(cg.reason || '')}">Gold</button><button class="btn sm" data-act="summonBoss" data-id="${b.id}" data-v="soul" ${cs.ok ? '' : 'disabled'} title="${esc(cs.reason || '')}">Soul</button></div></div>`;
      }
      html += '</div>';
    }
    return html;
  }

  fusionPanel() {
    const g = this.g, f = (this.fuse ||= {});
    if (!g.fusion.chamber()) return `<p class="note">${g.state.dungeonLevel < 2 ? 'Fusion ปลดล็อกที่ Dungeon Level 2' : 'สร้าง Fusion Chamber ในเมนูก่อสร้างเพื่อเริ่มผสมมอนสเตอร์'}</p>`;
    const usable = g.state.monsters.filter((m) => !g.fusion.canUse(m));
    const opt = (k) => `<select class="grow" data-change="fusionSel" data-k="${k}" aria-label="มอนสเตอร์ ${k.toUpperCase()}"><option value="">— เลือก —</option>${usable.map((m) => `<option value="${m.id}" ${f[k] === m.id ? 'selected' : ''}>${esc(m.name)} · ${speciesInfo(m.species).name} Lv.${m.level}</option>`).join('')}</select>`;
    let html = `<p class="note">เลือกมอนสเตอร์ 2 ตัว (ห้ามล็อก/หมดสติ/กำลังต่อสู้/ฝึก) ทั้งคู่จะถูกใช้เป็นวัตถุดิบ ผลลัพธ์ได้เลเวลครึ่งหนึ่งของค่าเฉลี่ยพ่อแม่ สืบทอดบุคลิก สกิล และค่าฝึกบางส่วน</p>
      <div class="card"><div class="row" style="margin-bottom:6px"><b style="width:18px">A</b>${opt('a')}</div><div class="row"><b style="width:18px">B</b>${opt('b')}</div>
      <label class="row" style="margin-top:6px"><input type="checkbox" data-change="fusionCrystal" ${f.crystal ? 'checked' : ''}> ใช้ Fusion Crystal (มี ${g.inventory.count('fusion_crystal')}) — เพิ่มโอกาส rarity สูงและ Mutation</label></div>`;
    const ma = g.monsters.get(f.a), mb = g.monsters.get(f.b);
    if (ma && mb && ma !== mb) {
      const pv = g.fusion.preview(ma, mb, !!f.crystal);
      html += `<h3>ผลลัพธ์ที่เป็นไปได้ <span class="muted">(${pv.kind === 'recipe' ? 'สูตรแน่นอน' : pv.kind === 'element' ? 'สูตรธาตุ' : 'สุ่มตาม Rarity'})</span></h3><div class="list">`;
      for (const r of pv.results.slice(0, 8)) { const d = MONSTERS[r.species]; html += `<div class="item" style="cursor:default">${this.monIcon(r.species)}<div class="grow"><div class="name">${d.name} <span class="r-${d.rarity}" style="font-size:12px">${d.rarity}</span></div><div class="sub">${ROLE_TH[d.role]} · ธาตุ${ELEMENT_INFO[d.element].name}</div></div><b>${(r.chance * 100).toFixed(1)}%</b></div>`; }
      if (pv.results.length > 8) html += `<p class="note">และอีก ${pv.results.length - 8} สายพันธุ์</p>`;
      const chk = g.fusion.check(f.a, f.b, !!f.crystal);
      html += `</div><p class="note">ค่าใช้จ่าย ${fmt(g.fusion.cost(ma, mb))} Gold · โอกาส Mutation ${Math.round((BALANCE.fusion.mutationChance + (f.crystal ? 0.08 : 0)) * 100)}% · ใช้เวลา ${(BALANCE.fusion.hours * (g.dungeon.roomEffect(g.fusion.chamber(), 'timeMult') || 1)).toFixed(1)} ชม.</p>
        <button class="btn gold" data-act="fusionStart" ${chk.ok ? '' : 'disabled'}>เริ่ม Fusion</button>${chk.ok ? '' : `<p class="note bad-t">${esc(chk.reason)}</p>`}`;
    }
    if (g.state.fusions?.length) {
      html += `<h3>กำลังผสม (${g.state.fusions.length}/${g.fusion.slots()})</h3><div class="list">`;
      for (const j of g.state.fusions) html += `<div class="card">${j.parents.map((p) => esc(p.name)).join(' + ')} → <b>???</b><div class="bar exp"><i style="width:${pct(g.state.time - j.start, j.end - j.start)}%"></i></div></div>`;
      html += '</div>';
    }
    html += `<h3>สูตรที่รู้จัก</h3><div class="card" style="font-size:13px">${FUSION_RECIPES.map((r) => `<div>${MONSTERS[r.a].name} + ${MONSTERS[r.b].name} → <b>${MONSTERS[r.result].name}</b></div>`).join('')}<p class="note">สูตรธาตุ: ไฟ+ลม, ไฟ+ดิน, น้ำ+น้ำแข็ง, มืด+พิษ, แสง+ลม, ธรรมชาติ+ดิน, สายฟ้า+น้ำ, มืด+ไฟ · สูตรแน่นอน 9 สูตร (เช่น Goblin + Skeleton, Wolf + Dire Wolf)</p></div>`;
    return html;
  }

  codexPanel() {
    const g = this.g, cx = g.state.codex || {}, hc = g.state.heroCodex || {};
    const t = this.tabs('codex', [['mon', 'มอนสเตอร์'], ['boss', 'บอส'], ['hero', 'ผู้กล้า 60 คลาส']]);
    let html = t.html;
    if (t.cur === 'hero') {
      html += `<p class="note">พบแล้ว ${Object.keys(hc).length}/60 คลาส</p><div class="inv-grid">`;
      for (const [id, c] of Object.entries(HERO_CLASSES)) html += hc[id] ? `<div class="slot" title="${c.name} (${c.th}) · ${c.role} · Rank ${c.minRank}+ · แพ้ ${c.weak.join(', ')} · พบ ${hc[id]} ครั้ง">${this.heroIcon(id)}</div>` : `<div class="slot empty" title="Unknown">?</div>`;
      return html + '</div>';
    }
    const ids = t.cur === 'boss' ? Object.keys(BOSSES) : Object.keys(MONSTERS);
    const found = ids.filter((id) => cx[id]).length;
    html += `<p class="note">ค้นพบ ${found}/${ids.length} — ข้อมูลที่ยังไม่ค้นพบแสดงเป็น Unknown</p><div class="inv-grid">`;
    for (const id of ids) {
      const e = cx[id];
      if (!e) { html += '<div class="slot empty" title="Unknown">?</div>'; continue; }
      const sp = speciesInfo(id);
      html += `<div class="slot" title="${sp.name} · ${sp.rarity} · ${ROLE_TH[sp.role]} · ธาตุ${ELEMENT_INFO[sp.element]?.name} · ครอบครอง ${e.owned || 0} · วิวัฒนาการ ${e.evolved || 0} · Fusion ${e.fused || 0} · หมดสติ ${e.ko || 0}">${this.monIcon(id)}</div>`;
    }
    return html + '</div>';
  }

  // ================= Detail panel =================
  renderDetail() {
    const box = $('#detail');
    const s = this.sel;
    if (!s) { box.classList.add('hidden'); this.lastDetail = null; return; }
    let html = '';
    if (s.kind === 'monster') html = this.monsterDetail(this.g.monsters.get(s.id));
    else if (s.kind === 'hero') html = this.heroDetail(this.g.state.heroes.find((h) => h.id === s.id));
    else if (s.kind === 'room') html = this.roomDetail(this.g.dungeon.getRoom(s.id));
    else if (s.kind === 'trap') html = this.trapDetail(this.g.state.dungeon.traps.find((t) => t.id === s.id));
    else if (s.kind === 'floor') html = this.floorDetail(this.g.state.floor.find((f) => f.id === s.id));
    if (!html) { this.sel = null; this.r.selected = null; box.classList.add('hidden'); return; }
    const scroll = box.scrollTop;
    const full = `<div class="row"><div class="grow"></div><button class="x" data-act="closeDetail" aria-label="ปิด">×</button></div>${html}`;
    if (full !== this.lastDetail) { box.innerHTML = full; this.lastDetail = full; box.scrollTop = scroll; }
    box.classList.remove('hidden');
  }

  monsterDetail(m) {
    if (!m) return '';
    const g = this.g, sp = speciesInfo(m.species), st = g.monsters.stats(m), cs = g.monsters.combatStats(m);
    const tr = PERSONALITIES[m.trait];
    const pas = g.monsters.passive(m);
    const skills = sp.isBoss ? sp.bossSkills.map((s) => `<span class="${(m.phase || 1) >= s.phase ? '' : 'muted'}">${s.name} (P${s.phase})</span>`).join(', ')
      : [...sp.skills.map((s) => `<span class="${m.level >= s.unlock ? '' : 'muted'}" title="${m.level >= s.unlock ? '' : `ปลดล็อก Lv.${s.unlock}`}">${SKILLS[s.id]?.name}${m.level >= s.unlock ? '' : ` (Lv.${s.unlock})`}</span>`), ...(m.inheritedSkill ? [`<span class="gold-t">${SKILLS[m.inheritedSkill]?.name} (สืบทอด)</span>`] : [])].join(', ');
    const rooms = g.state.dungeon.rooms.filter((r) => r.status === 'active');
    const curA = m.assignment.type === 'guard' ? `guard:${m.assignment.roomId}` : m.assignment.type === 'train' ? `train:${m.assignment.stat}` : m.assignment.type;
    const assignOpts = [
      ...rooms.map((r) => [`guard:${r.id}`, `เฝ้า ${ROOMS[r.type].th}`]),
      ['clean', 'ทำความสะอาด'],
      ...(g.training.rooms().length ? Object.entries(TRAINING_TYPES).map(([k, v]) => [`train:${k}`, v.th]) : []),
      ['rest', 'พักผ่อน'],
    ].map(([v, l]) => `<option value="${v}" ${v === curA ? 'selected' : ''}>${l}</option>`).join('');
    const eq = ['weapon', 'armor', 'accessory'].map((slot) => {
      const it = m.equipment[slot] ? g.state.equipped[m.equipment[slot]] : null;
      const cands = g.inventory.items.filter((i) => ITEMS[i.itemId].slot === slot);
      return `<div class="row" style="margin:3px 0"><span class="muted" style="width:62px">${{ weapon: 'อาวุธ', armor: 'เกราะ', accessory: 'เครื่องประดับ' }[slot]}</span>
        ${it ? `<span class="grow r-${it.rarity}">${ITEMS[it.itemId].name}${it.plus ? ` +${it.plus}` : ''}</span><button class="btn sm" data-act="unequip" data-id="${m.id}" data-v="${slot}">ถอด</button>`
        : cands.length ? `<select class="grow" data-change="equip" data-id="${m.id}" aria-label="สวมใส่"><option value="">— เลือก —</option>${cands.map((c) => `<option value="${c.uid}">${ITEMS[c.itemId].name}${c.plus ? ` +${c.plus}` : ''} (${c.rarity})</option>`).join('')}</select>` : '<span class="muted grow">ว่าง</span>'}</div>`;
    }).join('');
    const evos = g.monsters.evolutionOptions(m).map((id) => {
      const ch = g.monsters.evolutionCheck(m, id);
      return `<div class="card"><div class="row">${this.monIcon(id)}<div class="grow"><div class="name">→ ${MONSTERS[id].name}</div>
        ${ch.reqs.map((r) => `<div class="req"><span class="${r.met ? 'ok' : 'no'}">${r.met ? '✔' : '✘'}</span>${esc(r.label)}</div>`).join('')}</div></div>
        <button class="btn sm gold" data-act="evolve" data-id="${m.id}" data-v="${id}" ${ch.ok ? '' : 'disabled'}>วิวัฒนาการ</button></div>`;
    }).join('');
    const pot = g.inventory.items.filter((i) => ITEMS[i.itemId].use);
    return `<div class="row">${this.monIcon(m.species, 'lg')}<div class="grow"><h2>${esc(m.name)}</h2>
      <div class="sub">${sp.name} · <span class="r-${sp.rarity}">${sp.rarity}</span> · ${ROLE_TH[sp.role]} · ธาตุ${ELEMENT_INFO[sp.element].name} · ${sp.isBoss ? BOSS_TIERS[sp.tier].name : tierOf(m.level).name}</div>
      <div class="sub">Lv.${m.level} · ${m.ko ? '<span class="bad-t">หมดสติ</span>' : AI_TH[m.ai] || m.ai} · กำจัด ${m.kills}</div></div></div>
      ${this.meter('HP', m.hp, st.hp, 'hp')}
      ${m.level < BALANCE.monsters.levelCap ? this.meter('EXP', m.exp, g.monsters.expToNext(m.level), 'exp') : ''}
      ${this.meter('Loyalty', m.loyalty, 100, 'loy')}${this.meter('Fatigue', m.fatigue, 100, 'fat')}${this.meter('Hunger', m.hunger, 100, 'hun')}
      <div class="statgrid" style="margin:8px 0"><div><span>HP</span> ${st.hp}</div><div><span>ATK</span> ${st.atk}</div><div><span>DEF</span> ${st.def}</div>
        <div><span>MATK</span> ${st.matk}</div><div><span>MDEF</span> ${st.mdef}</div><div><span>SPD</span> ${st.spd}</div>
        <div><span>ACC</span> ${st.acc}</div><div><span>EVA</span> ${st.eva}</div><div><span>CRIT</span> ${Math.round(cs.crit * 100)}%</div>
        <div><span>RES</span> ${Math.round(cs.res * 100)}%</div><div><span>MP</span> ${Math.round(m.mp ?? st.mp)}/${st.mp}</div><div><span>RANGE</span> ${st.range}</div></div>
      <dl class="kv">${sp.weak?.length ? `<dt>จุดอ่อน</dt><dd class="bad-t">${sp.weak.map((w) => ELEMENT_INFO[w]?.name || w).join(', ')}</dd>` : ''}${Object.keys(sp.resist || {}).length ? `<dt>ต้านทาน</dt><dd>${Object.entries(sp.resist).map(([k, v]) => `${ELEMENT_INFO[k]?.name} x${v}`).join(', ')}</dd>` : ''}
        ${m.mutations?.length ? `<dt>Mutation</dt><dd class="gold-t">${m.mutations.map((k) => `${MUTATIONS[k].th} (${MUTATIONS[k].name})`).join(', ')}</dd>` : ''}
        <dt>บุคลิก</dt><dd>${tr.th} — ${tr.desc}</dd><dt>สกิล</dt><dd>${skills}</dd><dt>Passive</dt><dd>${pas ? `${pas.name}: ${pas.desc}` : `ปลดล็อก Lv.${BALANCE.monsters.passiveUnlockLevel}`}</dd>
        <dt>Skill Mastery</dt><dd>${(m.skillMastery || 0).toFixed(1)}/${BALANCE.training.skillMasteryMax}</dd>
        ${m.status?.length ? `<dt>สถานะ</dt><dd>${m.status.map((x) => STATUS_INFO[x.id]?.name || x.id).join(', ')}</dd>` : ''}</dl>
      <h3>หน้าที่</h3><select data-change="assign" data-id="${m.id}" style="width:100%" aria-label="หน้าที่">${assignOpts}</select>
      <div class="row" style="margin-top:6px"><span class="muted">ตำแหน่ง</span>
        <button class="btn sm ${m.row === 'front' ? 'on' : ''}" data-act="row" data-id="${m.id}" data-v="front">แถวหน้า</button>
        <button class="btn sm ${m.row === 'back' ? 'on' : ''}" data-act="row" data-id="${m.id}" data-v="back">แถวหลัง</button></div>
      <p class="note">แถวหน้ารับ Aggro ของผู้กล้า แถวหลังรับดาเมจน้อยลง 20% และยืนห่างจากทางเข้า</p>
      <h3>อุปกรณ์</h3>${eq}
      ${pot.length ? `<h3>ใช้ไอเทม</h3><div class="row wrap">${pot.map((p) => `<button class="btn sm" data-act="useOn" data-id="${m.id}" data-v="${p.uid}">${ITEMS[p.itemId].name} x${p.qty}</button>`).join('')}</div>` : ''}
      ${evos ? `<h3>วิวัฒนาการ</h3>${evos}` : ''}
      <div class="row wrap" style="margin-top:12px"><button class="btn sm" data-act="rename" data-id="${m.id}">เปลี่ยนชื่อ</button>
        <button class="btn sm ${m.locked ? 'on' : ''}" data-act="lock" data-id="${m.id}">${m.locked ? 'ปลดล็อก' : 'ล็อก (กันผสม/ปลด)'}</button>
        <button class="btn sm red" data-act="dismiss" data-id="${m.id}" ${m.locked ? 'disabled' : ''}>ปลดออก</button></div>`;
  }

  heroDetail(h) {
    if (!h) return '';
    const c = HERO_CLASSES[h.cls];
    if (h.summon) return `<h2>${esc(h.name)}</h2><p class="note">สัตว์อัญเชิญของผู้กล้า — หายไปเองเมื่อหมดเวลา</p>${this.meter('HP', h.hp, h.stats.hp, 'hp')}`;
    return `<div class="row">${this.heroIcon(h.cls, 'down', 'lg')}<div class="grow"><h2>${esc(h.name)}</h2><div class="sub">${c.name} (${c.th}) · Rank ${h.rank} · Lv.${h.level}</div><div class="sub">${esc(c.role)} · ${c.row === 'front' ? 'แถวหน้า' : 'แถวหลัง'}</div></div></div>
      ${this.meter('HP', h.hp, h.stats.hp, 'hp')}
      ${this.meter('MP', h.mp || 0, h.stats.mp, 'loy')}
      <div class="statgrid" style="margin:8px 0"><div><span>ATK</span> ${Math.round(h.stats.atk)}</div><div><span>MATK</span> ${Math.round(h.stats.matk)}</div><div><span>DEF</span> ${Math.round(h.stats.def)}</div><div><span>MDEF</span> ${Math.round(h.stats.mdef)}</div><div><span>SPD</span> ${Math.round(h.stats.spd)}</div><div><span>CRIT</span> ${Math.round(h.stats.crit * 100)}%</div></div>
      <dl class="kv"><dt>ธาตุ</dt><dd>${ELEMENT_INFO[h.stats.element].name}</dd><dt>จุดอ่อน</dt><dd class="bad-t">${c.weak.map((w) => ELEMENT_INFO[w]?.name || STATUS_INFO[w]?.th || w).join(', ')}</dd>
      <dt>สถานะ</dt><dd>${h.downed ? 'สลบ (รอชุบชีวิต)' : HERO_STATE_TH[h.state] || h.state}</dd><dt>สกิล</dt><dd>${c.skills.map((s) => s.name).join(', ')}</dd><dt>ทองที่พกมา</dt><dd>${h.gold}G</dd>
      <dt>พฤติกรรม</dt><dd>${h.ai.healer ? 'รักษาเพื่อน · ' : ''}${h.ai.reviver ? 'ชุบชีวิต · ' : ''}${h.ai.disarm ? 'ปลดกับดักได้ · ' : ''}${h.ai.greedy ? 'ชอบขโมยสมบัติ · ' : ''}${h.ai.kite ? 'รักษาระยะ · ' : ''}เป้าหมาย: ${{ nearest: 'ใกล้สุด', lowest_hp: 'HP ต่ำ', backline: 'แนวหลัง', caster: 'ผู้ร่ายเวท', strongest: 'ตัวแรงสุด', boss: 'บอส' }[h.ai.target] || h.ai.target} · ถอยเมื่อ HP < ${Math.round(h.ai.retreatAt * 100)}%</dd></dl>`;
  }

  roomDetail(r) {
    if (!r) return '';
    const g = this.g, d = ROOMS[r.type];
    const cost = g.dungeon.upgradeCost(r);
    const cap = g.dungeon.roomCapacity(r);
    const effects = Object.entries(d.effect || {}).map(([k, arr]) => `${{ defBonus: 'DEF โบนัส', restMult: 'ฟื้นตัว', loyaltyPerDay: 'Loyalty/วัน', trainMult: 'ประสิทธิภาพฝึก', workMult: 'ความเร็วทำความสะอาด', boneMult: 'วัตถุดิบจากศพ', goldBonus: 'ทองเพิ่ม', rareBonus: 'ของหายาก', healMult: 'ความเร็วรักษา', foodPerDay: 'อาหาร/วัน', maxTraps: 'กับดักสูงสุด' }[k] || k}: ${arr[r.level - 1]}${r.level < 5 ? ` → ${arr[r.level]}` : ''}`).join('<br>');
    const guards = g.state.monsters.filter((m) => m.assignment.type === 'guard' && m.assignment.roomId === r.id);
    const dirt = g.cleaning.dirtCount(r);
    const lay = g.dungeon.canModifyLayout();
    return `<h2>${d.th}</h2><div class="sub">${d.name} · Lv.${r.level}/5 · ${r.w}x${r.h} · ${r.status === 'active' ? '<span class="good-t">ใช้งานได้</span>' : '<span class="bad-t">ไม่เชื่อมต่อทางเดิน — ใช้งานไม่ได้</span>'}</div>
      <p class="note">${esc(d.desc)}</p>
      <dl class="kv">${cap ? `<dt>ความจุ</dt><dd>${cap}${r.level < 5 && d.capacity ? ` → ${d.capacity[r.level]}` : ''}</dd>` : ''}<dt>ค่าบำรุง</dt><dd>${(d.upkeep || 0) * r.level}/วัน</dd>
      <dt>ความสะอาด</dt><dd>${dirt > BALANCE.cleaning.dirtyThreshold ? `<span class="bad-t">สกปรก (${dirt})</span>` : `สะอาด (${dirt})`}</dd></dl>
      ${effects ? `<p class="note">${effects}</p>` : ''}
      ${guards.length ? `<h3>มอนสเตอร์ที่เฝ้า (${guards.length})</h3><div class="list">${guards.map((m) => `<div class="item" data-act="selMon" data-id="${m.id}">${this.monIcon(m.species)}<div class="grow">${esc(m.name)} <span class="muted">Lv.${m.level} · ${m.row === 'front' ? 'หน้า' : 'หลัง'}</span></div></div>`).join('')}</div>` : r.type === 'guard_room' ? '<p class="note">ยังไม่มีมอนสเตอร์เฝ้าห้องนี้</p>' : ''}
      <div class="row wrap" style="margin-top:10px">
        ${cost != null ? `<button class="btn sm gold" data-act="upRoom" data-id="${r.id}" ${g.state.gold >= cost ? '' : 'disabled'}>อัปเกรด (${fmt(cost)}G)</button>` : '<span class="muted">ระดับสูงสุด</span>'}
        <button class="btn sm" data-act="moveThis" data-id="${r.id}" ${lay.ok ? '' : 'disabled'} title="${esc(lay.reason || '')}">ย้าย</button>
        ${(d.art?.length || 0) > 1 ? `<button class="btn sm" data-act="skin" data-id="${r.id}">เปลี่ยนลวดลาย (${((r.skin || 0) % d.art.length) + 1}/${d.art.length})</button>` : ''}
        ${r.type !== 'core_room' ? `<button class="btn sm red" data-act="demolish" data-id="${r.id}" ${lay.ok ? '' : 'disabled'}>รื้อ</button>` : ''}
      </div>`;
  }

  trapDetail(t) {
    if (!t) return '';
    const g = this.g, d = TRAPS[t.type], max = d.durability + (t.level - 1) * 10;
    return `<h2>${d.name} Lv.${t.level}</h2><dl class="kv"><dt>ดาเมจ</dt><dd>${Math.round(d.damage * Math.pow(BALANCE.traps.upgradeDamageMult, t.level - 1))}</dd><dt>คูลดาวน์</dt><dd>${d.cooldown}s</dd><dt>ธาตุ</dt><dd>${ELEMENT_INFO[d.element].name}</dd><dt>ความทนทาน</dt><dd>${t.durability}/${max}</dd><dt>ค่าบำรุง</dt><dd>${d.upkeep}/วัน</dd></dl>
      <div class="row wrap" style="margin-top:8px"><button class="btn sm" data-act="trapRepair" data-id="${t.id}" ${t.durability >= max ? 'disabled' : ''}>ซ่อม</button>
      <button class="btn sm gold" data-act="trapUpgrade" data-id="${t.id}" ${t.level >= 5 ? 'disabled' : ''}>อัปเกรด (${g.dungeon.trapUpgradeCost(t)}G)</button>
      <button class="btn sm red" data-act="trapRemove" data-id="${t.id}">รื้อ</button></div>`;
  }

  floorDetail(f) {
    if (!f) return '';
    const label = { corpse: 'ศพผู้กล้า', blood: 'คราบเลือด', loot: 'Loot', debris: 'เศษหิน' }[f.type];
    const cleaners = this.g.cleaning.cleaners().length;
    return `<h2>${label}</h2>${f.type === 'loot' ? `<p>${(f.items || []).map((i) => `<span class="r-${i.rarity}">${ITEMS[i.itemId].name} x${i.qty}</span>`).join(', ') || '-'} ${f.gold ? `<span class="gold-t">${f.gold}G</span>` : ''}</p>` : ''}
      <p class="note">${f.claimedBy ? 'มีมอนสเตอร์กำลังมาเก็บ' : cleaners ? 'รอคิวทีมทำความสะอาด' : 'ไม่มีมอนสเตอร์ทำความสะอาด! ตั้งหน้าที่ "ทำความสะอาด" ให้มอนสเตอร์อย่างน้อย 1 ตัว'}</p>`;
  }

  // ================= Modals =================
  modal(html, { pause = true, cls = '' } = {}) {
    const root = $('#modal-root');
    const el = document.createElement('div');
    el.className = `modal win ${cls}`;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = html;
    root.innerHTML = '';
    root.appendChild(el);
    const doPause = pause && this.g?.state.settings.pauseOnModal;
    if (doPause && this.g) this.g.time.modalPause++;
    const close = () => { if (doPause && this.g) this.g.time.modalPause = Math.max(0, this.g.time.modalPause - 1); if (el.parentNode) el.remove(); this.modalStack.pop(); };
    this.modalStack.push(close);
    setTimeout(() => el.querySelector('input, .btn')?.focus(), 30);
    return { el, close };
  }

  confirm(title, text, okLabel = 'ยืนยัน', danger = false) {
    return new Promise((res) => {
      const { el, close } = this.modal(`<h2>${esc(title)}</h2><p>${text}</p><div class="actions"><button class="btn" id="mNo">ยกเลิก</button><button class="btn ${danger ? 'red' : 'gold'}" id="mOk">${esc(okLabel)}</button></div>`);
      el.querySelector('#mNo').onclick = () => { close(); res(false); };
      el.querySelector('#mOk').onclick = () => { close(); res(true); };
    });
  }

  prompt(title, text, def = '', max = 16) {
    return new Promise((res) => {
      const { el, close } = this.modal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><input type="text" id="mIn" maxlength="${max}" value="${esc(def)}" style="width:100%"><div class="actions"><button class="btn" id="mNo">ยกเลิก</button><button class="btn gold" id="mOk">ตกลง</button></div>`);
      const inp = el.querySelector('#mIn');
      const ok = () => { close(); res(inp.value); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') { close(); res(null); } });
      el.querySelector('#mNo').onclick = () => { close(); res(null); };
      el.querySelector('#mOk').onclick = ok;
      setTimeout(() => { inp.focus(); inp.select(); }, 40);
    });
  }

  alert(title, html, label = 'ตกลง') {
    return new Promise((res) => {
      const { el, close } = this.modal(`<h2>${esc(title)}</h2>${html}<div class="actions"><button class="btn gold" id="mOk">${esc(label)}</button></div>`);
      el.querySelector('#mOk').onclick = () => { close(); res(); };
    });
  }

  showEvent() {
    const pe = this.g.state.pendingEvent; if (!pe) return;
    const ev = EVENTS[pe.id];
    const { el, close } = this.modal(`<h2>${esc(ev.th)}</h2><p>${esc(ev.text)}</p><div class="actions col">${ev.choices.map((c, i) => `<button class="btn" data-i="${i}">${esc(c.label)}</button>`).join('')}</div>`);
    el.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { const r = this.g.events.choose(+b.dataset.i); if (r.ok) { close(); this.refresh(true); } }; });
  }

  showRankUp(d) {
    const lv = LEVELS[d.level - 1];
    this.alert(`Dungeon Level ${d.level}!`, `<p class="gold-t" style="font-size:20px">${esc(lv.name)} — ${esc(lv.th)}</p><p>ปลดล็อก:</p><ul>${lv.unlocks.map((u) => `<li>${esc(u)}</li>`).join('')}</ul><p class="note">ผู้กล้าที่แข็งแกร่งขึ้นกำลังมุ่งหน้ามา ขยายพื้นที่ได้กว้างขึ้น</p>`, 'ไปต่อ');
  }

  showDefeat(d) {
    const { el, close } = this.modal(`<h2 class="bad-t">DEFEAT</h2><p>Dungeon Core ถูกทำลายโดย ${esc(d.by || 'ผู้กล้า')}</p>
      <p class="note">เลือกฟื้นฟูดันเจี้ยน (เสียทอง 40% และชื่อเสียง 30%) โหลดเซฟ หรือเริ่มใหม่</p>
      <div class="actions col"><button class="btn gold" id="dRec">ฟื้นฟูดันเจี้ยนแล้วเล่นต่อ</button><button class="btn" id="dLoad">โหลด Auto Save</button><button class="btn red" id="dNew">เริ่มเกมใหม่</button></div>`, { pause: false });
    el.querySelector('#dRec').onclick = () => { close(); this.g.recoverFromDefeat(); this.refresh(true); };
    el.querySelector('#dLoad').onclick = () => { const r = this.g.save.loadSlot('auto'); if (r.ok) { close(); this.app.start(r.data); } else this.flash(r.reason); };
    el.querySelector('#dNew').onclick = () => { close(); this.app.start(null); };
  }

  // ================= Actions =================
  actions = {
    panel(d) { this.openPanel(d.v); },
    closePanel() { this.openPanel(null); },
    closeDetail() { this.select(null); },
    tab(d) { this.tab[d.p] = d.v; },
    speed(d) { this.g.time.setSpeed(+d.v); },
    zoom(d) { this.r.zoomAt(+d.v, this.r.vw / 2, this.r.vh / 2); },
    center() { this.r.centerOnArea(); },
    rotate() { if (this.mode) this.mode.rot = ((this.mode.rot || 0) + 1) % 2; },
    cancelMode() { this.setMode(null); },
    gotoBuild() { this.tab.build = 'rooms'; this.panel = null; this.openPanel('build'); },
    selMon(d) { this.select({ kind: 'monster', id: d.id }); const m = this.g.monsters.get(d.id); if (m && !m.ko) { this.r.cam.x = m.x * 16; this.r.cam.y = m.y * 16; } },
    selRoom(d) { this.select({ kind: 'room', id: d.id }); },
    selTrap(d) { this.select({ kind: 'trap', id: d.id }); },
    async recruit(d) {
      const sp = MONSTERS[d.id];
      const name = await this.prompt(`จ้าง ${sp.name}`, `ตั้งชื่อมอนสเตอร์ (${this.g.monsters.recruitCost(d.id)} Gold)`, `${sp.name}`);
      if (name === null) return;
      const r = this.g.monsters.recruit(d.id, name);
      if (!r.ok) this.flash(r.reason); else { this.g.audio?.play('coin'); this.refresh(true); }
    },
    placeRoom(d) { this.setMode({ type: 'room', roomType: d.id, rot: 0 }); },
    corridor(d) { this.setMode({ type: 'corridor', erase: d.v === '1' }); },
    moveRoom() { this.setMode({ type: 'move', roomId: null, rot: 0 }); },
    moveThis(d) { const r = this.g.dungeon.getRoom(d.id); this.setMode({ type: 'move', roomId: d.id, rot: r.rot }); },
    placeTrap(d) { this.setMode({ type: 'trap', trapType: d.id }); },
    expand(d) { const r = this.g.dungeon.expand(d.v); if (!r.ok) this.flash(r.reason); },
    upRoom(d) { const r = this.g.dungeon.upgradeRoom(d.id); if (!r.ok) this.flash(r.reason); else this.g.audio?.play('build'); },
    async demolish(d) {
      const room = this.g.dungeon.getRoom(d.id); if (!room) return;
      if (!(await this.confirm('รื้อห้อง', `รื้อ ${ROOMS[room.type].th}? จะได้เงินคืน ${Math.floor(ROOMS[room.type].cost * BALANCE.economy.roomRefund)} Gold`, 'รื้อ', true))) return;
      const r = this.g.dungeon.demolishRoom(d.id); if (!r.ok) this.flash(r.reason); else this.select(null);
    },
    trapRepair(d) { const r = this.g.dungeon.repairTrap(d.id); if (!r.ok) this.flash(r.reason); },
    trapUpgrade(d) { const r = this.g.dungeon.upgradeTrap(d.id); if (!r.ok) this.flash(r.reason); },
    trapRemove(d) { const r = this.g.dungeon.removeTrap(d.id); if (!r.ok) this.flash(r.reason); else this.select(null); },
    startTrain(d) {
      const m = this.g.monsters.get(d.id); const type = $(`#tr-${d.id}`)?.value || 'atk';
      const r = this.g.training.start(m, type, true); if (!r.ok) this.flash(r.reason);
    },
    stopTrain(d) { const m = this.g.monsters.get(d.id); this.g.monsters.assign(m, { type: 'guard', roomId: this.g.dungeon.defaultGuardRoom()?.id }); },
    row(d) { this.g.monsters.setRow(this.g.monsters.get(d.id), d.v); },
    unequip(d) { const r = this.g.inventory.unequip(this.g.monsters.get(d.id), d.v); if (!r.ok) this.flash(r.reason); },
    useOn(d) { const r = this.g.inventory.use(d.v, this.g.monsters.get(d.id)); if (!r.ok) this.flash(r.reason); },
    evolve(d) {
      const m = this.g.monsters.get(d.id);
      this.confirm('วิวัฒนาการ', `ให้ ${esc(m.name)} วิวัฒนาการเป็น ${MONSTERS[d.v].name}? ใช้ทองและวัตถุดิบตามเงื่อนไข`, 'วิวัฒนาการ').then((ok) => {
        if (!ok) return; const r = this.g.monsters.evolve(m, d.v); if (!r.ok) this.flash(r.reason); this.refresh(true);
      });
    },
    async rename(d) {
      const m = this.g.monsters.get(d.id);
      const n = await this.prompt('เปลี่ยนชื่อ', 'ชื่อใหม่ (สูงสุด 16 ตัวอักษร)', m.name);
      if (n !== null) { const r = this.g.monsters.rename(d.id, n); if (!r.ok) this.flash(r.reason || 'เปลี่ยนชื่อไม่ได้'); }
      this.refresh(true);
    },
    async dismiss(d) {
      const m = this.g.monsters.get(d.id);
      if (!(await this.confirm('ปลดมอนสเตอร์', `ปลด ${esc(m.name)} (Lv.${m.level}) ออกจากดันเจี้ยนถาวร? อุปกรณ์จะถูกคืนเข้าคลัง`, 'ปลดออก', true))) return;
      this.g.monsters.dismiss(d.id); this.select(null);
    },
    lock(d) { const m = this.g.monsters.get(d.id); if (m) m.locked = !m.locked; },
    skin(d) { const r = this.g.dungeon.getRoom(d.id); if (r) { r.skin = ((r.skin || 0) + 1) % ROOMS[r.type].art.length; this.r.staticVer = -1; } },
    async summonBoss(d) {
      const b = BOSSES[d.id]; const soul = d.v === 'soul';
      if (!(await this.confirm('อัญเชิญบอส', `อัญเชิญ ${esc(b.name)} (${BOSS_TIERS[b.tier].name}) ด้วย ${soul ? `Boss Soul x${b.tier}` : `${fmt(this.g.monsters.bossCost(d.id))} Gold`}? ค่าบำรุง ${BOSS_TIERS[b.tier].upkeep}/วัน`, 'อัญเชิญ'))) return;
      const r = this.g.monsters.summonBoss(d.id, soul); if (!r.ok) this.flash(r.reason);
      this.refresh(true);
    },
    fusionPick(d) { this.fuse ||= {}; this.fuse[d.v] = d.id; },
    async fusionStart() {
      const f = this.fuse || {};
      const chk = this.g.fusion.check(f.a, f.b, !!f.crystal);
      if (!chk.ok) return this.flash(chk.reason);
      const top = chk.preview.results.slice(0, 4).map((r) => `${MONSTERS[r.species].name} ${(r.chance * 100).toFixed(0)}%`).join(', ');
      const rare = [chk.ma, chk.mb].some((m) => ['legendary', 'mythic'].includes(speciesInfo(m.species).rarity));
      const msg = `<b>${esc(chk.ma.name)}</b> (Lv.${chk.ma.level}) และ <b>${esc(chk.mb.name)}</b> (Lv.${chk.mb.level}) จะถูกใช้เป็นวัตถุดิบและหายไปจากทีม<br>ผลลัพธ์ที่เป็นไปได้: ${top}<br>ค่าใช้จ่าย ${fmt(chk.cost)} Gold${rare ? '<br><span class="bad-t">มีมอนสเตอร์ระดับ Legendary/Mythic — ตรวจสอบให้แน่ใจ</span>' : ''}`;
      if (!(await this.confirm('ยืนยัน Fusion', msg, 'เริ่มผสม', true))) return;
      if (rare && !(await this.confirm('ยืนยันอีกครั้ง', 'มอนสเตอร์หายากจะถูกใช้ไป ยืนยันหรือไม่?', 'ยืนยัน', true))) return;
      const r = this.g.fusion.start(f.a, f.b, !!f.crystal);
      if (!r.ok) this.flash(r.reason); else this.fuse = {};
      this.refresh(true);
    },
    invSel(d) { this.invSel = this.invSel === d.id ? null : d.id; },
    invEquip() { const m = this.g.monsters.get($('#invTarget')?.value); if (!m) return this.flash('เลือกมอนสเตอร์'); const r = this.g.inventory.equip(m, this.invSel); if (!r.ok) this.flash(r.reason); else this.invSel = null; },
    invUse() { const m = this.g.monsters.get($('#invTarget')?.value); const r = this.g.inventory.use(this.invSel, m); if (!r.ok) this.flash(r.reason); },
    invUpgrade() { const r = this.g.inventory.upgrade(this.invSel); if (!r.ok) this.flash(r.reason); },
    invSell() { const r = this.g.inventory.sell(this.invSel, 1); if (r.ok) this.g.audio?.play('coin'); if (!this.g.inventory.get(this.invSel)) this.invSel = null; },
    invSellAll() { const r = this.g.inventory.sell(this.invSel); if (r.ok) this.g.audio?.play('coin'); this.invSel = null; },
    sort(d) { this.g.inventory.sort(d.v); },
    craft(d) { const r = this.g.inventory.craft(d.id); if (!r.ok) this.flash(r.reason); },
    buy(d) { const r = this.g.economy.buyItem(d.id); if (!r.ok) this.flash(r.reason); else this.g.audio?.play('coin'); },
    buyFood(d) { const r = this.g.economy.buyFood(+d.v); if (!r.ok) this.flash(r.reason); },
    rankUp() { const r = this.g.progression.rankUp(); if (!r.ok) this.flash(r.reason); },
    async newCode() {
      const r = await this.g.save.newCode();
      if (!r.ok) return this.flash(r.reason);
      const s = await this.g.save.saveToCode(r.code);
      if (!s.ok) return this.flash(s.reason);
      this.alert('บันทึกแล้ว', `<p>รหัสเซฟของคุณคือ</p><p class="gold-t" style="font-size:44px;letter-spacing:10px;text-align:center;margin:8px 0">${s.code}</p><p class="note">${s.cloud ? 'ใช้รหัสนี้โหลดเกมได้จากทุกเครื่อง' : 'บันทึกในเบราว์เซอร์นี้ (ยังไม่ได้ต่อคลาวด์)'} — จดไว้ให้ดี</p>`);
      this.refresh(true);
    },
    async saveCode() {
      const s = await this.g.save.saveToCode(this.g.state.saveCode);
      if (s.ok) this.toast({ text: `บันทึกไปที่รหัส ${s.code} แล้ว${s.cloud ? '' : ' (ในเครื่อง)'}`, kind: 'good', id: Math.random() }); else this.flash(s.reason);
      this.refresh(true);
    },
    async loadCode() {
      const code = normalizeCode($('#loadCodeInput')?.value);
      if (!CODE_RE.test(code)) return this.flash('ใส่รหัส 4 ตัวให้ถูกต้อง');
      if (!(await this.confirm('โหลดเกม', `โหลดเซฟรหัส ${code}? ความคืบหน้าที่ยังไม่บันทึกจะหายไป`, 'โหลด'))) return;
      const r = await this.g.save.loadFromCode(code);
      if (!r.ok) return this.flash(r.reason);
      this.app.start(r.data);
      this.toast({ text: `โหลดรหัส ${code} สำเร็จ`, kind: 'good', id: Math.random() });
    },
    async saveSlot(d) {
      let r = this.g.save.saveSlot(d.v);
      if (!r.ok && r.corrupt) {
        if (!(await this.confirm('ช่องบันทึกเสียหาย', 'ข้อมูลในช่องนี้เสียหาย ต้องการเขียนทับหรือไม่? (ข้อมูลเดิมจะถูกเก็บเป็นสำรอง)', 'เขียนทับ', true))) return;
        r = this.g.save.saveSlot(d.v, { force: true });
      }
      if (r.ok) this.toast({ text: `บันทึกช่อง ${d.v} แล้ว`, kind: 'good', id: Math.random() }); else this.flash(r.reason);
      this.refresh(true);
    },
    async loadSlot(d) {
      if (!(await this.confirm('โหลดเกม', `โหลดช่อง ${d.v === 'auto' ? 'Auto Save' : d.v}? ความคืบหน้าที่ยังไม่บันทึกจะหายไป`, 'โหลด'))) return;
      const r = this.g.save.loadSlot(d.v);
      if (r.ok) return this.app.start(r.data);
      if (r.hasBackup && (await this.confirm('เซฟเสียหาย', `${esc(r.reason)}<br>ต้องการโหลดข้อมูลสำรองก่อนหน้าแทนหรือไม่?`, 'โหลดสำรอง'))) {
        const b = this.g.save.loadBackup(d.v); if (b.ok) return this.app.start(b.data); this.flash(b.reason);
      } else this.flash(r.reason);
    },
    exportSave() {
      const blob = new Blob([this.g.save.exportText()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `dungeon-lord-day${this.g.time.day}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    async newGame() {
      if (!(await this.confirm('เริ่มเกมใหม่', 'ความคืบหน้าที่ยังไม่บันทึกจะหายไป ต้องการเริ่มใหม่หรือไม่?', 'เริ่มใหม่', true))) return;
      this.app.start(null);
    },
  };

  changes = {
    fusionSel(v, d) { this.fuse ||= {}; this.fuse[d.k] = v || null; },
    fusionCrystal(v, d, el) { this.fuse ||= {}; this.fuse.crystal = el.checked; },
    assign(v, d) {
      const m = this.g.monsters.get(d.id); if (!m) return;
      const [type, arg] = v.split(':');
      if (type === 'guard') this.g.monsters.assign(m, { type: 'guard', roomId: arg });
      else if (type === 'train') { const r = this.g.training.start(m, arg, true); if (!r.ok) this.flash(r.reason); }
      else this.g.monsters.assign(m, { type });
    },
    equip(v, d) { if (!v) return; const r = this.g.inventory.equip(this.g.monsters.get(d.id), v); if (!r.ok) this.flash(r.reason); },
    autoFood(v, d, el) { this.g.state.settings.autoBuyFood = el.checked; },
    setting(v, d, el) { this.g.state.settings[d.k] = el.checked; },
    volume(v) { this.g.state.settings.volume = +v; },
    importSave(v, d, el) {
      const f = el.files?.[0]; if (!f) return;
      f.text().then(async (text) => {
        const p = this.g.save.parse(text);
        if (!p.ok) return this.flash(`ไฟล์เซฟใช้ไม่ได้: ${p.errors.join(', ')}`);
        if (await this.confirm('นำเข้าเซฟ', `โหลดเซฟวันที่ ${p.save.day} (Lv.${p.save.dungeonLevel})?`, 'โหลด')) this.app.start(p.save.data);
      });
      el.value = '';
    },
  };
}
