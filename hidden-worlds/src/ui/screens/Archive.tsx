// ARCH-1/2: the seven days before today are free; older days are listed locked.
import { ARCHIVE_FREE_DAYS, ARCHIVE_LOCKED_SHOWN } from '../../config';
import { addDays, dailyDifficulty, dailyWorld, formatTime, puzzleNumber, todayKey } from '../../game/dates';
import { dailyAccess } from '../../game/gates';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Icon } from '../components/Glyph';
import { Screen } from '../components/Screen';
import { useNow } from '../hooks';
import { Stars } from '../play/ResultSheet';
import { go } from '../router';

export function Archive() {
  const today = todayKey(useNow(60000));
  const doc = useApp((s) => s.doc);
  const pack = useApp((s) => s.pack);
  const name = (w: string) => pack?.logic.worlds.find((x) => x.id === w)?.name ?? w;
  const days = Array.from({ length: ARCHIVE_FREE_DAYS + ARCHIVE_LOCKED_SHOWN }, (_, i) =>
    addDays(today, -(i + 1)),
  );
  const fmt = (k: string) =>
    new Date(`${k}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  return (
    <Screen title={S.archiveTitle} lede={S.archiveLede}>
      <ol className="ledger" data-testid="archive">
        {days.map((k) => {
          const access = dailyAccess(k, today);
          const r = doc.daily[k];
          const locked = access === 'locked';
          return (
            <li key={k}>
              <button
                type="button"
                className={`ledger-row${locked ? ' locked' : ''}`}
                data-testid={`archive-${k}`}
                data-locked={locked}
                onClick={() => go(locked ? 'premium?source=archive' : `play/daily/${k}`)}
              >
                <span className="ledger-no num">{S.puzzleNo(puzzleNumber(k))}</span>
                <span className="ledger-main">
                  <b>{fmt(k)}</b>
                  <span className="muted">
                    {name(dailyWorld(k))} · {S.difficulty[dailyDifficulty(k)]}
                  </span>
                </span>
                <span className="ledger-end">
                  {locked ? (
                    <span className="lock-tag">
                      <Icon name="lock" size={16} /> {S.locked}
                    </span>
                  ) : r ? (
                    <>
                      <Stars n={r.stars} size={16} />
                      <span className="num small">{formatTime(r.timeMs)}</span>
                      {r.late && <span className="late-tag">{S.late}</span>}
                    </>
                  ) : (
                    <span className="muted small">{doc.active[`daily:${k}`] ? S.resume : S.notPlayed}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}
