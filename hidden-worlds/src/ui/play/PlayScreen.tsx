// The Play screen (PLAY-1..11, DAILY-6/7). Generation happens once per puzzle; the canvas is
// owned by WorldController; React only renders the chrome around it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PLAY } from '../../config';
import { getAds, track } from '../../adapters';
import { buildIdMap, findNear, generate, indexPack, type PuzzleSpec } from '../../engine/logic';
import { now } from '../../game/clock';
import { formatTime, puzzleNumber, todayKey } from '../../game/dates';
import { hintRing, shouldLock } from '../../game/hint';
import { completePuzzle, recordResident, saveActive, startPuzzle } from '../../game/progress';
import { difficultyFor, refKey, seedFor, worldFor, type PuzzleRef } from '../../game/puzzles';
import { distinctResidents, unlockedWorlds } from '../../game/residents';
import { displayedStreak } from '../../game/streak';
import type { ActivePuzzle, ChallengeData } from '../../state/schema';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { buzz, playSound } from '../feedback';
import { usePalette, useReducedMotion } from '../hooks';
import { go } from '../router';
import { Coach } from './Coach';
import { ResidentCard } from './ResidentCard';
import { ResultSheet, type ResultInfo } from './ResultSheet';
import { Tray } from './Tray';
import { WorldController } from './WorldController';
import { installTestHook } from './testHook';
import { Icon } from '../components/Glyph';

export interface PlayProps {
  puzzle: PuzzleRef;
  challenge?: ChallengeData | undefined;
}

interface Ready {
  spec: PuzzleSpec;
  idMap: Int32Array;
}

