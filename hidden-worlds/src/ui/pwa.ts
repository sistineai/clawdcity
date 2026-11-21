// Service worker registration, update prompt and install prompt (SHELL-8). Nothing essential
// depends on the service worker (SHELL-9): every failure here is swallowed.
import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  needRefresh: boolean;
  installEvent: BeforeInstallPromptEvent | null;
  update: (() => Promise<void>) | null;
}
export const usePwa = create<PwaState>()(() => ({ needRefresh: false, installEvent: null, update: null }));

export function startPwa(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePwa.setState({ installEvent: e as BeforeInstallPromptEvent });
  });
  if (!('serviceWorker' in navigator)) return;
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
        onRegisterError: () => {},
      });
      usePwa.setState({ update: () => updateSW(true) });
    })
    .catch(() => {});
}

export const isStandalone = () =>
  (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches) ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
