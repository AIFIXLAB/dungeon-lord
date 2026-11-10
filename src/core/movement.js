// การเดินตามเส้นทาง A* (ใช้ร่วมกันทั้งมอนสเตอร์และผู้กล้า)
export function moveToward(game, u, tx, ty, dt, speed, costFn = null) {
  const key = `${Math.floor(tx)},${Math.floor(ty)}`;
  const dun = game.dungeon;
  if (!u.path || u.pathKey !== key || u.pathVer !== dun.version) {
    u.path = dun.findPath(u.x, u.y, tx, ty, costFn);
    u.pathKey = key; u.pathVer = dun.version;
    if (!u.path) { u.moving = false; return 'blocked'; }
  }
  let remain = speed * dt;
  u.moving = true;
  while (remain > 0 && u.path.length) {
    const n = u.path[0];
    const dx = n.x - u.x, dy = n.y - u.y, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.01) u.facing = dx < 0 ? -1 : 1;
    if (d <= remain) { u.x = n.x; u.y = n.y; remain -= d; u.path.shift(); }
    else { u.x += (dx / d) * remain; u.y += (dy / d) * remain; remain = 0; }
  }
  if (!u.path.length) {
    const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
    if (d < 0.08) { u.moving = false; return 'arrived'; }
    const step = Math.min(d, remain || speed * dt);
    u.x += (dx / d) * step; u.y += (dy / d) * step;
    if (Math.abs(dx) > 0.01) u.facing = dx < 0 ? -1 : 1;
    return d - step < 0.08 ? 'arrived' : 'moving';
  }
  return 'moving';
}

export function clearPath(u) { u.path = null; u.pathKey = null; }
