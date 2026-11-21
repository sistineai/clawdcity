// PLAY-6: the tray of specimen tags. Each chip is a real button; its name shows on hover,
// on long-press and on tap/keyboard activation (no hover-only information, SHELL-9).
import { useRef, useState } from 'react';
import { indexPack, type PuzzleSpec } from '../../engine/logic';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { SpriteIcon } from '../components/Icon';
import { Icon } from '../components/Glyph';

export const colourWord = (c: string | null) => (c ? c[0]!.toUpperCase() + c.slice(1) : '');

export function Tray({
  spec,
  found,
  residentFound,
}: {
  spec: PuzzleSpec;
  found: number[];
  residentFound: boolean;
}) {
  const pack = useApp((s) => s.pack);
  const colorBlind = useApp((s) => s.doc.settings.colorBlind);
  const [shown, setShown] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (!pack) return null;
  const ix = indexPack(pack.logic);
  const show = (uid: number) => {
    setShown(uid);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(null), 1800);
  };
  const res = spec.resident ? spec.sprites[spec.resident.uid]! : null;
  const resDef = res ? ix.byId.get(res.spriteId) : undefined;
  return (
    <footer className="tray" aria-label={S.trayLabel}>
      <ul className="tray-list" data-testid="tray">
        {spec.targets.map((t) => {
          const sp = spec.sprites[t.uid]!;
          const name =
            `${colourWord(sp.color)} ${(ix.byId.get(sp.spriteId)?.name ?? sp.spriteId).toLowerCase()}`.trim();
          const isFound = found.includes(t.uid);
          let press: ReturnType<typeof setTimeout> | null = null;
          return (
            <li key={t.uid}>
              <button
                type="button"
                className={`chip${isFound ? ' found' : ''}`}
                title={name}
                aria-label={`${name}${isFound ? ', ' + S.found.toLowerCase() : ''}`}
                aria-pressed={isFound}
                data-testid="chip"
                data-found={isFound}
                onClick={() => show(t.uid)}
                onPointerDown={() => (press = setTimeout(() => show(t.uid), 450))}
                onPointerUp={() => press && clearTimeout(press)}
                onPointerLeave={() => press && clearTimeout(press)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span className="chip-hole" aria-hidden="true" />
                <SpriteIcon spriteId={sp.spriteId} color={sp.color} size={40} />
                {colorBlind && <span className="chip-colour">{colourWord(sp.color)}</span>}
                <span className="chip-text" aria-hidden="true">
                  {name}
                </span>
                {isFound && (
                  <span className="chip-tick">
                    <Icon name="check" size={14} />
                  </span>
                )}
                {shown === t.uid && (
                  <span className="chip-name" role="status">
                    {name}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {res && (
          <li>
            <div
              className={`chip resident${residentFound ? ' found' : ''}`}
              data-testid="resident-slot"
              aria-label={residentFound ? resDef?.name : S.residentSlot}
            >
              {residentFound ? (
                <>
                  <SpriteIcon spriteId={res.spriteId} color={null} size={40} />
                  <span className="chip-label">{resDef?.name}</span>
                </>
              ) : (
                <span className="chip-label hiding">{S.residentSlot}</span>
              )}
            </div>
          </li>
        )}
      </ul>
    </footer>
  );
}