export function PlayScreen({ puzzle: puzzleProp, challenge }: PlayProps) {
  // The parent re-renders on every save; keep one puzzle object per puzzle so callbacks stay stable.
  const key = refKey(puzzleProp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => puzzleProp, [key]);
  const pack = useApp((s) => s.pack);
  const settings = useApp((s) => s.doc.settings);
  const onboarded = useApp((s) => s.doc.onboarded);
  const update = useApp((s) => s.update);
  const showToast = useApp((s) => s.showToast);
  const palette = usePalette();
  const reducedMotion = useReducedMotion();

  const [ready, setReady] = useState<Ready | null>(null);
  const [active, setActive] = useState<ActivePuzzle | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [residentCard, setResidentCard] = useState<{ id: string; isNew: boolean } | null>(null);
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shownMs, setShownMs] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<WorldController | null>(null);
  const activeRef = useRef<ActivePuzzle | null>(null);
  const runSince = useRef<number | null>(null);
  const missTimes = useRef<number[]>([]);
  const pendingMiss = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAt = useRef<{ x: number; y: number } | null>(null);
  const doneRef = useRef(false);

  const elapsed = useCallback(() => {
    const a = activeRef.current;
    if (!a) return 0;
    return a.elapsedMs + (runSince.current !== null ? Math.max(0, now() - runSince.current) : 0);
  }, []);

  /** Fold running time into the saved state and persist (DAILY-6). */
  const persist = useCallback(
    (patch?: Partial<ActivePuzzle>) => {
      const a = activeRef.current;
      if (!a || doneRef.current) return;
      const t = now();
      const next: ActivePuzzle = { ...a, ...patch, elapsedMs: elapsed(), updatedAt: t };
      if (runSince.current !== null) runSince.current = t;
      activeRef.current = next;
      setActive(next);
      update((d) => saveActive(d, puzzle, next));
    },
    [elapsed, puzzle, update],
  );

  // 1. generate the puzzle and start or resume it
  useEffect(() => {
    if (!pack) return;
    let live = true;
    const timer = setTimeout(() => {
      const spec = generate({
        seed: seedFor(puzzle),
        difficulty: difficultyFor(puzzle),
        worldId: worldFor(puzzle),
        pack: pack.logic,
      });
      const idMap = buildIdMap(spec, pack.logic);
      void pack.art.ready(spec.sprites).then(() => {
        if (!live) return;
        const t = now();
        const st = useApp.getState();
        const r = startPuzzle(st.doc, puzzle, todayKey(t), t, challenge);
        st.update(() => r.doc);
        activeRef.current = r.active;
        doneRef.current = false;
        missTimes.current = [];
        runSince.current = document.hidden ? null : t;
        setActive(r.active);
        setResult(null);
        setSheetOpen(false);
        setReady({ spec, idMap });
        track('puzzle_start', {
          mode: puzzle.mode,
          ...(puzzle.mode === 'daily' ? { puzzle_no: puzzleNumber(puzzle.date) } : { level: puzzle.level }),
          world: spec.worldId,
          difficulty: spec.difficulty,
          resumed: r.resumed,
        });
      });
    }, 30);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // challenge is read once at start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, key]);

  // 2. the world canvas
  useEffect(() => {
    if (!ready || !pack || !canvasRef.current) return;
    const c = new WorldController(canvasRef.current, ready.spec, pack, palette, { onTap: () => false });
    ctl.current = c;
    c.setFound(activeRef.current?.found ?? []);
    return () => {
      c.dispose();
      ctl.current = null;
    };
    // palette changes are applied below without rebuilding
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pack]);
  useEffect(() => {
    ctl.current?.setPalette(palette);
  }, [palette]);
  useEffect(() => {
    if (ctl.current) ctl.current.reducedMotion = reducedMotion;
  }, [reducedMotion, ready]);

  // 3. timer: tick the display, save every few seconds, pause while hidden
  useEffect(() => {
    if (!ready) return;
    const tick = setInterval(() => setShownMs(elapsed()), 1000);
    const save = setInterval(() => persist(), PLAY.saveEveryMs);
    const vis = () => {
      if (doneRef.current) return;
      if (document.hidden) {
        persist();
        runSince.current = null;
      } else runSince.current = now();
    };
    const hide = () => persist();
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', hide);
    return () => {
      clearInterval(tick);
      clearInterval(save);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('pagehide', hide);
      persist();
    };
  }, [ready, persist, elapsed]);

  const spec = ready?.spec ?? null;
  const targets = useMemo(() => spec?.targets.map((t) => t.uid) ?? [], [spec]);
  const residentUid = spec?.resident?.uid ?? -1;
  const residentId = spec && residentUid >= 0 ? spec.sprites[residentUid]!.spriteId : null;

  const finish = useCallback(() => {
    const a = activeRef.current;
    if (!a || !spec || doneRef.current) return;
    const timeMs = elapsed();
    doneRef.current = true;
    runSince.current = null;
    const t = now();
    const st = useApp.getState();
    const r = completePuzzle(
      st.doc,
      puzzle,
      { timeMs, misses: a.misses, hints: a.hints, resident: a.resident ? residentId : null },
      a,
      t,
    );
    st.update(() => r.doc);
    const info: ResultInfo = {
      puzzle,
      spec,
      stars: r.stars,
      timeMs,
      misses: a.misses,
      hints: a.hints,
      found: a.found.length,
      total: spec.targets.length,
      residentId: a.resident ? residentId : null,
      late: r.late,
      streak: displayedStreak(r.doc.streak, todayKey(t)),
      challenge: a.challenge ?? null,
    };
    setResult(info);
    setSheetOpen(true);
    playSound('finish', st.doc.settings.sound);
    buzz([30, 60, 30], st.doc.settings.haptics);
    track('puzzle_complete', {
      mode: puzzle.mode,
      ...(puzzle.mode === 'daily' ? { puzzle_no: puzzleNumber(puzzle.date) } : { level: puzzle.level }),
      world: spec.worldId,
      difficulty: spec.difficulty,
      time_s: Math.round(timeMs / 1000),
      misses: a.misses,
      hints: a.hints,
      stars: r.stars,
      resident_found: a.resident,
    });
  }, [elapsed, puzzle, residentId, spec]);

  const onFindTarget = useCallback(
    (uid: number) => {
      const a = activeRef.current;
      if (!a) return;
      const found = [...a.found, uid];
      persist({ found });
      ctl.current?.setFound(a.resident ? [...found, residentUid] : found);
      const sp = spec!.sprites[uid]!;
      const def = indexPack(pack!.logic).byId.get(sp.spriteId);
      showToast(S.foundToast(def?.name ?? sp.spriteId));
      playSound('found', settings.sound);
      buzz(18, settings.haptics);
      track('target_found', { index: found.length, elapsed_s: Math.round(elapsed() / 1000) });
      if (found.length >= targets.length) finish();
    },
    [
      elapsed,
      finish,
      pack,
      persist,
      residentUid,
      settings.haptics,
      settings.sound,
      showToast,
      spec,
      targets.length,
    ],
  );

  const onFindResident = useCallback(() => {
    const a = activeRef.current;
    if (!a || !residentId) return;
    persist({ resident: true });
    ctl.current?.setFound([...a.found, residentUid]);
    const st = useApp.getState();
    const t = now();
    const before = distinctResidents(st.doc);
    const r = recordResident(st.doc, residentId, todayKey(t));
    let doc = r.doc;
    const after = distinctResidents(doc);
    const newly = unlockedWorlds(after).filter((w) => !doc.worldsAnnounced.includes(w));
    if (after > before && newly.length) {
      doc = { ...doc, worldsAnnounced: [...doc.worldsAnnounced, ...newly] };
      for (const w of newly) {
        track('world_unlock', { world: w });
        const name = pack!.logic.worlds.find((x) => x.id === w)?.name ?? w;
        setTimeout(() => showToast(S.worldUnlocked(name)), 1200);
      }
    }
    st.update(() => doc);
    const rarity = indexPack(pack!.logic).byId.get(residentId)?.rarity ?? 'common';
    track('resident_found', { resident: residentId, rarity, new: r.isNew });
    playSound('resident', settings.sound);
    buzz([20, 40, 20], settings.haptics);
    setResidentCard({ id: residentId, isNew: r.isNew });
  }, [pack, persist, residentId, residentUid, settings.haptics, settings.sound, showToast]);

  const onMiss = useCallback(
    (x: number, y: number) => {
      const a = activeRef.current;
      if (!a) return;
      persist({ misses: a.misses + 1 });
      ctl.current?.addMiss(x, y);
      playSound('miss', settings.sound);
      buzz(8, settings.haptics);
      const t = now();
      missTimes.current = [...missTimes.current.filter((m) => t - m <= PLAY.lockoutWindowMs), t];
      if (!settings.relaxed && shouldLock(missTimes.current, t, PLAY.lockoutMisses, PLAY.lockoutWindowMs)) {
        missTimes.current = [];
        setLockedUntil(t + PLAY.lockoutMs);
        setTimeout(() => setLockedUntil(0), PLAY.lockoutMs);
      }
    },
    [persist, settings.haptics, settings.relaxed, settings.sound],
  );

  const onTap = useCallback(
    (x: number, y: number, r: number, double: boolean) => {
      const a = activeRef.current;
      if (!a || !ready || doneRef.current) return false;
      if (double) {
        // the second tap of a double-tap zooms; it cancels the first tap's miss
        if (pendingMiss.current) clearTimeout(pendingMiss.current);
        pendingMiss.current = null;
        pendingAt.current = null;
        return false;
      }
      if (lockedUntil && now() < lockedUntil) return false;
      const foundSet = new Set(a.found);
      const wanted = (uid: number) =>
        (targets.includes(uid) && !foundSet.has(uid)) || (uid === residentUid && !a.resident);
      const hit = findNear(ready.idMap, x, y, r, wanted);
      if (hit === residentUid && hit >= 0) onFindResident();
      else if (hit >= 0) onFindTarget(hit);
      else {
        // A miss waits briefly in case this is the first half of a double-tap. A new miss elsewhere
        // settles the waiting one at once rather than dropping it.
        if (pendingMiss.current && pendingAt.current) {
          clearTimeout(pendingMiss.current);
          onMiss(pendingAt.current.x, pendingAt.current.y);
        }
        pendingAt.current = { x, y };
        pendingMiss.current = setTimeout(() => {
          pendingMiss.current = null;
          pendingAt.current = null;
          onMiss(x, y);
        }, PLAY.doubleTapMs);
        return false;
      }
      return true;
    },
    [lockedUntil, onFindResident, onFindTarget, onMiss, ready, residentUid, targets],
  );
  useEffect(() => {
    ctl.current?.setTapHandler(onTap);
  }, [onTap, ready]);

  const freeLeft = active ? active.hints < PLAY.freeHints : false;
  const onHint = useCallback(async () => {
    const a = activeRef.current;
    if (!a || !spec || doneRef.current) return;
    let kind: 'free' | 'rewarded' = 'free';
    if (a.hints >= PLAY.freeHints) {
      const ads = getAds();
      if (!ads.isRewardedAvailable()) {
        go('premium?source=hints');
        return;
      }
      const r = await ads.showRewarded();
      if (!r.rewarded) return;
      kind = 'rewarded';
    }
    const left = spec.targets.map((t) => t.uid).filter((u) => !a.found.includes(u));
    if (!left.length) return;
    const uid = left[Math.floor(Math.random() * left.length)]!;
    const sp = spec.sprites[uid]!;
    const ring = hintRing(sp.x, sp.y, sp.size, spec.W, spec.H, Math.random(), Math.random());
    ctl.current?.showHint(ring.x, ring.y, ring.r);
    persist({ hints: a.hints + 1 });
    track('hint_used', { n: a.hints + 1, kind });
  }, [persist, spec]);

  // E2E hook (compiled only into the --mode e2e build)
  useEffect(() => {
    if (!__E2E__ || !ready) return;
    return installTestHook(() => ({
      ctl: ctl.current,
      spec: ready.spec,
      idMap: ready.idMap,
      active: activeRef.current,
      canvas: canvasRef.current,
    }));
  }, [ready]);

  const locked = lockedUntil > 0 && !settings.relaxed;
  const label = useMemo(() => {
    const worldName = pack?.logic.worlds.find((w) => w.id === worldFor(puzzle))?.name ?? '';
    if (puzzle.mode === 'daily') return `${S.puzzleNo(puzzleNumber(puzzle.date))} · ${worldName}`;
    return `${worldName} · ${S.levelN(puzzle.level)}`;
  }, [pack, puzzle]);
  const foundN = active?.found.length ?? 0;
  const total = targets.length;
  const challengeBanner = active?.challenge ? S.beat(formatTime(active.challenge.timeS * 1000)) : null;

  return (
    <div className="play" data-done={result ? 'true' : 'false'}>
      <header className="play-bar">
        <button
          type="button"
          className="icon-btn on-dark"
          onClick={() => go(puzzle.mode === 'daily' ? '' : `explore/${puzzle.world}`)}
          aria-label={S.back}
        >
          <Icon name="back" />
        </button>
        <div className="play-title">
          <p className="play-label">{label}</p>
          <p className="play-diff">{spec ? S.difficulty[spec.difficulty] : ''}</p>
        </div>
        <div className="play-score" aria-live="polite">
          {!settings.relaxed && (
            <span className="play-timer" aria-label={S.timeLabel} data-testid="timer">
              {formatTime(result ? result.timeMs : Math.max(shownMs, active?.elapsedMs ?? 0))}
            </span>
          )}
          <span className="play-count" data-testid="found-count" aria-label={S.foundLabel(foundN, total)}>
            <b>{foundN}</b>
            <small>/{total}</small>
          </span>
          {!settings.relaxed && (
            <span
              className="play-misses"
              data-testid="misses"
              aria-label={S.missesLabel(active?.misses ?? 0)}
            >
              <Icon name="cross" /> {active?.misses ?? 0}
            </span>
          )}
        </div>
      </header>

      <main className="stage">
        <canvas
          ref={canvasRef}
          className="world"
          tabIndex={0}
          aria-label={S.worldLabel}
          data-testid="world"
        />
        {!ready && (
          <p className="stage-status" role="status">
            {pack ? S.building : S.loading}
          </p>
        )}
        {challengeBanner && !result && (
          <p className="challenge-banner" data-testid="challenge-banner">
            <span>{S.challengeFrom}</span> <b>{challengeBanner}</b>
          </p>
        )}
        {locked && (
          <p className="lockout" role="alert" data-testid="lockout">
            {S.lockout}
          </p>
        )}
        <div className="zoom-ctrls">
          <button
            type="button"
            className="icon-btn"
            onClick={() => ctl.current?.zoomBy(PLAY.zoomStep)}
            aria-label={S.zoomIn}
          >
            <Icon name="plus" />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => ctl.current?.zoomBy(1 / PLAY.zoomStep)}
            aria-label={S.zoomOut}
          >
            <Icon name="minus" />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => ctl.current?.fitAll()}
            aria-label={S.zoomFit}
          >
            <Icon name="fit" />
          </button>
        </div>
        {ready && !result && (
          <div className="hint-wrap">
            <button
              type="button"
              className={freeLeft ? 'btn gold hint-btn' : 'btn quiet hint-btn'}
              onClick={() => void onHint()}
              data-testid="hint"
            >
              <Icon name="bulb" /> {freeLeft ? S.hint : S.hintUsed}
            </button>
            {!freeLeft && (
              <button type="button" className="link-btn hint-more" onClick={() => go('premium?source=hints')}>
                {S.hintMore}
              </button>
            )}
          </div>
        )}
        {result && !sheetOpen && (
          <button type="button" className="btn gold show-result" onClick={() => setSheetOpen(true)}>
            {S.resultTitle}
          </button>
        )}
        {!onboarded && ready && <Coach />}
      </main>

      {spec && active && <Tray spec={spec} found={active.found} residentFound={active.resident} />}

      {residentCard && (
        <ResidentCard
          residentId={residentCard.id}
          isNew={residentCard.isNew}
          onClose={() => setResidentCard(null)}
        />
      )}
      {result && sheetOpen && !residentCard && (
        <ResultSheet info={result} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}
