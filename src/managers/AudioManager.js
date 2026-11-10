// AudioManager — เสียงเอฟเฟกต์ 8-bit สังเคราะห์ด้วย WebAudio (ไม่ต้องใช้ไฟล์เสียง)
const SFX = {
  hit: [[220, 0.05, 'square', 0.08]],
  shoot: [[660, 0.04, 'triangle', 0.06], [440, 0.04, 'triangle', 0.05]],
  skill: [[523, 0.06, 'square', 0.06], [784, 0.08, 'square', 0.05]],
  kill: [[392, 0.07, 'square', 0.08], [523, 0.07, 'square', 0.08], [784, 0.12, 'square', 0.07]],
  ko: [[300, 0.1, 'sawtooth', 0.07], [180, 0.2, 'sawtooth', 0.06]],
  levelup: [[523, 0.08, 'square', 0.07], [659, 0.08, 'square', 0.07], [784, 0.08, 'square', 0.07], [1047, 0.16, 'square', 0.07]],
  evolve: [[392, 0.1, 'triangle', 0.1], [523, 0.1, 'triangle', 0.1], [659, 0.1, 'triangle', 0.1], [1047, 0.3, 'triangle', 0.1]],
  trap: [[120, 0.08, 'sawtooth', 0.09]],
  alert: [[880, 0.06, 'square', 0.05], [0, 0.05], [880, 0.06, 'square', 0.05]],
  build: [[200, 0.04, 'square', 0.06], [300, 0.05, 'square', 0.06]],
  click: [[700, 0.025, 'square', 0.04]],
  coin: [[988, 0.05, 'square', 0.05], [1319, 0.1, 'square', 0.05]],
  rankup: [[392, 0.12, 'square', 0.08], [523, 0.12, 'square', 0.08], [659, 0.12, 'square', 0.08], [784, 0.12, 'square', 0.08], [1047, 0.4, 'square', 0.08]],
  error: [[150, 0.12, 'square', 0.06]],
};

export class AudioManager {
  constructor(game) { this.game = game; this.ctx = null; this.last = {}; }
  ensure() {
    if (this.ctx || typeof window === 'undefined') return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
  }
  play(name) {
    if (!this.game.state?.settings?.sound || typeof window === 'undefined') return;
    this.ensure();
    const ctx = this.ctx; if (!ctx || !SFX[name]) return;
    const now = ctx.currentTime;
    if (this.last[name] && now - this.last[name] < 0.06) return; // กันเสียงซ้อนมากเกินไป
    this.last[name] = now;
    let t = now;
    const vol = this.game.state.settings.volume ?? 0.6;
    for (const [freq, dur, type = 'square', gain = 0.06] of SFX[name]) {
      if (freq > 0) {
        const o = ctx.createOscillator(), gn = ctx.createGain();
        o.type = type; o.frequency.value = freq;
        gn.gain.setValueAtTime(gain * vol, t);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(gn).connect(ctx.destination);
        o.start(t); o.stop(t + dur + 0.02);
      }
      t += dur;
    }
  }
}
