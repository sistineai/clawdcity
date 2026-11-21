// One migration per schema version (META-5). migrations[n] turns a version-n document into
// version n+1. Version 1 is the first shipped schema, so there is nothing to migrate yet; the
// `v0` entry upgrades the unversioned shape used during development, and proves the path.
import { SCHEMA_VERSION } from '../config';

type Raw = Record<string, unknown>;
export const migrations: Record<number, (d: Raw) => Raw> = {
  0: (d) => ({
    ...d,
    v: 1,
    worldsAnnounced: d.worldsAnnounced ?? ['meadow'],
    installNudgeShown: d.installNudgeShown ?? false,
  }),
};

export function migrate(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  let d = raw as Raw;
  let v = typeof d.v === 'number' ? d.v : 0;
  while (v < SCHEMA_VERSION) {
    const step = migrations[v];
    if (!step) return d;
    d = step(d);
    v = typeof d.v === 'number' ? d.v : v + 1;
  }
  return d;
}
