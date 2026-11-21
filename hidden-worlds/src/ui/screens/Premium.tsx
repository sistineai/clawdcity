// The Premium intent test (PREM-1..4). Honest: it says Premium does not exist yet and that
// nothing is charged, and it counts interest once per device.
import { useEffect, useState } from 'react';
import { getWaitlist, track } from '../../adapters';
import { now } from '../../game/clock';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Icon } from '../components/Glyph';
import { Screen } from '../components/Screen';

const SOURCES = ['home', 'hints', 'archive', 'explore', 'about', 'settings', 'result'];

export function Premium({ source: raw }: { source: string }) {
  const source = SOURCES.includes(raw) ? raw : 'other';
  const interest = useApp((s) => s.doc.premiumInterest);
  const update = useApp((s) => s.update);
  const waitlist = getWaitlist();
  const [email, setEmail] = useState('');
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    track('premium_view', { source });
  }, [source]);

  const submit = async () => {
    if (interest) return;
    const given = waitlist.enabled && /\S+@\S+\.\S+/.test(email.trim());
    // recorded once per device; the email never goes to analytics (ADPT-3)
    update((d) => ({ ...d, premiumInterest: { source, at: now() } }));
    track('premium_interest', { source, email_given: given });
    setThanks(true);
    if (given) await waitlist.submit(email.trim(), source);
  };

  return (
    <Screen title={S.premiumTitle} className="premium">
      <p className="lede">{S.premiumLede}</p>
      <ul className="benefits">
        {S.premiumBenefits.map((b) => (
          <li key={b}>
            <Icon name="check" size={18} /> {b}
          </li>
        ))}
      </ul>
      <p className="price num">{S.premiumPrice}</p>
      <p className="not-yet" data-testid="premium-not-yet">
        {S.premiumNotYet}
      </p>
      {thanks || interest ? (
        <div className="thanks" role="status" data-testid="premium-thanks">
          <p>
            <b>{thanks ? S.premiumThanks : S.premiumAlready}</b>
          </p>
          <p>{S.premiumNothingCharged}</p>
        </div>
      ) : (
        <form
          className="premium-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {waitlist.enabled && (
            <label className="field">
              <span>{S.premiumEmail}</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <button type="submit" className="btn gold big wide" data-testid="premium-cta">
            {S.premiumCta}
          </button>
        </form>
      )}
    </Screen>
  );
}
