// A tiny hash router: #/path/segments?query. No dependency needed (SHELL-1).
import { useSyncExternalStore } from 'react';

export interface Route {
  parts: string[];
  query: URLSearchParams;
  raw: string;
}

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const [path = '', q = ''] = h.split('?');
  return {
    parts: path.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(q),
    raw: h,
  };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const snapshot = () => location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, snapshot, () => '');
  return parseHash(hash);
}

export function go(path: string, opts: { replace?: boolean } = {}): void {
  const h = '#/' + path.replace(/^\/+/, '');
  if (opts.replace) {
    history.replaceState(history.state, '', h);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else location.hash = h;
}
