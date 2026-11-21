// Home: today's puzzle one tap away (DAILY-5), its result and the countdown once solved (DAILY-8).
import { difficultyConfig } from '../../engine/logic';
import { now } from '../../game/clock';
import {
  dailyDifficulty,
  dailyWorld,
  formatCountdown,
  formatTime,
  msUntilTomorrow,
  puzzleNumber,
  todayKey,
} from '../../game/dates';
import { displayedStreak } from '../../game/streak';
import { useApp } from '../../state/store';
import { S } from '../../strings';
import { Icon } from '../components/Glyph';
import { WorldThumb } from '../components/WorldThumb';
import { useNow } from '../hooks';
import { Stars } from '../play/ResultSheet';
import { go } from '../router';
import { InstallNudge } from './InstallNudge';

const NAV = [
  { to: 'archive', label: S.archive, icon: 'calendar' },
  { to: 'explore', label: S.explore, icon: 'compass' },
  { to: 'collection', label: S.collection, icon: 'leaf' },
  { to: 'stats', label: S.stats, icon: 'chart' },
] as const;

export function Home() {
  const t = useNow(1000);
  const doc = useApp((s) => s.doc);
  const pack = useApp((s) => s.pack);
  const today = todayKey(t);
  const n = puzzleNumber(today);
  const world = dailyWorld(today);
  const d = dailyDifficulty(today);
  const worldName = pack?.logic.worlds.find((w) => w.id === world)?.name ?? world;
  const result = doc.daily[today];
  const inProgress = doc.active[`daily:${today}`];
  const streak = displayedStreak(doc.streak, today);
  const dateLine = new Date(now()).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="home">
      <header className="home-head">
        <p className="eyebrow on-dark">{dateLine}</p>
        <h1 className="title home-title">{S.appName}</h1>
        <p className="home-tag">{S.homeTagline}</p>
        <div className="streak-pill" data-testid="home-streak" aria-label={`${S.streak} ${streak}`}>
          <Icon name="flame" size={18} />
          <b className="num">{streak}</b>
          <span>{S.streak.toLowerCase()}</span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span>
            {S.bestStreak.toLowerCase()} {doc.streak.best}
          </span>
        </div>
      </header>

      <main className="home-body">
        <section className="plate" aria-labelledby="today-title">
          <div className="plate-art">
            <WorldThumb world={world} seed={`daily-${today}`} />
            <span className="plate-no num">{S.puzzleNo(n)}</span>
          </div>
          <div className="plate-text">
            <p className="eyebrow">{S.todaysPuzzle}</p>
            <h2 id="today-title" className="title plate-title">
              {worldName}
            </h2>
            <p className="plate-meta">
              {S.difficulty[d]} · {S.findN(difficultyConfig(d).targets)}
            </p>
            {result && !result.late ? (
              <div className="today-done" data-testid="today-done">
                <div className="row">
                  <Stars n={result.stars} size={24} />
                  <span className="num done-time">{formatTime(result.timeMs)}</span>
                </div>
                <p className="countdown">
                  {S.nextIn}{' '}
                  <b className="num" data-testid="countdown">
                    {formatCountdown(msUntilTomorrow(t))}
                  </b>
                </p>
                <button type="button" className="btn line" onClick={() => go(`play/daily/${today}`)}>
                  {S.keepLooking}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn gold big wide"
                onClick={() => go(`play/daily/${today}`)}
                data-testid="play-today"
              >
                {inProgress ? S.resume : S.play}
              </button>
            )}
          </div>
        </section>

        <nav className="home-nav" aria-label="Sections">
          {NAV.map((x) => (
            <button
              key={x.to}
              type="button"
              className="tile"
              onClick={() => go(x.to)}
              data-testid={`nav-${x.to}`}
            >
              <Icon name={x.icon} size={26} />
              <span>{x.label}</span>
            </button>
          ))}
        </nav>
        <InstallNudge />
        <footer className="home-foot">
          <button type="button" className="link-btn" onClick={() => go('premium?source=home')}>
            {S.premium}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => go('settings')}
            data-testid="nav-settings"
          >
            {S.settings}
          </button>
          <button type="button" className="link-btn" onClick={() => go('about')}>
            {S.about}
          </button>
        </footer>
      </main>
    </div>
  );
}
