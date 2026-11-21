// Display colours for the eight object colours. Changing these changes drawing only.
import type { Palette } from '../pack/types';

export const COLORS: Palette = {
  red: '#dd4b39',
  orange: '#f08a24',
  yellow: '#f4c430',
  green: '#57a639',
  teal: '#1fa39a',
  blue: '#3a6fd8',
  purple: '#8a55c8',
  pink: '#f07fa8',
};

/**
 * Colour-blind palette (SHELL-4): a lightness ladder (about 11 L* apart) chosen so every pair
 * stays at least 5 L* apart under normal vision and simulated protanopia and deuteranopia.
 * Hues stay in each name's family, and tray tags also print the colour name.
 */
export const COLORS_CB: Palette = {
  red: '#4b1a02',
  orange: '#c29005',
  yellow: '#edf8af',
  green: '#186d03',
  teal: '#0bcb8e',
  blue: '#043a8b',
  purple: '#a147f5',
  pink: '#fdc3d6',
};

export function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(h1: string, h2: string, t: number): string {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  return (
    '#' +
    a
      .map((v, i) =>
        Math.round(v + (b[i]! - v) * t)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
