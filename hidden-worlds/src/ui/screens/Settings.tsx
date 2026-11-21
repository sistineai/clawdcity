// SHELL-3 and META-7: sound, haptics, relaxed mode, colour-blind mode, reduced motion, and a
// reset behind an in-app confirmation (never confirm()).
import { useState, type ReactNode } from 'react';
import { useApp } from '../../state/store';
import type { Settings as SettingsT } from '../../state/schema';
import { S } from '../../strings';
import { Dialog } from '../components/Dialog';
import { Screen } from '../components/Screen';

function Toggle({
  id,
  label,
  help,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting">
      <div className="setting-text">
        <label htmlFor={id}>{label}</label>
        {help && (
          <p className="note" id={`${id}-help`}>
            {help}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={help ? `${id}-help` : undefined}
        className={`switch${checked ? ' on' : ''}`}
        onClick={() => onChange(!checked)}
        data-testid={`setting-${id}`}
      >
        <span className="knob" aria-hidden="true" />
      </button>
    </div>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className="settings-group">{children}</div>;
}

export function Settings() {
  const s = useApp((st) => st.doc.settings);
  const set = useApp((st) => st.setSetting);
  const reset = useApp((st) => st.reset);
  const showToast = useApp((st) => st.showToast);
  const [confirming, setConfirming] = useState(false);
  const bool = (k: keyof SettingsT) => (v: boolean) => set(k, v as never);
  return (
    <Screen title={S.settingsTitle}>
      <Group>
        <Toggle id="sound" label={S.sound} checked={s.sound} onChange={bool('sound')} />
        <Toggle id="haptics" label={S.haptics} checked={s.haptics} onChange={bool('haptics')} />
      </Group>
      <Group>
        <Toggle
          id="relaxed"
          label={S.relaxed}
          help={S.relaxedHelp}
          checked={s.relaxed}
          onChange={bool('relaxed')}
        />
        <Toggle
          id="colorblind"
          label={S.colorBlind}
          help={S.colorBlindHelp}
          checked={s.colorBlind}
          onChange={bool('colorBlind')}
        />
        <fieldset className="setting motion">
          <legend>{S.reducedMotion}</legend>
          <div className="segmented" role="radiogroup" aria-label={S.reducedMotion}>
            {(
              [
                ['system', S.motionSystem],
                ['on', S.motionOn],
                ['off', S.motionOff],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={s.reducedMotion === v}
                className={s.reducedMotion === v ? 'on' : ''}
                onClick={() => set('reducedMotion', v)}
                data-testid={`motion-${v}`}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
      </Group>
      <button
        type="button"
        className="btn line danger"
        onClick={() => setConfirming(true)}
        data-testid="reset"
      >
        {S.reset}
      </button>
      {confirming && (
        <Dialog labelId="reset-title" onClose={() => setConfirming(false)} tone="flare">
          <h2 id="reset-title" className="title sheet-title">
            {S.reset}
          </h2>
          <p>{S.resetConfirm}</p>
          <div className="row wrap">
            <button
              type="button"
              className="btn solid danger-solid"
              data-testid="reset-yes"
              onClick={() => {
                reset();
                setConfirming(false);
                showToast(S.resetDone);
              }}
            >
              {S.resetYes}
            </button>
            <button type="button" className="btn line" onClick={() => setConfirming(false)}>
              {S.resetNo}
            </button>
          </div>
        </Dialog>
      )}
    </Screen>
  );
}
