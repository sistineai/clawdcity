import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryAnalytics, posthogAnalytics } from '../../src/adapters/analytics';
import { noAds, noPurchases, noSync, noWaitlist } from '../../src/adapters/others';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('adapters (ADPT-1..7, PREM-5)', () => {
  it('defaults are no-ops and report unavailable', async () => {
    expect(noAds().isRewardedAvailable()).toBe(false);
    expect(await noAds().showRewarded()).toEqual({ rewarded: false });
    const p = noPurchases();
    expect(p.isAvailable()).toBe(false);
    expect(await p.getOfferings()).toEqual([]);
    expect(await p.purchase('x')).toEqual({ ok: false });
    expect(await p.restore()).toEqual({ premium: false });
    expect(p.entitlements()).toEqual({ premium: false });
    expect(await noSync().pull()).toBeNull();
    expect(noWaitlist().enabled).toBe(false);
  });

  it('with no env vars the factory picks no-op analytics and a disabled waitlist', async () => {
    const m = await import('../../src/adapters');
    expect(m.getAnalytics().name).toBe('noop');
    expect(m.getWaitlist().enabled).toBe(false);
  });

  it('every event carries device_id, app_version, engine_version and pack_id (ADPT-3)', async () => {
    const m = await import('../../src/adapters');
    const mem = memoryAnalytics();
    m.setAnalytics(mem);
    m.setCommon({ device_id: 'dev-1', pack_id: 'vector' });
    m.track('puzzle_start', { mode: 'daily' });
    expect(mem.events[0]).toEqual({
      event: 'puzzle_start',
      props: {
        mode: 'daily',
        device_id: 'dev-1',
        app_version: '1.0.0',
        engine_version: 1,
        pack_id: 'vector',
      },
    });
  });

  it('PostHog is chosen only when its key is set, and the waitlist only with its URL', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('VITE_WAITLIST_URL', 'https://waitlist.example/submit');
    vi.stubGlobal('window', { addEventListener: () => {} });
    const m = await import('../../src/adapters');
    expect(m.getAnalytics().name).toBe('posthog');
    expect(m.getWaitlist().enabled).toBe(true);
  });

  it('PostHog sends nothing before the first interaction, then batches anonymously', async () => {
    const listeners: Record<string, () => void> = {};
    vi.stubGlobal('window', { addEventListener: (k: string, f: () => void) => (listeners[k] = f) });
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', {});
    const a = posthogAnalytics('phc_test', 'https://us.i.posthog.com');
    a.identify('dev-1');
    a.track('app_open', { first: true });
    await a.flush();
    expect(fetchMock).not.toHaveBeenCalled();
    listeners.pointerdown!();
    await a.flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe('https://us.i.posthog.com/batch/');
    const body = JSON.parse(init.body);
    expect(body.api_key).toBe('phc_test');
    expect(body.batch[0]).toMatchObject({
      event: 'app_open',
      distinct_id: 'dev-1',
      properties: { first: true, $process_person_profile: false },
    });
  });
});
