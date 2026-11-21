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
 * Colour-blind palette (SHELL-4): spread across lightness so every pair stays apart under
 * simulated deuteranopia and protanopia. Hues stay close to the names so labels still fit.
 */
export const COLORS_CB: Palette = {
  red: '#8c1d18',
  orange: '#e66100',
  yellow: '#ffe36e',
  green: '#2d6b2a',
  teal: '#5fc4c4',
  blue: '#1a3f9e',
  purple: '#7a52b8',
  pink: '#f4a6c6',
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
