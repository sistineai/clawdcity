// Which puzzles a player may open. Premium gates read the purchases adapter's entitlements
// (PREM-5), so a real adapter can open them later without UI changes.
import { ARCHIVE_FREE_DAYS, type WorldId } from '../config';
import { getPurchases } from '../adapters';
import type { SaveDoc } from '../state/schema';
import { daysBetween } from './dates';
import { distinctResidents, isLevelUnlocked, isWorldUnlocked } from './residents';

export const premium = () => getPurchases().entitlements().premium;

export type DailyAccess = 'today' | 'archive' | 'locked' | 'future';
/** ARCH-1/2: today, the 7 days before it free, older locked, future never. */
export function dailyAccess(date: string, today: string): DailyAccess {
  const back = daysBetween(date, today);
  if (back < 0) return 'future';
  if (back === 0) return 'today';
  if (back <= ARCHIVE_FREE_DAYS || premium()) return 'archive';
  return 'locked';
}

export function worldOpen(doc: SaveDoc, world: WorldId): boolean {
  return premium() || isWorldUnlocked(world, distinctResidents(doc));
}
export function levelOpen(doc: SaveDoc, world: WorldId, level: number): boolean {
  return worldOpen(doc, world) && (premium() || isLevelUnlocked(doc, world, level));
}
