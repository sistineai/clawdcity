// SHELL-7: what the game is, how the art is made (owner to rewrite), privacy, versions.
import { APP_VERSION, ENGINE_VERSION } from '../../config';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Screen } from '../components/Screen';
import { go } from '../router';

export function About() {
  const pack = useApp((s) => s.pack);
  return (
    <Screen title={S.aboutTitle}>
      <p className="lede">{S.aboutWhat}</p>
      <section className="prose" aria-labelledby="art-h">
        <h2 id="art-h" className="eyebrow">
          Art
        </h2>
        <p data-testid="about-art">{S.aboutArt}</p>
        {pack && <p className="note">{pack.credits}</p>}
      </section>
      <section className="prose" aria-labelledby="priv-h">
        <h2 id="priv-h" className="eyebrow">
          {S.privacyTitle}
        </h2>
        <p data-testid="about-privacy">{S.privacy}</p>
      </section>
      <button type="button" className="link-btn left" onClick={() => go('premium?source=about')}>
        {S.premium}
      </button>
      <p className="note num-plain" data-testid="about-version">
        {S.version(APP_VERSION, ENGINE_VERSION, pack ? `${pack.id} v${pack.logic.version}` : '…')}
      </p>
    </Screen>
  );
}
