// ADPT-4..6 and PREM-5: ads, purchases, sync and waitlist. Every default is a no-op.
import type { SaveDoc } from '../state/schema';

export interface Ads {
  isRewardedAvailable(): boolean;
  showRewarded(): Promise<{ rewarded: boolean }>;
}
export const noAds = (): Ads => ({
  isRewardedAvailable: () => false,
  showRewarded: () => Promise.resolve({ rewarded: false }),
});

export interface Offering {
  id: string;
  price: string;
}
export interface Entitlements {
  premium: boolean;
}
export interface Purchases {
  isAvailable(): boolean;
  getOfferings(): Promise<Offering[]>;
  purchase(offeringId: string): Promise<{ ok: boolean }>;
  restore(): Promise<Entitlements>;
  entitlements(): Entitlements;
}
export const noPurchases = (): Purchases => ({
  isAvailable: () => false,
  getOfferings: () => Promise.resolve([]),
  purchase: () => Promise.resolve({ ok: false }),
  restore: () => Promise.resolve({ premium: false }),
  entitlements: () => ({ premium: false }),
});

export interface Sync {
  pull(): Promise<SaveDoc | null>;
  push(doc: SaveDoc): Promise<void>;
}
export const noSync = (): Sync => ({ pull: () => Promise.resolve(null), push: () => Promise.resolve() });

export interface Waitlist {
  enabled: boolean;
  submit(email: string, source: string): Promise<{ ok: boolean }>;
}
export const noWaitlist = (): Waitlist => ({ enabled: false, submit: () => Promise.resolve({ ok: false }) });

/** POSTs { email, source } as JSON to VITE_WAITLIST_URL. */
export const httpWaitlist = (url: string): Waitlist => ({
  enabled: true,
  async submit(email, source) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      return { ok: r.ok };
    } catch {
      return { ok: false };
    }
  },
});
