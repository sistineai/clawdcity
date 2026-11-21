// PLAY-9: the result sheet: stars, time, misses, hints, resident, streak, sharing and what next.
import type { ReactNode } from 'react';
import { EXPLORE_LEVELS } from '../../config';
import { indexPack, type PuzzleSpec } from '../../engine/logic';
import { formatTime } from '../../game/dates';
import type { PuzzleRef } from '../../game/puzzles';
import type { ChallengeData } from '../../state/schema';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Glyph';
import { SpriteIcon } from '../components/Icon';
import { go } from '../router';
import { ShareButtons } from './ShareButtons';

export interface ResultInfo {
  puzzle: PuzzleRef;
  spec: PuzzleSpec;
  stars: 1 | 2 | 3;
  timeMs: number;
  misses: number;
  hints: number;
  found: number;
  total: number;
  residentId: string | null;
  late: boolean;
  streak: number;
  challenge: ChallengeData | null;
}

export function Stars({ n, size = 30 }: { n: number; size?: number }) {
  return (
    <span className="stars" role="img" aria-label={S.resultStars(n)}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'star on' : 'star'}>
          <Icon name="star" size={size} />
        </span>
      ))}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ResultSheet({ info, onClose }: { info: ResultInfo; onClose: () => void }) {
  const pack = useApp((s) => s.pack);
  const def = info.residentId && pack ? indexPack(pack.logic).byId.get(info.residentId) : undefined;
  const p = info.puzzle;
  const mine = formatTime(info.timeMs);
  const theirs = info.challenge ? formatTime(info.challenge.timeS * 1000) : null;
  return (
    <Dialog labelId="result-title" onClose={onClose} className="result">
      <div className="result-head">
        <h2 id="result-title" className="title">
          {S.resultTitle}
        </h2>
        <Stars n={info.stars} />
      </div>
      <dl className="stat-grid" data-testid="result">
        <Stat label={S.resultTime} value={<span data-testid="result-time">{mine}</span>} />
        <Stat label={S.resultMisses} value={info.misses} />
        <Stat label={S.resultHints} value={info.hints} />
        {p.mode === 'daily' && !info.late && (
          <Stat label={S.streak} value={<span data-testid="result-streak">{info.streak}</span>} />
        )}
      </dl>
      <div className="result-resident">
        {def ? (
          <>
            <SpriteIcon spriteId={def.id} color={null} size={44} />
            <span>
              <b>{def.name}</b> · {S.resultResident.toLowerCase()} found
            </span>
          </>
        ) : (
          <span className="muted">
            {S.resultResident}: {S.residentNotFound.toLowerCase()}
          </span>
        )}
      </div>
      {info.late && <p className="note">{S.lateNote}</p>}
      {theirs && (
        <p className="versus" data-testid="versus">
          {S.vsFriend(mine, theirs, info.timeMs <= (info.challenge?.timeS ?? 0) * 1000)}
        </p>
      )}
      <ShareButtons info={info} />
      <div className="row wrap next-row">
        {p.mode === 'explore' ? (
          <>
            {p.level < EXPLORE_LEVELS && (
              <button
                type="button"
                className="btn solid"
                onClick={() => go(`play/explore/${p.world}/${p.level + 1}`)}
              >
                {S.nextLevel}
              </button>
            )}
            <button type="button" className="btn line" onClick={() => go(`explore/${p.world}`)}>
              {S.backToLevels}
            </button>
          </>
        ) : (
          <button type="button" className="btn solid" onClick={() => go('')} data-testid="result-home">
            {S.home}
          </button>
        )}
        <button type="button" className="btn line" onClick={onClose}>
          {S.keepLooking}
        </button>
      </div>
    </Dialog>
  );
}
