// SHELL-2: three coach marks over the first puzzle. Skippable; never shown again.
import { useState } from 'react';
import { useApp } from '../../state/store';
import { S } from '../../strings';

export function Coach() {
  const [step, setStep] = useState(0);
  const update = useApp((s) => s.update);
  const done = () => update((d) => ({ ...d, onboarded: true }));
  const item = S.onboarding[step]!;
  const last = step === S.onboarding.length - 1;
  return (
    <div
      className={`coach coach-${step}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="coach-title"
      data-testid="coach"
    >
      <p className="eyebrow">
        {step + 1} / {S.onboarding.length}
      </p>
      <h2 id="coach-title" className="title">
        {item.title}
      </h2>
      <p>{item.body}</p>
      <div className="row">
        <button type="button" className="btn quiet" onClick={done} data-testid="coach-skip">
          {S.skip}
        </button>
        <button
          type="button"
          className="btn solid"
          onClick={() => (last ? done() : setStep(step + 1))}
          data-testid="coach-next"
        >
          {last ? S.gotIt : S.next}
        </button>
      </div>
    </div>
  );
}
