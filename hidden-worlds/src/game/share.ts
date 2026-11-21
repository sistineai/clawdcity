// SHARE-1: spoiler-free share text, built by a pure function.
import { APP_NAME } from '../config';
import { formatTime } from './dates';
import { starString } from './scoring';
import { S } from '../strings';

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
      ? `${APP_NAME} ${S.shareHead(i.puzzleNo)} · ${i.worldName}`
      : `${APP_NAME} · ${S.shareLevel(i.worldName, i.level ?? 1)}`;
  const lines = [
    head,
    `${S.shareFound(i.found, i.total)} · ${formatTime(i.timeMs)} · ${S.shareHints(i.hints)} · ${starString(i.stars)}`,
  ];
  if (i.streak !== null && i.streak > 0) lines.push(S.shareStreak(i.streak));
  lines.push(i.url);
  return lines.join('\n');
}
