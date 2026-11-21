// SHELL-8: an "Add to Home Screen" nudge, shown once, after the second completed puzzle.
import { useEffect, useState } from 'react';
import { INSTALL_NUDGE_AFTER } from '../../config';
import { track } from '../../adapters';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { isIos, isStandalone, usePwa } from '../pwa';

export function InstallNudge() {
  const completed = useApp((s) => s.doc.stats.completed);
  const shown = useApp((s) => s.doc.installNudgeShown);
  const update = useApp((s) => s.update);
  const installEvent = usePwa((s) => s.installEvent);
  // decide once on mount, so marking it shown does not hide it while it is on screen
  const [visible, setVisible] = useState(() => completed >= INSTALL_NUDGE_AFTER && !shown && !isStandalone());
  useEffect(() => {
    if (visible) update((d) => (d.installNudgeShown ? d : { ...d, installNudgeShown: true }));
  }, [visible, update]);
  if (!visible) return null;
  const ios = isIos();
  const install = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      track('install_prompt', { outcome: choice.outcome });
    } catch {
      track('install_prompt', { outcome: 'error' });
    }
    usePwa.setState({ installEvent: null });
    setVisible(false);
  };
  return (
    <aside className="nudge" aria-labelledby="nudge-title" data-testid="install-nudge">
      <h2 id="nudge-title" className="title">
        {S.installTitle}
      </h2>
      <p>{ios && !installEvent ? S.installIos : S.installBody}</p>
      <div className="row wrap">
        {installEvent && (
          <button type="button" className="btn solid" onClick={() => void install()}>
            {S.install}
          </button>
        )}
        <button
          type="button"
          className="btn line"
          onClick={() => {
            track('install_prompt', { outcome: 'not_now' });
            setVisible(false);
          }}
        >
          {S.notNow}
        </button>
      </div>
    </aside>
  );
}
