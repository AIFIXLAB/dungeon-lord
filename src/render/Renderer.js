// Renderer — วาดแผนที่ Top-down Pixel Art บน Canvas, กล้อง (pan/zoom), Animation ของยูนิตและเอฟเฟกต์
import { BALANCE } from '../config/balance.js';
import { ROOMS } from '../data/rooms.js';
import { HERO_CLASSES } from '../data/heroes.js';
import { TRAPS, TYPE_COLOR } from '../data/traps.js';
import { ITEMS } from '../data/items.js';
import { ELEMENT_INFO } from '../data/elements.js';
import { STATUS_INFO } from '../data/skills.js';
import { getSprite, shade } from './sprites.js';
import { sprite as atlasSprite, roomImage } from './atlas.js';
import { BOSSES } from '../data/bosses.js';
import { speciesInfo } from '../managers/MonsterManager.js';

const TS = 16;          // pixel ต่อ tile ในโลก
const OX = 5;           // เผื่อพื้นที่นอกทางเข้า (tile)

function hash(x, y) { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setGame(game);
    this.cam = { x: 0, y: 0, zoom: 3 };
    this.time = 0;
    this.overlay = null;  // { type: 'room'|'corridor'|'trap'|'move', ... }
    this.selected = null; // { kind, id }
    this.showPath = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // ปรับขนาด canvas ทุกครั้งที่พื้นที่แผนที่เปลี่ยน (เช่น แถบด้านบนขึ้นบรรทัดใหม่) — กันภาพล้นทับเมนู
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }

  setGame(game) {
    this.game = game;
    this.staticVer = -1;
    this.staticCanvas = null;
    game.bus.on('room_upgraded', () => { this.staticVer = -1; });
    game.bus.on('rank_up', () => { this.staticVer = -1; });
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.floor(r.width * dpr);
    this.canvas.height = Math.floor(r.height * dpr);
    this.canvas.style.width = `${r.width}px`;
    this.canvas.style.height = `${r.height}px`;
    this.vw = r.width; this.vh = r.height;
  }

  centerOnArea() {
    const a = this.game.state.dungeon.area;
    this.cam.x = (a.x + a.w / 2) * TS - 1.5 * TS;
    this.cam.y = (a.y + a.h / 2) * TS;
    const fit = Math.min(this.vw / ((a.w + 6) * TS), (this.vh - 40) / ((a.h + 2) * TS));
    this.cam.zoom = Math.max(1.5, Math.min(5, Math.floor(fit * 2) / 2));
  }

  // ---------- Coordinates ----------
  worldToScreen(wx, wy) {
    return { x: (wx * TS - this.cam.x) * this.cam.zoom + this.vw / 2, y: (wy * TS - this.cam.y) * this.cam.zoom + this.vh / 2 };
  }
  screenToWorld(sx, sy) {
    return { x: ((sx - this.vw / 2) / this.cam.zoom + this.cam.x) / TS, y: ((sy - this.vh / 2) / this.cam.zoom + this.cam.y) / TS };
  }
  pan(dx, dy) { this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom; this.clampCam(); }
  zoomAt(factor, sx, sy) {
    const before = this.screenToWorld(sx, sy);
    this.cam.zoom = Math.max(1, Math.min(7, this.cam.zoom * factor));
    const after = this.screenToWorld(sx, sy);
    this.cam.x += (before.x - after.x) * TS; this.cam.y += (before.y - after.y) * TS;
    this.clampCam();
  }
  clampCam() {
    const W = BALANCE.world.width * TS, H = BALANCE.world.height * TS;
    this.cam.x = Math.max(-OX * TS, Math.min(W, this.cam.x));
    this.cam.y = Math.max(0, Math.min(H, this.cam.y));
  }

  // ---------- Static layer (tiles) ----------
  buildStatic() {
    const g = this.game, dun = g.dungeon;
    const W = BALANCE.world.width, H = BALANCE.world.height;
    const cv = document.createElement('canvas');
    cv.width = (W + OX) * TS; cv.height = H * TS;
    const c = cv.getContext('2d');
    const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    for (let ty = 0; ty < H; ty++) for (let tx = -OX; tx < W; tx++) {
      const X = (tx + OX) * TS, Y = ty * TS;
      const inWorld = tx >= 0;
      const walk = inWorld && dun.walkable(tx, ty);
      if (!walk) {
        // หิน / พื้นที่ยังไม่ปลดล็อก
        const inArea = inWorld && dun.inArea(tx, ty);
        const isPathOutside = !inWorld && ty === g.state.dungeon.entrance.y;
        if (isPathOutside) { this.drawFloorTile(c, X, Y, tx, ty, '#5a5040', true); continue; }
        const base = !inWorld ? '#1e2a1a' : inArea ? '#2a2230' : '#141018';
        px(X, Y, TS, TS, base);
        for (let i = 0; i < 6; i++) {
          const r = hash(tx * 7 + i, ty * 13 + i);
          const col = !inWorld ? (r > 0.5 ? '#2a3a22' : '#18221a') : inArea ? (r > 0.5 ? '#3a3040' : '#221a28') : (r > 0.5 ? '#1c1622' : '#0e0a12');
          px(X + Math.floor(r * 15), Y + Math.floor(hash(ty + i, tx - i) * 15), 2, 1, col);
        }
        // ผนังด้านหน้า (แบบ 3/4) ถ้าข้างล่างเดินได้
        if (inWorld && dun.walkable(tx, ty + 1)) {
          px(X, Y + 6, TS, 10, inArea ? '#5a4a5a' : '#3a3040');
          for (let by = 0; by < 2; by++) for (let bx = 0; bx < 3; bx++) {
            const off = by % 2 ? 3 : 0;
            px(X + bx * 6 - off, Y + 7 + by * 4, 5, 3, inArea ? '#6a5a6a' : '#4a3a4a');
          }
          px(X, Y + 15, TS, 1, '#1a1020');
          px(X, Y + 5, TS, 1, '#7a6a7a');
        }
        if (inWorld && !inArea && dun.inArea(tx, ty) === false) {
          // ลายตารางพื้นที่ล็อก
          if ((tx + ty) % 2 === 0) px(X + 7, Y + 7, 2, 2, '#1a1420');
        }
        continue;
      }
      const room = dun.roomAtTile(tx, ty);
      const col = room ? ROOMS[room.type].color : '#4a4250';
      this.drawFloorTile(c, X, Y, tx, ty, col, !room);
      // ประตู: tile ห้องที่ติดทางเดิน
      if (room) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = tx + dx, ny = ty + dy;
          if (dun.walkable(nx, ny) && dun.roomIdAt(nx, ny) !== room.id) {
            if (dx === -1) px(X, Y + 3, 2, 10, '#8a6a3a');
            if (dx === 1) px(X + 14, Y + 3, 2, 10, '#8a6a3a');
            if (dy === -1) px(X + 3, Y, 10, 2, '#8a6a3a');
            if (dy === 1) px(X + 3, Y + 14, 10, 2, '#8a6a3a');
          }
        }
      }
    }
    for (const r of g.state.dungeon.rooms) r._hasArt = !!(ROOMS[r.type].art?.length && roomImage(ROOMS[r.type].art[(r.skin || 0) % ROOMS[r.type].art.length], () => { this.staticVer = -1; }));
    // ขอบห้อง
    for (const r of g.state.dungeon.rooms) {
      const X = (r.x + OX) * TS, Y = r.y * TS;
      c.strokeStyle = r.status === 'active' ? shade(ROOMS[r.type].color, 0.35) : '#ff4a4a';
      c.lineWidth = 1;
      c.setLineDash(r.status === 'active' ? [] : [3, 2]);
      c.strokeRect(X + 0.5, Y + 0.5, r.w * TS - 1, r.h * TS - 1);
      c.setLineDash([]);
      if (!r._hasArt) this.drawRoomDecor(c, r, X, Y);
    }
    // ทางเข้า
    const e = g.state.dungeon.entrance;
    const EX = (e.x + OX) * TS, EY = e.y * TS;
    px(EX - 2, EY - 4, 3, TS + 6, '#6a5a4a'); px(EX - 2, EY - 6, TS / 2, 3, '#7a6a5a');
    c.fillStyle = '#ffd84a'; c.font = 'bold 6px monospace'; c.fillText('IN', EX - 14, EY - 2);
    // กรอบพื้นที่ที่ปลดล็อก
    const a = g.state.dungeon.area;
    c.strokeStyle = 'rgba(255,216,74,0.25)'; c.setLineDash([4, 3]);
    c.strokeRect((a.x + OX) * TS + 0.5, a.y * TS + 0.5, a.w * TS - 1, a.h * TS - 1);
    c.setLineDash([]);
    this.staticCanvas = cv;
    this.staticVer = dun.version;
  }

  drawFloorTile(c, X, Y, tx, ty, col, corridor) {
    const base = corridor ? col : shade(col, -0.1);
    c.fillStyle = base; c.fillRect(X, Y, TS, TS);
    const r = hash(tx, ty);
    c.fillStyle = shade(base, 0.12);
    if (corridor) {
      c.fillRect(X + 1, Y + 1, 6, 6); c.fillRect(X + 9, Y + 9, 6, 6);
      c.fillStyle = shade(base, -0.15); c.fillRect(X + 9, Y + 1, 6, 6); c.fillRect(X + 1, Y + 9, 6, 6);
    } else {
      c.fillRect(X, Y, TS, 1); c.fillRect(X, Y, 1, TS);
      c.fillStyle = shade(base, -0.2); c.fillRect(X, Y + 15, TS, 1); c.fillRect(X + 15, Y, 1, TS);
    }
    if (r > 0.7) { c.fillStyle = shade(base, -0.25); c.fillRect(X + Math.floor(r * 10) + 2, Y + Math.floor(hash(ty, tx) * 10) + 3, 3, 1); }
  }

  drawRoomDecor(c, r, X, Y) {
    const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(X + x, Y + y, w, h); };
    const W = r.w * TS, H = r.h * TS;
    switch (r.type) {
      case 'barracks':
        for (let i = 0; i < Math.min(3, r.w); i++) { px(4 + i * 16, 3, 9, 12, '#6a4a2a'); px(5 + i * 16, 4, 7, 4, '#c8b8a8'); px(5 + i * 16, 8, 7, 6, '#8a3a3a'); }
        break;
      case 'training_room':
        px(W / 2 - 6, H / 2 - 7, 3, 14, '#8a6a3a'); px(W / 2 - 9, H / 2 - 4, 9, 3, '#8a6a3a');
        px(W - 14, 4, 2, 10, '#5a5a6a'); px(W - 17, 4, 8, 2, '#5a5a6a'); px(W - 17, 12, 8, 2, '#5a5a6a');
        break;
      case 'storage_room':
        for (let i = 0; i < r.w; i++) { px(3 + i * 16, 3, 10, 9, '#7a5a2a'); px(3 + i * 16, 6, 10, 1, '#4a3a1a'); }
        break;
      case 'treasure_room':
        px(W / 2 - 7, H / 2 - 4, 14, 9, '#8a5a1a'); px(W / 2 - 7, H / 2 - 4, 14, 3, '#b8822a'); px(W / 2 - 1, H / 2 - 1, 3, 3, '#ffd84a');
        px(4, H - 8, 5, 3, '#ffd84a'); px(W - 10, 5, 4, 3, '#ffd84a');
        break;
      case 'cleaning_room':
        px(W / 2 - 6, H / 2 - 5, 12, 10, '#1a2a2a'); px(W / 2 - 5, H / 2 - 4, 10, 8, '#2a4a3a');
        break;
      case 'hospital':
        px(4, 4, 10, 7, '#e8e8e8'); px(8, 5, 2, 5, '#d83a3a'); px(6, 7, 6, 1, '#d83a3a');
        break;
      case 'food_farm':
        for (let i = 0; i < 6; i++) { const fx = 4 + (i % 3) * 14, fy = 4 + Math.floor(i / 3) * 14; px(fx, fy + 3, 2, 4, '#c8b88a'); px(fx - 2, fy, 6, 3, '#c84a6a'); }
        break;
      case 'trap_workshop':
        px(4, H / 2 - 3, 18, 6, '#6a5a4a'); px(7, H / 2 - 6, 3, 3, '#c8c8c8'); px(13, H / 2 - 7, 5, 4, '#8a8a9a');
        break;
      case 'guard_room':
        px(3, 3, 2, 2, '#ffaa4a'); px(W - 5, 3, 2, 2, '#ffaa4a'); px(3, 2, 2, 1, '#ffe14a'); px(W - 5, 2, 2, 1, '#ffe14a');
        break;
      default: break;
    }
  }

  // ---------- Frame ----------
  render(dt) {
    this.time += dt;
    const g = this.game, c = this.ctx, z = this.cam.zoom;
    if (this.staticVer !== g.dungeon.version || !this.staticCanvas) this.buildStatic();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#0a0810'; c.fillRect(0, 0, this.vw, this.vh);
    // world transform
    c.save();
    c.translate(this.vw / 2, this.vh / 2);
    c.scale(z, z);
    c.translate(-this.cam.x, -this.cam.y);
    c.drawImage(this.staticCanvas, -OX * TS, 0);
    this.drawRoomArt(c);
    this.drawRoomLabels(c);
    this.drawCore(c);
    this.drawFloor(c);
    this.drawTraps(c);
    if (this.showPath) this.drawDifficultyPath(c);
    this.drawUnits(c);
    this.drawFx(c);
    this.drawOverlay(c);
    c.restore();
    // กลางคืน
    if (g.time.isNight()) { c.fillStyle = 'rgba(20,20,70,0.28)'; c.fillRect(0, 0, this.vw, this.vh); }
    this.drawBossBar(c);
  }

  // วาดภาพห้องที่ความละเอียดหน้าจอจริงทุกเฟรม (ไม่ผ่าน static canvas เพื่อไม่ให้เบลอ)
  drawRoomArt(c) {
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    for (const r of this.game.state.dungeon.rooms) {
      const art = ROOMS[r.type].art; if (!art?.length) continue;
      const img = roomImage(art[(r.skin || 0) % art.length], () => { this.staticVer = -1; });
      if (!img) continue;
      const W = r.w * TS, H = r.h * TS, iw = img.width, ih = img.height;
      const k = Math.max(W / iw, H / ih), sw = W / k, sh = H / k;
      c.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, r.x * TS, r.y * TS, W, H);
      const prop = ROOMS[r.type].prop && atlasSprite(ROOMS[r.type].prop);
      if (prop) { const S = Math.min(W, H) * 0.55; c.drawImage(prop.img, prop.x, prop.y, prop.w, prop.h, r.x * TS + W / 2 - S / 2, r.y * TS + H / 2 - S / 2, S, S * prop.h / prop.w); }
      c.strokeStyle = r.status === 'active' ? 'rgba(232,228,240,0.35)' : '#ff4a4a'; c.lineWidth = 0.6;
      c.strokeRect(r.x * TS + 0.3, r.y * TS + 0.3, W - 0.6, H - 0.6);
    }
    c.imageSmoothingEnabled = false;
  }

  drawRoomLabels(c) {
    if (this.cam.zoom < 2) return;
    c.font = '5px monospace';
    for (const r of this.game.state.dungeon.rooms) {
      const t = `${ROOMS[r.type].name.replace('Monster ', '').replace('Dungeon ', '')} ${r.level}`;
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(r.x * TS + 1, r.y * TS + 1, t.length * 3 + 2, 6);
      c.fillStyle = r.status === 'active' ? '#e8e0c8' : '#ff6a6a';
      c.fillText(t, r.x * TS + 2, r.y * TS + 6);
    }
  }

  drawCore(c) {
    const g = this.game;
    const p = g.dungeon.corePos();
    const X = p.x * TS, Y = p.y * TS;
    const pulse = Math.sin(this.time * 3) * 0.5 + 0.5;
    const hpR = g.state.core.hp / g.state.core.maxHp;
    // aura
    c.fillStyle = `rgba(200,100,255,${0.12 + pulse * 0.12})`;
    c.beginPath(); c.arc(X, Y, 10 + pulse * 3, 0, Math.PI * 2); c.fill();
    // pedestal
    c.fillStyle = '#3a2a4a'; c.fillRect(X - 7, Y + 3, 14, 5); c.fillStyle = '#5a4a6a'; c.fillRect(X - 6, Y + 3, 12, 2);
    // crystal
    const bob = Math.round(Math.sin(this.time * 2) * 1.5);
    const col = g.state.core.hitFlash > 0 ? '#ffffff' : hpR > 0.5 ? '#c86aff' : hpR > 0.25 ? '#ff6ac8' : '#ff3a3a';
    c.fillStyle = '#1a1020';
    c.beginPath(); c.moveTo(X, Y - 13 + bob); c.lineTo(X + 6, Y - 4 + bob); c.lineTo(X, Y + 3 + bob); c.lineTo(X - 6, Y - 4 + bob); c.closePath(); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.moveTo(X, Y - 12 + bob); c.lineTo(X + 5, Y - 4 + bob); c.lineTo(X, Y + 2 + bob); c.lineTo(X - 5, Y - 4 + bob); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(X - 2, Y - 9 + bob, 2, 4);
    // HP bar
    c.fillStyle = '#000'; c.fillRect(X - 10, Y + 10, 20, 3);
    c.fillStyle = hpR > 0.5 ? '#c86aff' : '#ff3a3a'; c.fillRect(X - 10, Y + 10, 20 * hpR, 3);
  }

  drawFloor(c) {
    for (const o of this.game.state.floor) {
      const X = Math.round(o.x * TS), Y = Math.round(o.y * TS);
      const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(X + x, Y + y, w, h); };
      if (o.type === 'blood') {
        px(-3, -1, 4, 2, '#8a1010'); px(0, 0, 3, 3, '#a81a1a'); if (o.variant) px(-5, 2, 2, 1, '#8a1010'); px(2, -3, 1, 1, '#a81a1a');
      } else if (o.type === 'corpse') {
        const a = atlasSprite(`hero_${o.cls}_down`);
        if (a) {
          const H = 18, W = a.w * H / a.h;
          c.save(); c.translate(X, Y); c.rotate(Math.PI / 2); c.globalAlpha = 0.8; c.filter = 'grayscale(0.6) brightness(0.7)';
          c.imageSmoothingEnabled = true; c.drawImage(a.img, a.x, a.y, a.w, a.h, -W / 2, -H / 2, W, H);
          c.restore(); c.imageSmoothingEnabled = false;
        } else { px(-6, -2, 12, 4, '#1a1020'); px(-5, -1, 7, 3, '#555'); px(2, -2, 4, 4, '#a8a090'); }
        px(-7, 2, 3, 1, '#6a1010');
      } else if (o.type === 'loot') {
        const sparkle = Math.sin(this.time * 6 + o.x * 3) > 0.6;
        const top = (o.items || [])[0];
        const a = top && atlasSprite(ITEMS[top.itemId]?.icon);
        if (a) { c.imageSmoothingEnabled = true; const S = 9; c.drawImage(a.img, a.x, a.y, a.w, a.h, X - S / 2, Y - S / 2 - 1, S, S * a.h / a.w); c.imageSmoothingEnabled = false; }
        else { px(-3, -2, 7, 6, '#1a1020'); px(-2, -1, 5, 4, '#b8822a'); px(-2, -1, 5, 1, '#e8b84a'); }
        if (sparkle) px(3, -5, 1, 1, '#ffffff');
      } else if (o.type === 'debris') {
        px(-4, -1, 4, 3, '#5a5060'); px(0, 0, 3, 3, '#6a6070'); px(-1, -3, 3, 2, '#4a4050');
      }
      if (o.claimedBy) { px(-1, -7, 2, 2, '#7affc8'); }
    }
  }

  drawTraps(c) {
    const g = this.game;
    // field (พื้นที่ดาเมจต่อเนื่อง)
    for (const f of g.traps?.fields || []) {
      const a = Math.min(1, f.t) * (0.25 + Math.sin(this.time * 10) * 0.06);
      c.fillStyle = hexA(f.color, a); c.beginPath(); c.arc(f.x * TS, f.y * TS, f.r * TS, 0, Math.PI * 2); c.fill();
      c.strokeStyle = hexA(f.color, 0.7); c.lineWidth = 0.8; c.stroke();
    }
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    for (const t of g.state.dungeon.traps) {
      const X = t.x * TS, Y = t.y * TS, d = TRAPS[t.type]; if (!d) continue;
      const broken = t.durability <= 0;
      const a = atlasSprite(d.icon);
      const fired = t.fired > 0;
      const S = TS * (fired ? 1.25 : 1.1);
      if (a) {
        if (broken) c.filter = 'grayscale(1) brightness(0.6)';
        c.drawImage(a.img, a.x, a.y, a.w, a.h, X + TS / 2 - S / 2, Y + TS / 2 - S / 2 - (fired ? 1 : 0), S, S * a.h / a.w);
        c.filter = 'none';
      } else { c.fillStyle = TYPE_COLOR[d.type]; c.fillRect(X + 4, Y + 4, 8, 8); }
      if (fired) { c.fillStyle = hexA(TYPE_COLOR[d.type], 0.35); c.beginPath(); c.arc(X + TS / 2, Y + TS / 2, TS * 0.8, 0, Math.PI * 2); c.fill(); }
      if (t.level > 1) { c.fillStyle = '#000'; c.fillRect(X + 11, Y + 1, 5, 6); c.fillStyle = '#ffd84a'; c.font = 'bold 5px monospace'; c.fillText(`${t.level}`, X + 12, Y + 6); }
    }
    c.imageSmoothingEnabled = false;
  }

  drawDifficultyPath(c) {
    const ev = this.game.dungeon.evaluateDifficulty();
    if (!ev.path) return;
    c.fillStyle = 'rgba(255,216,74,0.5)';
    for (let i = 0; i < ev.path.length; i++) {
      if ((i + Math.floor(this.time * 4)) % 3) continue;
      const p = ev.path[i]; c.fillRect(p.x * TS - 1, p.y * TS - 1, 2, 2);
    }
  }

  unitSprite(u) {
    let id, h = 18, scale = 1;
    if (u.side === 'monster') { const sp = speciesInfo(u.species); id = sp.sprite; scale = sp.scale || 1; h = sp.isBoss ? 20 : 17; if (u.temp) scale *= 0.85; }
    else if (u.summon) { id = u.sprite; h = 16; scale = 1; }
    else { const d = u.dir || 'down'; id = `hero_${u.cls}_${d === 'right' ? 'left' : d}`; h = 22; }
    const as = atlasSprite(id);
    if (as) return { atlas: as, H: h * scale, scale, mirror: u.side === 'hero' && !u.summon && u.dir === 'right' };
    return this.fallbackSprite(u);
  }

  fallbackSprite(u) {
    if (u.side === 'monster') {
      return { img: getSprite('slime', { a: '#4fc3ff' }), flash: getSprite('slime', {}, null, 'white'), scale: 1 };
    }
    const pal = { a: '#4a6ab8', b: '#2a3a7a', h: '#7a4a2a', m: '#c8c8d0' };
    return { img: getSprite('hero', pal), flash: getSprite('hero', pal, null, 'white'), scale: 1 };
  }

  drawUnits(c) {
    const g = this.game;
    const units = [];
    for (const m of g.state.monsters) {
      if (m.ko && m.ko.fade <= 0) { units.push({ u: m, ko: true }); continue; }
      units.push({ u: m });
    }
    for (const m of g.state.summons || []) if (!m.dead) units.push({ u: m });
    for (const h of g.state.heroes) if (!h.dead) units.push({ u: h });
    units.sort((a, b) => a.u.y - b.u.y);
    for (const { u, ko } of units) this.drawUnit(c, u, ko);
  }

  drawUnit(c, u, ko) {
    const g = this.game;
    // ทิศทาง 4 ทิศจากการเคลื่อนที่
    if (u._lx != null && u.moving) {
      const dx = u.x - u._lx, dy = u.y - u._ly;
      if (Math.abs(dx) + Math.abs(dy) > 0.002) u.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    }
    u._lx = u.x; u._ly = u.y;
    const spr = this.unitSprite(u);
    if (spr.atlas) return this.drawAtlasUnit(c, u, ko, spr);
    const { img, flash, scale, weapon, metal } = spr;
    const S = 16 * scale;
    let X = u.x * TS, Y = u.y * TS;
    const t = this.time + (u.id.charCodeAt(1) || 0);
    // Animation offsets
    let bob = 0, sq = 1;
    if (ko) {
      c.globalAlpha = 0.55;
      c.save(); c.translate(X, Y + 2); c.rotate(Math.PI / 2); c.drawImage(img, -S / 2, -S / 2 - 2, S, S); c.restore();
      c.globalAlpha = 1;
      c.fillStyle = '#c8d8ff'; c.font = '5px monospace'; c.fillText('z', X + 4, Y - 4 - (Math.floor(t * 2) % 3) * 2);
      return;
    }
    if (u.moving) { bob = Math.abs(Math.sin(t * 10)) * -1.5; sq = 1 + Math.sin(t * 20) * 0.04; }
    else { bob = Math.sin(t * 2.5) * 0.5; }
    if (u.ai === 'training') bob = -Math.abs(Math.sin(t * 6)) * 3;
    if (u.ai === 'rest') bob = 0;
    if (u.side === 'monster' && u.ko && u.ko.fade > 0) c.globalAlpha = u.ko.fade / 0.6;
    const lunge = u.lunge > 0 ? (u.facing || 1) * 3 * Math.sin((u.lunge / 0.2) * Math.PI) : 0;
    X += lunge;
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.ellipse(X, Y + 5, 5 * scale, 2 * scale, 0, 0, Math.PI * 2); c.fill();
    // selection ring
    if (this.selected && this.selected.id === u.id) {
      c.strokeStyle = '#ffd84a'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(X, Y + 5, 7 * scale, 3 * scale, 0, 0, Math.PI * 2); c.stroke();
    }
    // evolution glow
    if (u.evolveFx > 0) {
      c.fillStyle = `rgba(255,140,255,${u.evolveFx / 1.5 * 0.6})`;
      c.beginPath(); c.arc(X, Y - 4, 12 * scale, 0, Math.PI * 2); c.fill();
    }
    // sprite
    c.save();
    c.translate(Math.round(X), Math.round(Y + bob));
    c.scale((u.facing || 1) < 0 ? -1 : 1, 1);
    const dy = -S + 6;
    c.drawImage(img, -S / 2, dy * sq, S, S * sq);
    if (weapon) this.drawWeapon(c, weapon, metal, u);
    if (u.hitFlash > 0) { c.globalAlpha = 0.8; c.drawImage(flash, -S / 2, dy * sq, S, S * sq); c.globalAlpha = 1; }
    if (u.casting > 0) { c.fillStyle = 'rgba(200,170,255,0.6)'; c.fillRect(-S / 2 - 1, dy - 2, S + 2, 1); }
    c.restore();
    c.globalAlpha = 1;
    // HP bar
    const st = g.combat.stats(u);
    const hpR = Math.max(0, u.hp / st.hp);
    const inFight = u.side === 'hero' || u.ai === 'fight' || hpR < 1;
    if (inFight) {
      const bw = 12 * Math.max(1, scale * 0.9);
      c.fillStyle = '#000'; c.fillRect(X - bw / 2 - 0.5, Y - S + 3.5, bw + 1, 2.5);
      c.fillStyle = u.side === 'hero' ? '#ff4a4a' : hpR > 0.5 ? '#4aff6a' : hpR > 0.25 ? '#ffd84a' : '#ff6a3a';
      c.fillRect(X - bw / 2, Y - S + 4, bw * hpR, 1.5);
    }
    // Rank badge (ผู้กล้า)
    if (u.side === 'hero') {
      c.font = 'bold 5px monospace';
      c.fillStyle = '#000'; c.fillRect(X - 9, Y - S + 1, u.rank.length * 3 + 2, 6);
      c.fillStyle = '#ffd84a'; c.fillText(u.rank, X - 8, Y - S + 6);
      if (u.state === 'retreat') { c.fillStyle = '#ffcc4a'; c.fillText('!', X + 6, Y - S + 6); }
    } else {
      if (u.level > 1 && this.cam.zoom >= 2.5) { c.font = '4px monospace'; c.fillStyle = '#e8e0c8'; c.fillText(`${u.level}`, X + 5, Y - S + 7); }
      if (u.carrying?.length) { c.fillStyle = '#b8822a'; c.fillRect(X + 3, Y - 6, 4, 3); }
      if (u.ai === 'cleaning') { c.fillStyle = '#8ae8ff'; c.fillRect(X - 6 + Math.sin(t * 15) * 2, Y + 2, 2, 1); }
      if (u.ai === 'rest') { c.fillStyle = '#c8d8ff'; c.font = '5px monospace'; c.fillText('z', X + 4, Y - S + 4 - (Math.floor(t * 2) % 3) * 2); }
      if (u.ai === 'training' && Math.floor(t * 3) % 2) { c.fillStyle = '#8affc8'; c.fillRect(X - 6, Y - S + 3, 1, 2); }
    }
    // Status icons
    if (u.status?.length) {
      let i = 0;
      for (const s of u.status) { c.fillStyle = STATUS_INFO[s.id]?.color || '#fff'; c.fillRect(X - 6 + i * 3, Y - S + 1, 2, 2); i++; }
    }
  }

  drawAtlasUnit(c, u, ko, spr) {
    const g = this.game;
    const a = spr.atlas;
    const S = spr.H, k = u.side === 'hero' && !u.summon ? S / a.h : S / Math.max(a.w, a.h) * (a.h >= a.w ? 1.15 : 1.05);
    const H = a.h * k, W = a.w * k;
    let X = u.x * TS, Y = u.y * TS;
    const t = this.time + (u.id.charCodeAt(1) || 0);
    const devScale = k * this.cam.zoom * this.dpr;
    c.imageSmoothingEnabled = devScale < 1; c.imageSmoothingQuality = 'high';
    if (ko) {
      c.globalAlpha = 0.5;
      c.save(); c.translate(X, Y + 2); c.rotate(Math.PI / 2); c.drawImage(a.img, a.x, a.y, a.w, a.h, -W / 2, -H / 2, W, H); c.restore();
      c.globalAlpha = 1; c.imageSmoothingEnabled = false;
      c.fillStyle = '#c8d8ff'; c.font = '5px monospace'; c.fillText('z', X + 4, Y - 4 - (Math.floor(t * 2) % 3) * 2);
      return;
    }
    let bob = 0;
    if (u.moving) bob = Math.abs(Math.sin(t * 10)) * -1.4; else bob = Math.sin(t * 2.5) * 0.4;
    if (u.ai === 'training') bob = -Math.abs(Math.sin(t * 6)) * 3;
    if (u.side === 'monster' && u.ko && u.ko.fade > 0) c.globalAlpha = u.ko.fade / 0.6;
    if (u.downed) c.globalAlpha = 0.45;
    if (g.combat.hasStatus(u, 'stealth')) c.globalAlpha = Math.min(c.globalAlpha, 0.35);
    const lunge = u.lunge > 0 ? (u.facing || 1) * 3 * Math.sin((u.lunge / 0.2) * Math.PI) : 0;
    X += lunge;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.ellipse(X, Y + 4, Math.max(4, W * 0.35), Math.max(1.6, W * 0.12), 0, 0, Math.PI * 2); c.fill();
    if (this.selected && this.selected.id === u.id) {
      c.strokeStyle = '#ffd84a'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(X, Y + 4, Math.max(6, W * 0.45), Math.max(2.5, W * 0.16), 0, 0, Math.PI * 2); c.stroke();
    }
    if (u.evolveFx > 0) { c.fillStyle = `rgba(255,140,255,${u.evolveFx / 1.5 * 0.6})`; c.beginPath(); c.arc(X, Y - H / 2, H * 0.7, 0, Math.PI * 2); c.fill(); }
    if (u.isBoss && u.phase >= 2) { c.fillStyle = `rgba(255,60,60,${0.12 + Math.sin(t * 6) * 0.06})`; c.beginPath(); c.arc(X, Y - H / 2, H * 0.65, 0, Math.PI * 2); c.fill(); }
    c.save();
    c.translate(Math.round(X), Math.round(Y + bob));
    const flip = spr.mirror || (u.side === 'monster' && (u.facing || 1) > 0);
    if (flip) c.scale(-1, 1);
    c.drawImage(a.img, a.x, a.y, a.w, a.h, -W / 2, -H + 5, W, H);
    if (u.hitFlash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55; c.drawImage(a.img, a.x, a.y, a.w, a.h, -W / 2, -H + 5, W, H); c.globalCompositeOperation = 'source-over'; }
    c.restore();
    c.globalAlpha = 1;
    c.imageSmoothingEnabled = false;
    // HP / MP
    const st = g.combat.stats(u);
    const hpR = Math.max(0, u.hp / st.hp);
    if (!u.isBoss && (u.side === 'hero' || u.ai === 'fight' || hpR < 1)) {
      const bw = Math.max(12, W * 0.7);
      const top = Y - H + 3;
      c.fillStyle = '#000'; c.fillRect(X - bw / 2 - 0.5, top - 0.5, bw + 1, 2.5);
      c.fillStyle = u.side === 'hero' ? '#ff4a4a' : hpR > 0.5 ? '#4aff6a' : hpR > 0.25 ? '#ffd84a' : '#ff6a3a';
      c.fillRect(X - bw / 2, top, bw * hpR, 1.5);
    }
    if (u.side === 'hero' && !u.summon) {
      c.font = 'bold 5px monospace';
      c.fillStyle = '#000'; c.fillRect(X - 10, Y - H, u.rank.length * 3 + 2, 6);
      c.fillStyle = '#ffd84a'; c.fillText(u.rank, X - 9, Y - H + 5);
      if (u.state === 'retreat') { c.fillStyle = '#ffcc4a'; c.fillText('!', X + 6, Y - H + 5); }
    } else if (u.side === 'monster') {
      if (u.level > 1 && this.cam.zoom >= 2.5 && !u.isBoss) { c.font = '4px monospace'; c.fillStyle = '#e8e0c8'; c.fillText(`${u.level}`, X + W * 0.3, Y - H + 8); }
      if (u.carrying?.length) { c.fillStyle = '#b8822a'; c.fillRect(X + 3, Y - 6, 4, 3); }
      if (u.ai === 'cleaning') { c.fillStyle = '#8ae8ff'; c.fillRect(X - 6 + Math.sin(t * 15) * 2, Y + 2, 2, 1); }
      if (u.ai === 'rest') { c.fillStyle = '#c8d8ff'; c.font = '5px monospace'; c.fillText('z', X + 4, Y - H + 6 - (Math.floor(t * 2) % 3) * 2); }
      if (u.locked) { c.fillStyle = '#ffd84a'; c.fillRect(X - W * 0.35, Y - H + 6, 2, 2); }
    }
    if (u.status?.length) {
      let i = 0;
      for (const s of u.status) { c.fillStyle = STATUS_INFO[s.id]?.color || '#fff'; c.fillRect(X - 6 + i * 3, Y - H, 2, 2); i++; }
    }
  }

  drawBossBar(c) {
    const g = this.game;
    const b = [...g.state.monsters].find((m) => m.isBoss && !m.ko && (m.ai === 'fight' || m.hp < g.monsters.stats(m).hp));
    if (!b) return;
    const st = g.monsters.stats(b);
    const w = Math.min(420, this.vw - 120), x = (this.vw - w) / 2, y = 48;
    c.fillStyle = 'rgba(10,8,30,0.85)'; c.fillRect(x - 6, y - 18, w + 12, 30);
    c.strokeStyle = '#e8e4f0'; c.lineWidth = 1; c.strokeRect(x - 6.5, y - 18.5, w + 13, 31);
    c.font = '600 12px "Pixelify Sans", "Mitr", sans-serif'; c.fillStyle = '#ffd84a';
    c.fillText(`${b.name}  Lv.${b.level}  ·  Phase ${b.phase || 1}${b.enraged ? '  · ENRAGED' : ''}`, x, y - 5);
    c.fillStyle = '#000'; c.fillRect(x, y, w, 7);
    const r = Math.max(0, b.hp / st.hp);
    c.fillStyle = r > 0.6 ? '#c86aff' : r > 0.25 ? '#ff8a3a' : '#ff3a4a'; c.fillRect(x, y, w * r, 7);
    for (const th of [BALANCE.boss.phase2, BALANCE.boss.phase3]) { c.fillStyle = '#fff'; c.fillRect(x + w * th, y - 1, 1, 9); }
  }

  drawWeapon(c, weapon, metal, u) {
    const atk = u.lunge > 0 ? -2 : 0;
    const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    switch (weapon) {
      case 'sword': px(5, -9 + atk, 1, 7, metal); px(4, -3, 3, 1, '#8a6a3a'); break;
      case 'sword_shield': px(5, -9 + atk, 1, 7, metal); px(4, -3, 3, 1, '#8a6a3a'); px(-8, -7, 4, 6, '#8a6a3a'); px(-7, -6, 2, 4, metal); break;
      case 'staff': px(5, -12, 1, 12, '#8a5a2a'); px(4, -13, 3, 2, metal); break;
      case 'dagger': px(5, -6 + atk, 1, 4, metal); break;
      case 'bow': px(5, -10, 1, 9, '#8a5a2a'); px(6, -10, 1, 1, '#8a5a2a'); px(6, -2, 1, 1, '#8a5a2a'); px(4, -6, 1, 1, '#e8e8e8'); break;
      case 'axe': px(5, -10 + atk, 1, 9, '#8a5a2a'); px(6, -10 + atk, 3, 4, metal); break;
      case 'greatsword': px(5, -13 + atk, 2, 11, metal); px(3, -3, 6, 1, '#e8c84a'); break;
      default: break;
    }
  }

  drawFx(c) {
    const fx = this.game.combat.fx;
    for (const f of fx) {
      const k = 1 - f.t / f.max;
      if (f.type === 'text') {
        c.font = f.big ? 'bold 7px monospace' : 'bold 6px monospace';
        const y = f.y * TS - k * 10;
        c.globalAlpha = Math.min(1, f.t / f.max * 2);
        c.fillStyle = '#000'; c.fillText(f.txt, f.x * TS - f.txt.length * 1.6 + 0.5, y + 0.5);
        c.fillStyle = f.color; c.fillText(f.txt, f.x * TS - f.txt.length * 1.6, y);
        c.globalAlpha = 1;
      } else if (f.type === 'proj') {
        const x = (f.x + (f.tx - f.x) * k) * TS, y = (f.y + (f.ty - f.y) * k) * TS - 6;
        c.fillStyle = f.kind === 'arrow' ? '#e8d8a8' : (ELEMENT_INFO[f.kind]?.color || '#c8a8ff');
        const s = f.big ? 4 : 2;
        c.fillRect(x - s / 2, y - s / 2, s, s);
      } else if (f.type === 'slash') {
        c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = f.big ? 2 : 1;
        c.beginPath(); c.arc(f.x * TS, f.y * TS - 6, 5 + k * 3, -1 + f.dir, 0.8 + f.dir); c.stroke();
      } else if (f.type === 'burst') {
        const col = f.kind === 'heal' ? '106,255,138' : f.kind === 'buff' ? '255,216,74' : f.kind === 'evolve' ? '255,140,255' : f.kind === 'trap' ? '200,200,200' : hexToRgb(ELEMENT_INFO[f.kind]?.color || '#c8a8ff');
        c.strokeStyle = `rgba(${col},${1 - k})`; c.lineWidth = 1.5;
        c.beginPath(); c.arc(f.x * TS, f.y * TS - 3, f.r * TS * (0.4 + k * 0.6), 0, Math.PI * 2); c.stroke();
        c.fillStyle = `rgba(${col},${(1 - k) * 0.25})`; c.fill();
      }
    }
  }

  drawOverlay(c) {
    const o = this.overlay; if (!o || o.tx == null) return;
    const g = this.game;
    if (o.type === 'room' || o.type === 'move') {
      const type = o.type === 'move' ? g.dungeon.getRoom(o.roomId)?.type : o.roomType;
      if (!type) return;
      const [w, h] = g.dungeon.roomDims(type, o.rot || 0);
      const chk = o.type === 'move' ? g.dungeon.canPlaceRoom(type, o.tx, o.ty, o.rot || 0, o.roomId) : g.dungeon.canPlaceRoom(type, o.tx, o.ty, o.rot || 0);
      c.fillStyle = chk.ok ? (chk.connected ? 'rgba(80,255,120,0.35)' : 'rgba(255,216,74,0.35)') : 'rgba(255,60,60,0.35)';
      c.fillRect(o.tx * TS, o.ty * TS, w * TS, h * TS);
      c.strokeStyle = chk.ok ? '#6aff8a' : '#ff4a4a'; c.lineWidth = 1;
      c.strokeRect(o.tx * TS + 0.5, o.ty * TS + 0.5, w * TS - 1, h * TS - 1);
      if (!chk.ok || !chk.connected) {
        c.font = '5px monospace'; c.fillStyle = '#000'; c.fillRect(o.tx * TS, o.ty * TS - 8, 80, 7);
        c.fillStyle = '#fff'; c.fillText(chk.ok ? 'ยังไม่เชื่อมทางเดิน' : chk.reason, o.tx * TS + 1, o.ty * TS - 3);
      }
    } else if (o.type === 'corridor') {
      const ok = o.erase ? g.state.dungeon.corridors.includes(`${o.tx},${o.ty}`) : g.dungeon.canPlaceCorridor(o.tx, o.ty).ok;
      c.fillStyle = ok ? (o.erase ? 'rgba(255,120,60,0.45)' : 'rgba(80,255,120,0.4)') : 'rgba(255,60,60,0.3)';
      c.fillRect(o.tx * TS, o.ty * TS, TS, TS);
    } else if (o.type === 'trap') {
      const ok = (o.moveId ? g.dungeon.canPlaceTrap(g.state.dungeon.traps.find((t) => t.id === o.moveId)?.type, o.tx, o.ty, o.moveId) : g.dungeon.canPlaceTrap(o.trapType, o.tx, o.ty)).ok;
      c.fillStyle = ok ? 'rgba(80,255,120,0.4)' : 'rgba(255,60,60,0.3)';
      c.fillRect(o.tx * TS, o.ty * TS, TS, TS);
      const r = TRAPS[o.trapType].range;
      c.strokeStyle = 'rgba(255,216,74,0.5)'; c.beginPath(); c.arc((o.tx + 0.5) * TS, (o.ty + 0.5) * TS, r * TS, 0, Math.PI * 2); c.stroke();
    }
  }
}

function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
export { TS, OX };
