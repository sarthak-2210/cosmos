export type BodyKind = 'star' | 'planet' | 'dwarf';

export interface CelestialBody {
  id: string;
  name: string;
  kind: BodyKind;
  /** Visual radius in scene units */
  radius: number;
  /** Semi-major axis in scene units (0 for sun) */
  distance: number;
  /** Orbital period in Earth days */
  periodDays: number;
  /** Orbital eccentricity 0–1 */
  eccentricity: number;
  /** Axial tilt in radians */
  tilt: number;
  /** Sidereal rotation period in Earth days (negative = retrograde) */
  dayLength: number;
  /** Base color hex */
  color: string;
  /** Emissive intensity (sun / gas giants) */
  emissive?: number;
  /** Optional ring config */
  rings?: { inner: number; outer: number; color: string; opacity: number };
  /** Real-world notes for HUD */
  realDistanceAU: number;
  realRadiusKm: number;
  description: string;
}

/** Visually scaled solar system — distances roughly log-compressed, sizes exaggerated */
export const BODIES: CelestialBody[] = [
  {
    id: 'sun',
    name: 'Sun',
    kind: 'star',
    radius: 8,
    distance: 0,
    periodDays: 0,
    eccentricity: 0,
    tilt: 0.126,
    dayLength: 25.4,
    color: '#ffcc55',
    emissive: 1.2,
    realDistanceAU: 0,
    realRadiusKm: 696_340,
    description: 'G-type main-sequence star at the center of the Solar System.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    kind: 'planet',
    radius: 0.55,
    distance: 18,
    periodDays: 87.97,
    eccentricity: 0.205,
    tilt: 0.0006,
    dayLength: 58.6,
    color: '#9e9e9e',
    realDistanceAU: 0.39,
    realRadiusKm: 2_440,
    description: 'Innermost rocky planet with extreme temperature swings.',
  },
  {
    id: 'venus',
    name: 'Venus',
    kind: 'planet',
    radius: 0.95,
    distance: 26,
    periodDays: 224.7,
    eccentricity: 0.007,
    tilt: 3.096,
    dayLength: -243,
    color: '#e8c37a',
    realDistanceAU: 0.72,
    realRadiusKm: 6_052,
    description: 'Dense CO₂ atmosphere and runaway greenhouse effect.',
  },
  {
    id: 'earth',
    name: 'Earth',
    kind: 'planet',
    radius: 1,
    distance: 36,
    periodDays: 365.25,
    eccentricity: 0.017,
    tilt: 0.409,
    dayLength: 1,
    color: '#4a90d9',
    realDistanceAU: 1,
    realRadiusKm: 6_371,
    description: 'Our home — liquid water, life, and a protective magnetic field.',
  },
  {
    id: 'mars',
    name: 'Mars',
    kind: 'planet',
    radius: 0.7,
    distance: 48,
    periodDays: 687,
    eccentricity: 0.094,
    tilt: 0.44,
    dayLength: 1.03,
    color: '#c1440e',
    realDistanceAU: 1.52,
    realRadiusKm: 3_390,
    description: 'The Red Planet — thin atmosphere and polar ice caps.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    kind: 'planet',
    radius: 3.6,
    distance: 78,
    periodDays: 4_333,
    eccentricity: 0.049,
    tilt: 0.055,
    dayLength: 0.41,
    color: '#d4a574',
    realDistanceAU: 5.2,
    realRadiusKm: 69_911,
    description: 'Largest planet — a gas giant with a fierce magnetosphere.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    kind: 'planet',
    radius: 3.1,
    distance: 108,
    periodDays: 10_759,
    eccentricity: 0.057,
    tilt: 0.467,
    dayLength: 0.45,
    color: '#f0d9a0',
    rings: { inner: 1.4, outer: 2.4, color: '#c9b896', opacity: 0.75 },
    realDistanceAU: 9.58,
    realRadiusKm: 58_232,
    description: 'Iconic ringed gas giant of ice and rock particles.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    kind: 'planet',
    radius: 1.8,
    distance: 140,
    periodDays: 30_687,
    eccentricity: 0.046,
    tilt: 1.706,
    dayLength: -0.72,
    color: '#7ec8e3',
    realDistanceAU: 19.2,
    realRadiusKm: 25_362,
    description: 'Ice giant tilted on its side — extreme seasonal cycles.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    kind: 'planet',
    radius: 1.7,
    distance: 168,
    periodDays: 60_190,
    eccentricity: 0.009,
    tilt: 0.494,
    dayLength: 0.67,
    color: '#4169e1',
    realDistanceAU: 30.05,
    realRadiusKm: 24_622,
    description: 'Farthest known major planet — deep blue methane haze.',
  },
];

export const MOON = {
  id: 'moon',
  name: 'Moon',
  parentId: 'earth',
  radius: 0.27,
  distance: 2.4,
  periodDays: 27.3,
  color: '#c0c0c0',
};

/** Convert logarithmic-ish slider 0–100 → sim days per real second */
export function sliderToDaysPerSecond(slider: number): number {
  if (slider <= 0) return 0;
  // 1 → ~0.5 d/s, 40 → ~60, 70 → ~365, 100 → ~10000
  return Math.pow(10, slider / 25) * 0.4;
}

export function daysPerSecondToSlider(days: number): number {
  if (days <= 0) return 0;
  return Math.max(0, Math.min(100, 25 * Math.log10(days / 0.4)));
}

export function formatPeriod(days: number): string {
  if (days <= 0) return '—';
  if (days < 400) return `${days.toFixed(1)} d`;
  return `${(days / 365.25).toFixed(2)} yr`;
}

export function formatDistance(au: number): string {
  if (au <= 0) return 'Center';
  return `${au.toFixed(2)} AU`;
}

export function formatRadius(km: number): string {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)} M km`;
  if (km >= 1_000) return `${(km / 1_000).toFixed(0)} k km`;
  return `${km.toFixed(0)} km`;
}

export function formatDayLength(days: number): string {
  if (days === 0) return '—';
  const abs = Math.abs(days);
  const suffix = days < 0 ? ' (R)' : '';
  if (abs < 2) return `${(abs * 24).toFixed(1)} h${suffix}`;
  return `${abs.toFixed(1)} d${suffix}`;
}
