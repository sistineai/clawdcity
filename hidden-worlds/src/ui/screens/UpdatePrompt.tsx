// "A new version is ready" (SHELL-8), shown only when a new service worker is waiting.
import { S } from '../../strings';
import { usePwa } from '../pwa';

export function UpdatePrompt() {
  const need = usePwa((s) => s.needRefresh);
  const update = usePwa((s) => s.update);
  if (!need) return null;
  return (
    <div className="update-bar" role="status">
      <span>{S.updateReady}</span>
      <button type="button" className="btn gold" onClick={() => void update?.()}>
        {S.update}
      </button>
      <button type="button" className="btn ghost" onClick={() => usePwa.setState({ needRefresh: false })}>
        {S.notNow}
      </button>
    </div>
  );
}
