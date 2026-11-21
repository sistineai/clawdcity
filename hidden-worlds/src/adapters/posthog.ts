// The PostHog client itself, imported only after the first interaction (see lazyPosthog).
import type { Analytics, Props } from './analytics';

/**
 * PostHog over its public HTTP capture API (batch endpoint), sent only when VITE_POSTHOG_KEY is
 * set. Anonymous by construction: no autocapture, no session recording, no cookies, and the only
 * identifier is the random device id. Nothing is sent before the player's first interaction.
 */
export function posthogAnalytics(key: string, host: string, startNow = false): Analytics {
  const queue: { event: string; properties: Props; timestamp: string }[] = [];
  let distinctId = 'anonymous';
  let started = startNow;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const start = () => {
    started = true;
    schedule();
  };
  if (typeof window !== 'undefined') {
    for (const ev of ['pointerdown', 'keydown'] as const)
      window.addEventListener(ev, start, { once: true, passive: true });
    window.addEventListener('pagehide', () => void send(true));
  }
  const schedule = () => {
    if (!started || timer || !queue.length) return;
    timer = setTimeout(() => {
      timer = null;
      void send(false);
    }, 3000);
  };
  const send = async (beacon: boolean) => {
    if (!started || !queue.length) return;
    const batch = queue.splice(0, queue.length).map((e) => ({
      ...e,
      distinct_id: distinctId,
      properties: { ...e.properties, $process_person_profile: false },
    }));
    const body = JSON.stringify({ api_key: key, batch });
    const url = host.replace(/\/$/, '') + '/batch/';
    try {
      if (beacon && navigator.sendBeacon)
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      else
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        });
    } catch {
      // analytics must never affect play
    }
  };
  return {
    name: 'posthog',
    track(event, properties) {
      queue.push({ event, properties, timestamp: new Date().toISOString() });
      schedule();
    },
    identify(id) {
      distinctId = id;
    },
    flush: () => send(false),
  };
}
