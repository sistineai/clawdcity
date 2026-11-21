// The result sheet's share row: text, picture, and a challenge link (daily puzzles).
import { useState } from 'react';
import { track } from '../../adapters';
import { APP_SLUG } from '../../config';
import { challengeUrl } from '../../game/challenge';
import { formatTime, puzzleNumber } from '../../game/dates';
import { shareText } from '../../game/share';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Icon } from '../components/Glyph';
import { appBaseUrl, shareImage, shareTextOrCopy, type ShareMethod } from '../share/share';
import type { ResultInfo } from './ResultSheet';

export function ShareButtons({ info }: { info: ResultInfo }) {
  const pack = useApp((s) => s.pack);
  const showToast = useApp((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const p = info.puzzle;
  const worldName = pack?.logic.worlds.find((w) => w.id === info.spec.worldId)?.name ?? info.spec.worldId;
  const base = appBaseUrl();
  const text = shareText({
    mode: p.mode,
    puzzleNo: p.mode === 'daily' ? puzzleNumber(p.date) : null,
    ...(p.mode === 'explore' ? { level: p.level } : {}),
    worldName,
    found: info.found,
    total: info.total,
    timeMs: info.timeMs,
    hints: info.hints,
    stars: info.stars,
    streak: p.mode === 'daily' && !info.late ? info.streak : null,
    url: base,
  });

  const announce = (m: ShareMethod) => {
    if (m === 'clipboard') showToast(S.copied);
    else if (m === 'web-share') showToast(S.shared);
    else if (m === 'download') showToast(S.downloaded);
    else if (m === 'failed') showToast(S.shareFailed);
  };

  const onText = async () => {
    const m = await shareTextOrCopy(text);
    track('share', { kind: 'text', method: m });
    announce(m);
  };
  const onChallenge = async () => {
    if (p.mode !== 'daily') return;
    const url = challengeUrl(base, {
      date: p.date,
      timeS: Math.max(1, Math.round(info.timeMs / 1000)),
      misses: info.misses,
      hints: info.hints,
    });
    const m = await shareTextOrCopy(`${S.beat(formatTime(info.timeMs))} · ${text.split('\n')[0]}\n${url}`);
    track('share', { kind: 'challenge', method: m });
    announce(m);
  };
  const onImage = async () => {
    if (!pack || busy) return;
    setBusy(true);
    try {
      const { renderShareCard } = await import('../share/image');
      const title = p.mode === 'daily' ? S.puzzleNo(puzzleNumber(p.date)) : S.levelN(p.level);
      const blob = await renderShareCard(info.spec, pack, {
        title,
        worldName,
        stars: info.stars,
        lines: [
          `${S.shareFound(info.found, info.total)} · ${formatTime(info.timeMs)}`,
          info.hints ? S.hintsN(info.hints) : S.noHints,
        ],
      });
      const m = blob
        ? await shareImage(
            blob,
            `${APP_SLUG}-${p.mode === 'daily' ? p.date : `${p.world}-${p.level}`}.png`,
            text,
          )
        : 'failed';
      track('share', { kind: 'image', method: m });
      announce(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="share-row">
      <button type="button" className="btn gold" onClick={() => void onText()} data-testid="share-text">
        <Icon name="share" /> {S.shareText}
      </button>
      <button
        type="button"
        className="btn line"
        onClick={() => void onImage()}
        disabled={busy}
        data-testid="share-image"
      >
        <Icon name="image" /> {S.shareImage}
      </button>
      {p.mode === 'daily' && (
        <button
          type="button"
          className="btn line"
          onClick={() => void onChallenge()}
          data-testid="share-challenge"
        >
          <Icon name="flag" /> {S.challenge}
        </button>
      )}
    </div>
  );
}
