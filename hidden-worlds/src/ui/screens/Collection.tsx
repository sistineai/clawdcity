// META-3: residents as field-guide entries, grouped by world. Unfound ones are silhouettes.
import { indexPack } from '../../engine/logic';
import { worldComplete } from '../../game/residents';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Icon } from '../components/Glyph';
import { SpriteIcon } from '../components/Icon';
import { Screen } from '../components/Screen';

const fmt = (k: string) =>
  new Date(`${k}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function Collection() {
  const doc = useApp((s) => s.doc);
  const pack = useApp((s) => s.pack);
  if (!pack) return <Screen title={S.collectionTitle}>{S.loading}</Screen>;
  const ix = indexPack(pack.logic);
  return (
    <Screen title={S.collectionTitle} lede={S.collectionLede}>
      {pack.logic.worlds.map((w) => {
        const complete = worldComplete(w.id, doc, pack.logic);
        const n = w.residents.filter((r) => doc.residents[r]).length;
        return (
          <section key={w.id} className="guide-section" aria-labelledby={`g-${w.id}`}>
            <header className="guide-head">
              <h2 id={`g-${w.id}`} className="title">
                {w.name}
              </h2>
              <span className="muted num">
                {n}/{w.residents.length}
              </span>
              {complete && (
                <span className="badge">
                  <Icon name="star" size={14} /> {S.worldComplete}
                </span>
              )}
            </header>
            <ul className="guide-grid" data-testid={`collection-${w.id}`}>
              {w.residents.map((id) => {
                const def = ix.byId.get(id);
                const got = doc.residents[id];
                const rarity = def?.rarity ?? 'common';
                return (
                  <li
                    key={id}
                    className={`guide-entry${got ? ' got' : ''}`}
                    data-testid={`resident-${id}`}
                    data-found={!!got}
                  >
                    <div className="guide-pic">
                      <SpriteIcon
                        spriteId={id}
                        color={null}
                        size={76}
                        silhouette={!got}
                        label={got ? def?.name : S.unknown}
                      />
                    </div>
                    <div className="guide-text">
                      <p className="title guide-name">{got ? def?.name : S.unknownName}</p>
                      <p className={`rarity rarity-${rarity}`}>{S.rarity[rarity]}</p>
                      {got ? (
                        <>
                          <p className="entry">{def?.description}</p>
                          <p className="small muted">
                            {S.timesFound(got.count)} · {S.firstFound(fmt(got.first))}
                          </p>
                        </>
                      ) : (
                        <p className="small muted">{S.unknown}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Screen>
  );
}
