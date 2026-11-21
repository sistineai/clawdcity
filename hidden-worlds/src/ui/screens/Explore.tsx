// Explore (EXP-1..3, META-4): worlds with their unlock state, and each world's ladder of levels.
import {
  EXPLORE_DIFFICULTY_BANDS,
  EXPLORE_LEVELS,
  WORLD_ORDER,
  WORLD_UNLOCK,
  type WorldId,
} from '../../config';
import { levelOpen, worldOpen } from '../../game/gates';
import { exploreDifficulty } from '../../game/puzzles';
import { distinctResidents, worldComplete } from '../../game/residents';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Icon } from '../components/Glyph';
import { Screen } from '../components/Screen';
import { WorldThumb } from '../components/WorldThumb';
import { go } from '../router';

export function Worlds() {
  const doc = useApp((s) => s.doc);
  const pack = useApp((s) => s.pack);
  const have = distinctResidents(doc);
  return (
    <Screen title={S.exploreTitle} lede={S.exploreLede}>
      <ul className="world-list" data-testid="worlds">
        {WORLD_ORDER.map((w) => {
          const open = worldOpen(doc, w);
          const done = Object.keys(doc.explore[w] ?? {}).length;
          const complete = pack ? worldComplete(w, doc, pack.logic) : false;
          const name = pack?.logic.worlds.find((x) => x.id === w)?.name ?? w;
          return (
            <li key={w}>
              <button
                type="button"
                className={`world-card${open ? '' : ' locked'}`}
                onClick={() => open && go(`explore/${w}`)}
                aria-disabled={!open}
                data-testid={`world-${w}`}
                data-locked={!open}
              >
                <WorldThumb world={w} seed={`explore-${w}-cover`} locked={!open} />
                <span className="world-card-text">
                  <b className="title">{name}</b>
                  {open ? (
                    <span>{S.levelsDone(done, EXPLORE_LEVELS)}</span>
                  ) : (
                    <span className="lock-line">
                      <Icon name="lock" size={16} /> {S.unlockNeed(WORLD_UNLOCK[w], have)}
                    </span>
                  )}
                  {complete && (
                    <span className="badge" data-testid={`badge-${w}`}>
                      <Icon name="star" size={14} /> {S.worldComplete}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}

export function Levels({ world }: { world: WorldId }) {
  const doc = useApp((s) => s.doc);
  const pack = useApp((s) => s.pack);
  const name = pack?.logic.worlds.find((x) => x.id === world)?.name ?? world;
  const stars = doc.explore[world] ?? {};
  const done = Object.keys(stars).length;
  const bands = EXPLORE_DIFFICULTY_BANDS.map((b, i) => ({
    difficulty: b.difficulty,
    from: i === 0 ? 1 : EXPLORE_DIFFICULTY_BANDS[i - 1]!.upTo + 1,
    to: b.upTo,
  }));
  const level = (n: number) => {
    const open = levelOpen(doc, world, n);
    const st = stars[String(n)] ?? 0;
    return (
      <li key={n}>
        <button
          type="button"
          className={`level${open ? '' : ' locked'}${st ? ' done' : ''}`}
          disabled={!open}
          onClick={() => go(`play/explore/${world}/${n}`)}
          data-testid={`level-${n}`}
          aria-label={`${S.levelN(n)}, ${S.difficulty[exploreDifficulty(n)]}${open ? (st ? `, ${st} stars` : '') : `, ${S.locked}`}`}
        >
          <span className="num level-n">{n}</span>
          {open ? (
            <span className="level-stars" aria-hidden="true">
              {[0, 1, 2].map((k) => (
                <i key={k} className={k < st ? 'on' : ''} />
              ))}
            </span>
          ) : (
            <Icon name="lock" size={14} />
          )}
        </button>
      </li>
    );
  };
  return (
    <Screen title={name} back="explore">
      <div className="world-banner">
        <WorldThumb world={world} seed={`explore-${world}-cover`} />
        <p className="world-banner-text">{S.levelsDone(done, EXPLORE_LEVELS)}</p>
      </div>
      {bands.map((b) => (
        <section key={b.difficulty} className="band" aria-labelledby={`band-${b.difficulty}`}>
          <h2 id={`band-${b.difficulty}`} className="band-head">
            <span className="title">{S.difficulty[b.difficulty]}</span>
            <span className="muted small">{S.levelsRange(b.from, b.to)}</span>
          </h2>
          <ol className="levels" start={b.from}>
            {Array.from({ length: b.to - b.from + 1 }, (_, i) => level(b.from + i))}
          </ol>
        </section>
      ))}
    </Screen>
  );
}
