/** Lightweight procedural SFX via Web Audio — no asset downloads. */

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensure() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.ensure();
    void this.ctx?.resume();
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    gain = 0.2,
    slideTo?: number,
  ) {
    if (this.muted || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
    }
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noise(duration: number, gain = 0.15, filterFreq = 1200) {
    if (this.muted || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  shoot() {
    this.noise(0.08, 0.22, 2800);
    this.tone(180, 0.07, 'sawtooth', 0.12, 60);
  }

  reload() {
    this.tone(220, 0.06, 'triangle', 0.08);
    setTimeout(() => this.tone(320, 0.08, 'triangle', 0.1), 120);
    setTimeout(() => this.tone(180, 0.1, 'square', 0.06), 280);
  }

  hit() {
    this.tone(90, 0.05, 'square', 0.1, 40);
  }

  kill() {
    this.tone(140, 0.12, 'sawtooth', 0.12, 40);
    this.noise(0.15, 0.1, 600);
  }

  hurt() {
    this.noise(0.2, 0.18, 400);
    this.tone(80, 0.18, 'sawtooth', 0.15, 40);
  }

  wave() {
    this.tone(220, 0.15, 'triangle', 0.1);
    setTimeout(() => this.tone(330, 0.2, 'triangle', 0.12), 100);
    setTimeout(() => this.tone(440, 0.25, 'triangle', 0.1), 220);
  }

  death() {
    this.tone(200, 0.5, 'sawtooth', 0.15, 40);
    this.noise(0.6, 0.2, 300);
  }

  empty() {
    this.tone(90, 0.04, 'square', 0.05);
  }
}
