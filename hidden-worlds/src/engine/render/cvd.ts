// Colour-vision-deficiency simulation (Machado, Oliveira & Fernandes 2009, severity 1.0) and
// CIE L* lightness, for checking the colour-blind palette (SHELL-4).
import { hexToRgb } from './palette';

const M = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
} as const;
export type Cvd = keyof typeof M;

const toLin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** Simulated linear RGB for a hex colour under a deficiency (or normal vision). */
export function simulate(hex: string, cvd: Cvd | 'normal'): [number, number, number] {
  const lin = hexToRgb(hex).map(toLin) as [number, number, number];
  if (cvd === 'normal') return lin;
  const m = M[cvd];
  return m.map((row) => Math.min(1, Math.max(0, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]))) as [
    number,
    number,
    number,
  ];
}

export function lightness([r, g, b]: [number, number, number]): number {
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
}
