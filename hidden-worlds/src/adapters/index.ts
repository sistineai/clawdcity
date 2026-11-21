// Adapter factories: pick implementations from environment variables (ADPT-1..7).
import { APP_VERSION, ENGINE_VERSION } from '../config';
import {
  consoleAnalytics,
  memoryAnalytics,
  noopAnalytics,
  posthogAnalytics,
  type Analytics,
  type MemoryAnalytics,
  type Props,
} from './analytics';
import {
  httpWaitlist,
  noAds,
  noPurchases,
  noSync,
  noWaitlist,
  type Ads,
  type Purchases,
  type Sync,
  type Waitlist,
} from './others';

export type { Analytics, Props, Ads, Purchases, Sync, Waitlist, MemoryAnalytics };

const env = import.meta.env as Record<string, string | boolean | undefined>;
const str = (k: string): string => {
  const v = env[k];
  return typeof v === 'string' ? v.trim() : '';
};

let analytics: Analytics | null = null;
export function getAnalytics(): Analytics {
  if (!analytics) {
    const key = str('VITE_POSTHOG_KEY');
    if (__E2E__) analytics = memoryAnalytics();
    else if (key) analytics = posthogAnalytics(key, str('VITE_POSTHOG_HOST') || 'https://us.i.posthog.com');
    else if (env.DEV === true && env.MODE !== 'test') analytics = consoleAnalytics();
    else analytics = noopAnalytics();
  }
  return analytics;
}
/** Tests swap in an implementation. */
export function setAnalytics(a: Analytics): void {
  analytics = a;
}

let ads: Ads = noAds();
let purchases: Purchases = noPurchases();
let sync: Sync = noSync();
let waitlist: Waitlist | null = null;
export const getAds = () => ads;
export const getPurchases = () => purchases;
export const getSync = () => sync;
export function getWaitlist(): Waitlist {
  if (!waitlist) {
    const url = str('VITE_WAITLIST_URL');
    waitlist = url ? httpWaitlist(url) : noWaitlist();
  }
  return waitlist;
}
export function setAdapters(a: { ads?: Ads; purchases?: Purchases; sync?: Sync; waitlist?: Waitlist }): void {
  if (a.ads) ads = a.ads;
  if (a.purchases) purchases = a.purchases;
  if (a.sync) sync = a.sync;
  if (a.waitlist) waitlist = a.waitlist;
}

// Properties every event carries (ADPT-3). No personal data.
const common: { device_id: string; pack_id: string } = { device_id: 'unknown', pack_id: 'vector' };
export function setCommon(c: Partial<typeof common>): void {
  Object.assign(common, c);
  if (c.device_id) getAnalytics().identify(c.device_id);
}
export function track(event: string, props: Props = {}): void {
  try {
    getAnalytics().track(event, {
      ...props,
      device_id: common.device_id,
      app_version: APP_VERSION,
      engine_version: ENGINE_VERSION,
      pack_id: common.pack_id,
    });
  } catch {
    // never let analytics break the game
  }
}
