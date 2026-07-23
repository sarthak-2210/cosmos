import {
  BODIES,
  daysPerSecondToSlider,
  formatDayLength,
  formatDistance,
  formatPeriod,
  formatRadius,
  sliderToDaysPerSecond,
  type CelestialBody,
} from '../data/planets';
import type { SimulationTime } from '../systems/time';

export interface HudCallbacks {
  onSpeedChange: (daysPerSecond: number) => void;
  onPlayPause: () => boolean;
  onReset: () => void;
  onToggleOrbits: (v: boolean) => void;
  onToggleLabels: (v: boolean) => void;
  onToggleAsteroids: (v: boolean) => void;
  onFocusBody: (id: string) => void;
}

export class HUD {
  private elapsedEl: HTMLElement;
  private speedEl: HTMLElement;
  private fpsEl: HTMLElement;
  private slider: HTMLInputElement;
  private playBtn: HTMLButtonElement;
  private playIcon: HTMLElement;
  private playLabel: HTMLElement;
  private infoName: HTMLElement;
  private infoType: HTMLElement;
  private infoRadius: HTMLElement;
  private infoPeriod: HTMLElement;
  private infoDistance: HTMLElement;
  private infoEcc: HTMLElement;
  private infoDay: HTMLElement;
  private bodyList: HTMLElement;
  private selectedId = 'sun';
  private fpsFrames = 0;
  private fpsLast = performance.now();

  constructor(
    private time: SimulationTime,
    private callbacks: HudCallbacks,
  ) {
    this.elapsedEl = el('#elapsed-display');
    this.speedEl = el('#speed-display');
    this.fpsEl = el('#fps-pill');
    this.slider = el('#speed-slider') as HTMLInputElement;
    this.playBtn = el('#play-pause') as HTMLButtonElement;
    this.playIcon = el('#play-icon');
    this.playLabel = el('#play-label');
    this.infoName = el('#info-name');
    this.infoType = el('#info-type');
    this.infoRadius = el('#info-radius');
    this.infoPeriod = el('#info-period');
    this.infoDistance = el('#info-distance');
    this.infoEcc = el('#info-ecc');
    this.infoDay = el('#info-day');
    this.bodyList = el('#body-list');

    this.buildBodyList();
    this.bindControls();
    this.showBody(BODIES[0]);
    this.syncSpeedUI(this.time.daysPerSecond);
  }

  private buildBodyList(): void {
    this.bodyList.innerHTML = '';
    for (const body of BODIES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `body-item${body.id === this.selectedId ? ' active' : ''}`;
      btn.dataset.id = body.id;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', body.id === this.selectedId ? 'true' : 'false');

      const swatch = document.createElement('span');
      swatch.className = 'body-swatch';
      swatch.style.background = body.color;

      const name = document.createElement('span');
      name.className = 'body-name';
      name.textContent = body.name;

      const meta = document.createElement('span');
      meta.className = 'body-meta mono';
      meta.textContent = body.kind === 'star' ? 'STAR' : formatDistance(body.realDistanceAU);

      btn.append(swatch, name, meta);
      btn.addEventListener('click', () => this.selectBody(body.id));
      this.bodyList.appendChild(btn);
    }
  }

  private bindControls(): void {
    this.slider.addEventListener('input', () => {
      const days = sliderToDaysPerSecond(Number(this.slider.value));
      this.callbacks.onSpeedChange(days);
      this.syncSpeedUI(days, false);
      this.markPreset(days);
      this.updatePlayButton(days > 0 && this.time.playing);
    });

    const presets = document.getElementById('speed-presets');
    presets?.querySelectorAll<HTMLButtonElement>('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const days = Number(chip.dataset.days);
        this.callbacks.onSpeedChange(days);
        if (days === 0) {
          this.time.pause();
        } else {
          this.time.resume();
        }
        this.syncSpeedUI(days);
        this.markPreset(days);
        this.updatePlayButton(days > 0 && this.time.playing);
      });
    });

    this.playBtn.addEventListener('click', () => {
      const playing = this.callbacks.onPlayPause();
      this.updatePlayButton(playing);
      this.syncSpeedUI(this.time.daysPerSecond);
    });

    el('#reset-time').addEventListener('click', () => {
      this.callbacks.onReset();
      this.refreshTime();
    });

    const orbits = el('#toggle-orbits') as HTMLInputElement;
    orbits.addEventListener('change', () => this.callbacks.onToggleOrbits(orbits.checked));

    const labels = el('#toggle-labels') as HTMLInputElement;
    labels.addEventListener('change', () => this.callbacks.onToggleLabels(labels.checked));

    const asteroids = el('#toggle-asteroids') as HTMLInputElement;
    asteroids.addEventListener('change', () => this.callbacks.onToggleAsteroids(asteroids.checked));
  }

  selectBody(id: string): void {
    this.selectedId = id;
    const body = BODIES.find((b) => b.id === id);
    if (!body) return;

    this.bodyList.querySelectorAll('.body-item').forEach((node) => {
      const btn = node as HTMLElement;
      const active = btn.dataset.id === id;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    this.showBody(body);
    this.callbacks.onFocusBody(id);
  }

  private showBody(body: CelestialBody): void {
    this.infoName.textContent = body.name;
    this.infoType.textContent =
      body.kind === 'star' ? 'Star' : body.kind === 'dwarf' ? 'Dwarf planet' : 'Planet';
    this.infoRadius.textContent = formatRadius(body.realRadiusKm);
    this.infoPeriod.textContent = formatPeriod(body.periodDays);
    this.infoDistance.textContent = formatDistance(body.realDistanceAU);
    this.infoEcc.textContent = body.distance > 0 ? body.eccentricity.toFixed(3) : '—';
    this.infoDay.textContent = formatDayLength(body.dayLength);
  }

  private syncSpeedUI(days: number, updateSlider = true): void {
    if (updateSlider) {
      this.slider.value = String(Math.round(daysPerSecondToSlider(days)));
    }
    this.speedEl.textContent = this.time.formatSpeed();
  }

  private markPreset(days: number): void {
    const presets = document.getElementById('speed-presets');
    presets?.querySelectorAll<HTMLButtonElement>('.chip').forEach((chip) => {
      const d = Number(chip.dataset.days);
      chip.classList.toggle('active', Math.abs(d - days) < 0.01 || (d === 0 && days === 0));
    });
  }

  private updatePlayButton(playing: boolean): void {
    this.playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    this.playIcon.textContent = playing ? '❚❚' : '▶';
    this.playLabel.textContent = playing ? 'Pause' : 'Play';
    this.playBtn.classList.toggle('is-paused', !playing);
  }

  refreshTime(): void {
    this.elapsedEl.textContent = this.time.formatElapsed();
    this.speedEl.textContent = this.time.formatSpeed();
  }

  tickFps(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLast >= 500) {
      const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLast));
      this.fpsEl.textContent = `${fps} FPS`;
      this.fpsFrames = 0;
      this.fpsLast = now;
    }
  }
}

function el<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector(selector);
  if (!node) throw new Error(`Missing element: ${selector}`);
  return node as T;
}
