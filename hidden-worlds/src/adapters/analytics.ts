// ADPT-1: analytics. Nothing outside src/adapters knows which implementation is active.
export type Props = Record<string, string | number | boolean | null>;

export interface Analytics {
  name: 'noop' | 'console' | 'memory' | 'posthog';
  track(event: string, props: Props): void;
  identify(deviceId: string): void;
  flush(): Promise<void>;
}

export const noopAnalytics = (): Analytics => ({
  name: 'noop',
  track() {},
  identify() {},
  flush: () => Promise.resolve(),
});

export const consoleAnalytics = (): Analytics => ({
  name: 'console',
  track: (e, p) => console.info('[analytics]', e, p),
  identify: (id) => console.info('[analytics] identify', id),
  flush: () => Promise.resolve(),
});

export interface MemoryAnalytics extends Analytics {
  events: { event: string; props: Props }[];
}
export const memoryAnalytics = (): MemoryAnalytics => {
  const events: { event: string; props: Props }[] = [];
  return {
    name: 'memory',
    events,
    track: (event, props) => events.push({ event, props }),
    identify() {},
    flush: () => Promise.resolve(),
  };
};

/**
 * PostHog, loaded lazily (ADPT-1): nothing is fetched, imported or sent until the player's first
 * interaction. Until then events wait in memory; afterwards the client in ./posthog sends them.
 */
export function lazyPosthog(key: string, host: string): Analytics {
  let real: Analytics | null = null;
  let id: string | null = null;
  const buffer: { event: string; props: Props }[] = [];
  const load = () => {
    import('./posthog')
      .then((m) => {
        real = m.posthogAnalytics(key, host, true);
        if (id) real.identify(id);
        for (const e of buffer.splice(0)) real.track(e.event, e.props);
      })
      .catch(() => {});
  };
  if (typeof window !== 'undefined') {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      load();
    };
    window.addEventListener('pointerdown', start, { once: true, passive: true });
    window.addEventListener('keydown', start, { once: true, passive: true });
  }
  return {
    name: 'posthog',
    track(event, props) {
      if (real) real.track(event, props);
      else buffer.push({ event, props });
    },
    identify(deviceId) {
      id = deviceId;
      real?.identify(deviceId);
    },
    flush: () => real?.flush() ?? Promise.resolve(),
  };
}
