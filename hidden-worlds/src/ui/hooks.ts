import { useEffect, useState, useSyncExternalStore } from 'react';
import { COLORS, COLORS_CB } from '../engine/render/palette';
import { useApp } from '../state/store';
import { now } from '../game/clock';

export function usePalette() {
  const cb = useApp((s) => s.doc.settings.colorBlind);
  return cb ? COLORS_CB : COLORS;
}

const mq =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
const subscribeMq = (cb: () => void) => {
  mq?.addEventListener?.('change', cb);
  return () => mq?.removeEventListener?.('change', cb);
};
export function useReducedMotion(): boolean {
  const pref = useApp((s) => s.doc.settings.reducedMotion);
  const sys = useSyncExternalStore(
    subscribeMq,
    () => !!mq?.matches,
    () => false,
  );
  return pref === 'on' || (pref === 'system' && sys);
}

/** Re-render every `ms` with the current time (countdowns, clocks). */
export function useNow(ms: number): number {
  const [t, setT] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setT(now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}
