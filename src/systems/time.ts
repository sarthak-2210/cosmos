export class SimulationTime {
  /** Simulated Earth-days per real second */
  daysPerSecond = 60;
  /** Accumulated simulated days */
  elapsedDays = 0;
  /** Whether simulation is advancing */
  playing = true;
  /** Last slider value while playing (for resume) */
  private lastNonZeroSpeed = 60;

  tick(deltaSeconds: number): void {
    if (!this.playing || this.daysPerSecond === 0) return;
    this.elapsedDays += deltaSeconds * this.daysPerSecond;
  }

  setDaysPerSecond(value: number): void {
    this.daysPerSecond = Math.max(0, value);
    if (value > 0) {
      this.lastNonZeroSpeed = value;
      this.playing = true;
    }
  }

  togglePlay(): boolean {
    if (this.playing) {
      this.playing = false;
    } else {
      this.playing = true;
      if (this.daysPerSecond === 0) {
        this.daysPerSecond = this.lastNonZeroSpeed;
      }
    }
    return this.playing;
  }

  pause(): void {
    this.playing = false;
  }

  resume(): void {
    this.playing = true;
    if (this.daysPerSecond === 0) {
      this.daysPerSecond = this.lastNonZeroSpeed;
    }
  }

  reset(): void {
    this.elapsedDays = 0;
  }

  formatElapsed(): string {
    const d = this.elapsedDays;
    if (d < 1) return `${(d * 24).toFixed(1)} h`;
    if (d < 365.25) return `${d.toFixed(2)} d`;
    const years = d / 365.25;
    if (years < 100) return `${years.toFixed(2)} yr`;
    return `${years.toFixed(0)} yr`;
  }

  formatSpeed(): string {
    const s = this.daysPerSecond;
    if (!this.playing || s === 0) return 'Paused';
    if (s < 1) return `${(s * 24).toFixed(1)} h/s`;
    if (s < 365) return `${s.toFixed(0)} d/s`;
    return `${(s / 365.25).toFixed(1)} yr/s`;
  }
}
