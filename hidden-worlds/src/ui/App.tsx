import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { track } from '../adapters';
import { loadPack } from '../engine/pack/load';
import { now } from '../game/clock';
import { isDateKey, todayKey } from '../game/dates';
import { isLevel, isWorld } from '../game/puzzles';
import { useApp, getDoc } from '../state/store';
import { S } from '../strings';
import { Home } from './screens/Home';
import { PlayScreen } from './play/PlayScreen';
import { installBaseHook } from './play/testHook';
import { go, useRoute } from './router';

const Dev = lazy(() => import('./screens/Dev').then((m) => ({ default: m.Dev })));

if (__E2E__) installBaseHook(getDoc);

/** SHELL-10: a top-level error boundary with a Reload button. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  override state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  override componentDidCatch(error: Error, _info: ErrorInfo) {
    track('error', { message: String(error?.message ?? error).slice(0, 200) });
  }
  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen center" role="alert">
        <h1 className="title">{S.errorTitle}</h1>
        <p>{S.errorBody}</p>
        <button type="button" className="btn solid" onClick={() => location.reload()}>
          {S.reload}
        </button>
      </main>
    );
  }
}

function Toast() {
  const toast = useApp((s) => s.toast);
  return (
    <div className={toast ? 'toast on' : 'toast'} role="status" aria-live="polite" data-testid="toast">
      {toast?.text ?? ''}
    </div>
  );
}

function Routes() {
  const route = useRoute();
  const [a, b, c, d] = route.parts;
  if (a === 'dev')
    return (
      <Suspense fallback={<p className="screen">{S.loading}</p>}>
        <Dev />
      </Suspense>
    );
  if (a === 'play' && b === 'daily' && c && isDateKey(c))
    return <PlayScreen key={`d${c}`} puzzle={{ mode: 'daily', date: c }} />;
  if (a === 'play' && b === 'explore' && c && isWorld(c) && isLevel(Number(d)))
    return <PlayScreen key={`e${c}${d}`} puzzle={{ mode: 'explore', world: c, level: Number(d) }} />;
  return <Home />;
}

export function App() {
  const setPack = useApp((s) => s.setPack);
  useEffect(() => {
    loadPack().then(
      (p) => setPack(p),
      (e: unknown) => {
        setPack(null, String(e));
        track('error', { message: 'pack: ' + String(e).slice(0, 180) });
      },
    );
    const st = useApp.getState();
    const days = Math.floor((now() - st.doc.firstOpen) / 86400000);
    track('app_open', {
      first: st.first,
      days_since_first: days,
      standalone: typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches,
      version: '1',
    });
    // DAILY-5: first-time visitors go straight into today's puzzle
    if (st.first && !location.hash.replace(/^#\/?/, ''))
      go(`play/daily/${todayKey(now())}`, { replace: true });
  }, [setPack]);
  return (
    <ErrorBoundary>
      <Routes />
      <Toast />
    </ErrorBoundary>
  );
}
