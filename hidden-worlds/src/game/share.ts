// SHARE-1: spoiler-free share text, built by a pure function.
import { APP_NAME } from '../config';
import { formatTime } from './dates';
import { starString } from './scoring';

export interface ShareInput {
  mode: 'daily' | 'explore';
  puzzleNo: number | null;
  level?: number;
  worldName: string;
  found: number;
  total: number;
  timeMs: number;
  hints: number;
  stars: number;
  streak: number | null;
  url: string;
}

export function shareText(i: ShareInput): string {
  const head =
    i.mode === 'daily'
      ? `${APP_NAME} ${i.puzzleNo === null ? 'Preview' : `No. ${i.puzzleNo}`} · ${i.worldName}`
      : `${APP_NAME} · ${i.worldName} level ${i.level ?? 1}`;
  const hints = i.hints === 0 ? 'no hints' : i.hints === 1 ? '1 hint' : `${i.hints} hints`;
  const lines = [
    head,
    `${i.found} of ${i.total} found · ${formatTime(i.timeMs)} · ${hints} · ${starString(i.stars)}`,
  ];
  if (i.streak !== null && i.streak > 0) lines.push(`Streak ${i.streak}`);
  lines.push(i.url);
  return lines.join('\n');
}
