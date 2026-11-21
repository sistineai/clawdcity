// Residents collection and world unlocks (WORLD-4, EXP-2, META-3/4).
import { WORLD_ORDER, WORLD_UNLOCK, type WorldId } from '../config';
import type { PackLogicData } from '../engine/logic';
import type { SaveDoc } from '../state/schema';

export const distinctResidents = (doc: SaveDoc) => Object.keys(doc.residents).length;

export function isWorldUnlocked(world: WorldId, distinct: number): boolean {
  return distinct >= WORLD_UNLOCK[world];
}
export function unlockedWorlds(distinct: number): WorldId[] {
  return WORLD_ORDER.filter((w) => isWorldUnlocked(w, distinct));
}
export function worldComplete(worldId: string, doc: SaveDoc, pack: PackLogicData): boolean {
  const w = pack.worlds.find((x) => x.id === worldId);
  return !!w && w.residents.length > 0 && w.residents.every((r) => !!doc.residents[r]);
}
/** Explore levels unlock in order: level n needs level n-1 finished (EXP-2). */
export function isLevelUnlocked(doc: SaveDoc, world: string, level: number): boolean {
  return level === 1 || !!doc.explore[world]?.[String(level - 1)];
}
