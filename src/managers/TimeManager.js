// TimeManager — เวลาในเกม Day/Night/Hour/Minute, Pause/Play/Fast Forward (GDD §29)
import { BALANCE } from '../config/balance.js';
import { hourOf, dayOf } from '../core/util.js';

export class TimeManager {
  constructor(game) { this.game = game; this.modalPause = 0; }
  get minutes() { return this.game.state.time; }
  get day() { return dayOf(this.game.state.time); }
  get hour() { return hourOf(this.game.state.time); }
  isNight() { const h = this.hour; return h >= BALANCE.time.nightStartHour || h < BALANCE.time.dayStartHour; }
  get speed() { return this.modalPause > 0 ? 0 : this.game.state.settings.speed; }
  setSpeed(i) { const s = BALANCE.time.speeds; if (s.includes(i)) this.game.state.settings.speed = i; }

  // คืนค่า dt ที่ปรับตามความเร็ว และส่ง event รายชั่วโมง/รายวัน
  advance(realDt) {
    const s = this.game.state;
    const dt = realDt * this.speed;
    if (dt <= 0) return 0;
    const before = s.time;
    s.time += dt * BALANCE.time.gameMinutesPerSecond;
    const hBefore = Math.floor(before / 60), hAfter = Math.floor(s.time / 60);
    for (let h = hBefore + 1; h <= hAfter; h++) {
      this.game.bus.emit('hour', h % 24);
      if (h % 24 === 0) this.game.bus.emit('day', Math.floor(h / 24) + 1);
    }
    return dt;
  }
}
